import React, { FC, useEffect, useState, useCallback } from "react"
import * as ParseAPI from "../services/parse/ParseAPI"
import { useStores } from "../models"
import { Entypo } from '@expo/vector-icons'
import { observer } from "mobx-react-lite"
import { ViewStyle, View, FlatList, ActivityIndicator, TextInput, TextStyle } from "react-native"
import { NativeStackScreenProps } from "@react-navigation/native-stack"
import { AppStackScreenProps } from "app/navigators"
import { Screen, Text, ListItem } from "app/components"
import { colors, spacing } from "../theme"
import * as Haptics from 'expo-haptics';

interface EstudiantesScreenProps extends NativeStackScreenProps<AppStackScreenProps<"Estudiantes">> {}

export const EstudiantesScreen: FC<EstudiantesScreenProps> = observer(function EstudiantesScreen({ navigation }) {
  const [isLoading, setIsLoading] = useState(true)
  const [listData, setListData] = useState<any[]>([])
  const [searchText, setSearchText] = useState('')
  const [filteredData, setFilteredData] = useState<any[]>([])
  const [totalCount, setTotalCount] = useState(0)

  const {
    authenticationStore: {
      authUserEscuela,
      authUsertype
    },
  } = useStores()

  const reloadTable = useCallback(() => {
    setIsLoading(true)
    setListData([])
  }, [])

  const plusButtonTapped = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
    const params = {
      reloadTable: reloadTable
    }
    navigation.navigate("EditExpediente", params)
  }, [navigation, reloadTable])

  const filterData = useCallback((search: string) => {
    const filtered = listData.filter(item => {
      const itemName = item.get('NOMBRE').toLowerCase()
      const searchLower = search.toLowerCase()
      return itemName.includes(searchLower)
    })
    setFilteredData(filtered)
  }, [listData])

  useEffect(() => {
    filterData(searchText)
  }, [listData, searchText, filterData])

  useEffect(() => {
    navigation.setOptions({
      headerBackTitleVisible: false,
      headerStyle: {
        backgroundColor: colors.palette.bluejeansDark
      },
      headerTitle: () => (
        <>
          <Text size="lg" style={$headerCount}>Estudiantes    </Text>
          <Text size="md" style={$headerCount}>Total: {totalCount}</Text>
        </>
      ),
      headerRight: () => (
        <Entypo name="plus" size={23} style={$headerPlusIcon} color={colors.palette.actionColor} onPress={plusButtonTapped} />
      ),
    })
  }, [totalCount, plusButtonTapped])

  useEffect(() => {
    fetchEstudiantesFromServer()
  }, [])

  async function fetchEstudiantesFromServer() {
    if (listData.length === 0) {
      const estudiantesRes = await ParseAPI.fetchEstudiantes(authUserEscuela)
      if (estudiantesRes != null) {
        if (authUsertype === 1) {
          filterEstudiantesForDocenteUser(estudiantesRes)
        } else {
          processDataForTable(estudiantesRes)
        }
      } else {
        setIsLoading(false)
      }
    }
  }

  async function filterEstudiantesForDocenteUser(dataArr: any) {
    const escuelaObj = await ParseAPI.fetchUserEscuela(authUserEscuela)
    const userGrupos = await ParseAPI.fetchGrupos(escuelaObj)
    const estudiantesRes = await ParseAPI.fetchEstudiantesByGrupos(userGrupos)
    const filteredDataArr = dataArr.filter((estudianteObj: any) => {
      return estudiantesRes.some((estudiante: any) => estudiante.id === estudianteObj.id)
    })
    processDataForTable(filteredDataArr)
  }

  function processDataForTable(dataArr: any) {
    setTotalCount(dataArr.length)
    setListData(dataArr)
    setIsLoading(false)
  }

  const handleCellPress = useCallback((item: any) => {
    navigation.navigate("Expediente", item)
  }, [navigation])

  const renderItem = useCallback(({ item }: { item: any }) => (
    <ListItem
      style={$itemRow}
      topSeparator={false}
      bottomSeparator={true}
      onPress={() => handleCellPress(item)}
    >
      <Text size="md">{item.get('NOMBRE') + " " + item.get('ApPATERNO') + " " + item.get('ApMATERNO') + "\n"}</Text>
      {item.get('grupo') && <Text size="xs">{item.get('grupo').get('name')}</Text>}
    </ListItem>
  ), [handleCellPress])

  const keyExtractor = useCallback((item: any) => item.id, [])

  const handleSearchChange = useCallback((text: string) => {
    setSearchText(text)
  }, [])

  return (
    <Screen style={$root} preset="fixed">
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
  paddingTop: spacing.tiny,
  paddingHorizontal: spacing.stdPadding,
}

const $spinner: ViewStyle = {
  flex: 1,
  paddingTop: 50,
  alignContent: "center",
  alignItems: "center",
  justifyContent: "center"
}

const $flatListStyle: ViewStyle = {
  marginTop: 6,
  marginBottom: 50,
  borderRadius: 10,
}

const $itemRow: ViewStyle = {
  backgroundColor: colors.palette.neutral100,
  paddingLeft: spacing.small,
  paddingRight: spacing.tiny,
  paddingTop: spacing.tiny,
  paddingBottom: spacing.micro,
}

const $searchBar: ViewStyle = {
  height: 36,
  borderColor: colors.palette.neutral300,
  borderWidth: 1,
  paddingLeft: 8,
  margin: 4,
  borderRadius: 10,
}

const $headerCount: TextStyle = {
  fontSize: 17,
  fontWeight: "bold",
  color: colors.palette.neutral100
}

const $headerPlusIcon: ViewStyle = {
  marginTop: -2,
}