import React, { FC, useEffect, useState, useCallback } from "react"
import * as ParseAPI from "../services/parse/ParseAPI"
import { useStores } from "../models"
import moment from 'moment';
import { observer } from "mobx-react-lite"
import { ViewStyle, TextStyle, Alert, View, FlatList, ActivityIndicator, TextInput, Platform } from "react-native"
import { NativeStackScreenProps } from "@react-navigation/native-stack"
import { AppStackScreenProps } from "app/navigators"
import { Screen, Text, ListItem } from "app/components"
import { colors, spacing } from "../theme"
import { useNavigation, useFocusEffect } from "@react-navigation/native"
import { AntDesign } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { publishMessage } from "../services/PubNubService";

interface AccesosScreenProps extends NativeStackScreenProps<AppStackScreenProps<"Accesos">> {}

interface PresenciaItem {
  id?: string
  estudianteNombre: string
  presencia: string
  timestamp: string
  objId: string
  estudianteObj: any
  grupoName: string
}

type NavigationProp = NativeStackScreenProps<AppStackScreenProps<"Accesos">>["navigation"]

export const AccesosScreen: FC<AccesosScreenProps> = observer(function AccesosScreen() {
  const [listData, setListData] = useState<PresenciaItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [presenciaCount, setPresenciaCount] = useState(0)
  const [searchText, setSearchText] = useState('')
  const [filteredData, setFilteredData] = useState<PresenciaItem[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [shouldReload, setShouldReload] = useState(false)

  const navigation = useNavigation<NavigationProp>()
  const {
    authenticationStore: {
      authUserEscuela,
      authUsertype
    },
  } = useStores()

  useEffect(() => {
    setupComponents()
    fetchPresenciaFromServer()
  }, [])

  useEffect(() => {
    if (shouldReload) {
      fetchPresenciaFromServer()
      setShouldReload(false)
    }
  }, [shouldReload])

  useEffect(() => {
    filterData(searchText);
  }, [listData, searchText])

  const reloadTable = useCallback(() => {
    setListData([])
    setShouldReload(true)
  }, [])

  useFocusEffect(
    useCallback(() => {
      reloadTable()
    }, [reloadTable])
  )

  const navToScanner = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
    navigation.navigate("Escaner" as any, {
      onScanComplete: () => reloadTable()
    })
  }, [navigation, reloadTable])

  const navToMonitor = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
    navigation.navigate("Monitor de Accesos" as any)
  }, [navigation])

  function setupComponents() {
    navigation.setOptions({
      headerBackTitleVisible: false,
      headerStyle: {
        backgroundColor: colors.palette.grassDark
      },
      headerRight: () => (
        <>
          <AntDesign name="qrcode" size={23} style={$headerIconQR} color={colors.palette.actionColor} onPress={navToScanner} />
          <AntDesign name="eye" size={23} style={$headerIconEye} color={colors.palette.actionColor} onPress={navToMonitor} />
        </>
      ),
    })
  }

  const filterData = useCallback((search: string) => {
    const filtered = listData.filter(item => {
      const itemName: string = item.estudianteNombre
      const nombreLowCase = itemName.toLowerCase()
      const searchLower = search.toLowerCase()
      return nombreLowCase.includes(searchLower)
    })
    setFilteredData(filtered)
  }, [listData])

  async function fetchPresenciaFromServer() {
    if (listData.length === 0) {
      const presenciaRes = await ParseAPI.fetchPresencia(authUserEscuela)
      if (presenciaRes != null) {
        checkPresenciaAndEstudiantes(presenciaRes)
      }
    }
  }

  async function checkPresenciaAndEstudiantes(presenciaArr: any) {
    const estudiantesCount = await ParseAPI.countEstudiantes(authUserEscuela)
    if (presenciaArr.length < estudiantesCount) {
      fixPresencia(presenciaArr)
    } else {
      if (authUsertype === 1) {
        filterEstudiantesForDocenteUser(presenciaArr)
      } else {
        processDataForTable(presenciaArr)
      }
    }
  }

  async function fixPresencia(presenciaArr: any) {
    const estudiantes = await ParseAPI.fetchEstudiantes(authUserEscuela)
    for (let i = 0; i < estudiantes.length; i++) {
      const estudiante = estudiantes[i]
      const presencia = presenciaArr.find((p: any) => p.get('estudiante').id === estudiante.id)
      if (presencia == null) {
        console.log("Missing presencia for: ", estudiante.id)
        ParseAPI.createPresencia(estudiante.id)
      }
    }
    setTimeout(() => {
      fetchPresenciaFromServer()
    }, 1500)
  }

  async function filterEstudiantesForDocenteUser(dataArr: any) {
    const escuelaObj = await ParseAPI.fetchUserEscuela(authUserEscuela)
    const userGrupos = await ParseAPI.fetchGrupos(escuelaObj)
    const estudiantesRes = await ParseAPI.fetchEstudiantesByGrupos(userGrupos)
    const filteredDataArr = dataArr.filter((presenciaObj: any) => {
      return estudiantesRes.some((estudiante: any) => estudiante.id === presenciaObj.get('estudiante').id)
    })
    processDataForTable(filteredDataArr)
  }


  function processDataForTable(dataArr: any) {
    setTotalCount(dataArr.length)
    if (dataArr.length > 0) {
      const tableArr: PresenciaItem[] = []
      let count = 0

      for (let i = 0; i < dataArr.length; i++) {
        const presenciaObj = dataArr[i]
        const estudianteObj = presenciaObj.get('estudiante')
        const estudianteNombre = estudianteObj.get("NOMBRE") + " " + estudianteObj.get("APELLIDO")
        const presente = presenciaObj.get('presente')
        let presenteLabel = "Fuera"
        if (presente === true) {
          count += 1
          presenteLabel = "Presente"
        }
        const updatedAt = presenciaObj.updatedAt
        const updatedAtLabel = moment(updatedAt).format('dd DD/MMM | HH:mm')
        const dataItem: PresenciaItem = {
          estudianteNombre: estudianteNombre,
          presencia: presenteLabel,
          timestamp: updatedAtLabel,
          objId: presenciaObj.id,
          estudianteObj: estudianteObj,
          grupoName: estudianteObj.get("grupo").get("name")
        }
        tableArr.push(dataItem)
      }

      setIsLoading(false)
      setPresenciaCount(count)
      setListData(tableArr)
    }
  }

  const reporteAccesos = useCallback((item: PresenciaItem) => {
    navigation.navigate("ReporteAccesos" as any, {
      estudianteObj: item.estudianteObj
    })
  }, [navigation])

  const togglePresenciaInServer = useCallback(async (objId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
    const res = await ParseAPI.updatePresencia(objId)
    if (res != null) {
      reloadTable()
      Alert.alert('La presencia ha sido actualizada', "", [
        {text: 'Ok', onPress: () => {
          setSearchText('')
          reloadTable()
        }},
      ])
    }
  }, [reloadTable])

  const cambiarPresencia = useCallback((item: PresenciaItem) => {
    togglePresenciaInServer(item.objId)
  }, [togglePresenciaInServer])

  function runCloudCodeFunction(accesoId: string) {
    const cloudFuncName = "accesos"
    const params = { accesoObjectId: accesoId, escuelaObjId: authUserEscuela }
    ParseAPI.runCloudCodeFunction(cloudFuncName, params)
  }

  const storeAcceso = useCallback(async (estudianteObj: any) => {
    const userObj = await ParseAPI.getCurrentUserObj()
    const accesoRes = await ParseAPI.registrarAcceso(userObj, estudianteObj, authUserEscuela)
    publishMessage("newAcceso")
    runCloudCodeFunction(accesoRes.id)
    reloadTable()
    Alert.alert(
      'Acceso registrado',
      "La presencia ha sido actualizada. Se ha enviado notificación a los padres.",
      [{text: 'Ok', onPress: () => {
        setSearchText('')
        reloadTable()
      }}]
    )
  }, [authUserEscuela, reloadTable])

  const registrarAcceso = useCallback((item: PresenciaItem) => {
    storeAcceso(item.estudianteObj)
  }, [storeAcceso])

  const handleCellPress = useCallback((item: PresenciaItem) => {
    Alert.alert('Cambiar Presencia', item.estudianteNombre, [
      {text: 'Cambiar presencia manual', onPress: () => cambiarPresencia(item)},
      {text: 'Registrar acceso y notificar Papás', onPress: () => registrarAcceso(item)},
      {text: 'Reporte de accesos', onPress: () => reporteAccesos(item)},
      {text: 'Cancelar', onPress: () => {}, style: 'cancel'},
    ])
  }, [cambiarPresencia, registrarAcceso, reporteAccesos])

  const getItemStyle = useCallback((presencia: string) => [
    $itemRow,
    { backgroundColor: presencia === "Presente" ? colors.palette.grassClear : colors.palette.neutral100 }
  ], [])

  const renderItem = useCallback(({ item }: { item: PresenciaItem }) => (
    <ListItem
      style={getItemStyle(item.presencia)}
      topSeparator={false}
      bottomSeparator={true}
      onPress={() => handleCellPress(item)}
    >
      <Text size="sm">{item.estudianteNombre + " | " + item.presencia + "\n"}</Text>
      <Text size="xs">{item.grupoName + "\n"}</Text>
      <Text size="xs">{item.timestamp}</Text>
    </ListItem>
  ), [handleCellPress, getItemStyle])

  const keyExtractor = useCallback((item: PresenciaItem) => item.objId, [])

  const handleSearchChange = useCallback((text: string) => {
    setSearchText(text)
  }, [])

  return (
    <Screen style={$root} preset="fixed">
      <View style={$subheaderView}>
        <Text style={$subheaderTitle} text="Alumnos presentes en el Colegio" />
        <Text preset="subheading" style={$subheaderCount}>{presenciaCount} de {totalCount}</Text>
      </View>

      {isLoading ?
        <View style={$spinner}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
        :
        <>
          <TextInput
            style={$searchBar}
            placeholder="Buscar por nombre..."
            value={searchText}
            onChangeText={handleSearchChange}
          />
          <FlatList
            style={$flatListStyle}
            data={filteredData}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
          />
        </>
      }
    </Screen>
  )
})

const $root: ViewStyle = {
  flex: 1,
  backgroundColor: colors.background,
}

const $subheaderView: ViewStyle = {
  alignItems: "center",
  backgroundColor: colors.palette.grassClear,
  height: spacing.massive,
  paddingTop: spacing.tiny
}

const $subheaderTitle: TextStyle = {
  color: colors.palette.neutral600
}

const $subheaderCount: TextStyle = {
  color: colors.palette.neutral600,
}

const $flatListStyle: ViewStyle = {
  marginBottom: 64,
}

const $spinner: ViewStyle = {
  flex: 1,
  paddingTop: 50,
  alignContent: "center",
  alignItems: "center",
  justifyContent: "center"
}

const $itemRow: ViewStyle = {
  backgroundColor: colors.palette.neutral100,
  paddingLeft: spacing.small,
}

const $searchBar: ViewStyle = {
  height: 36,
  borderColor: colors.palette.neutral300,
  borderWidth: 1,
  paddingLeft: 8,
  marginVertical: 8,
  marginHorizontal: 16,
  borderRadius: 10,
}

const $headerIconQR: ViewStyle = {
  marginTop: Platform.OS === 'android' ? 24 : -2,
  marginRight: 22,
}

const $headerIconEye: ViewStyle = {
  marginTop: Platform.OS === 'android' ? 24 : -2,
}