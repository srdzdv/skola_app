import React, { FC, useEffect, useState, useCallback, useRef, memo } from "react"
import { observer } from "mobx-react-lite"
import { ViewStyle, View, FlatList, ActivityIndicator } from "react-native"
import { NativeStackScreenProps } from "@react-navigation/native-stack"
import { AppStackScreenProps } from "app/navigators"
import { Screen, Text, ListItem } from "app/components"
import { colors, spacing } from "../theme"
import * as ParseAPI from "../services/parse/ParseAPI"
import moment from 'moment';
import * as Haptics from 'expo-haptics';
import { Entypo } from '@expo/vector-icons';
import PlaneacionList from '../components/PlaneacionList'
import MomentosList from '../components/MomentosList'

interface ActividadGrupoScreenProps extends NativeStackScreenProps<AppStackScreenProps<"ActividadGrupo">> {}

// Memoized list item component
const ActividadListItem = memo(function ActividadListItem({
  item,
  onPress,
}: {
  item: any
  onPress: (item: any) => void
}) {
  const handlePress = useCallback(() => {
    onPress(item)
  }, [item, onPress])

  const dateStr = moment(item.get("createdAt")).format('DD/MMM')
  const descripcion = item.get("descripcion") || ""

  // Crop description
  let croppedDescripcion = descripcion
  const splitArr = descripcion.split(' ')
  if (splitArr.length > 10) {
    croppedDescripcion = splitArr.slice(0, 8).join(' ')
  }
  croppedDescripcion = croppedDescripcion + "..."

  const hasAttachment = item.get("awsAttachment") === true

  return (
    <ListItem
      style={$itemRow}
      topSeparator={false}
      bottomSeparator={true}
      onPress={handlePress}
      RightComponent={hasAttachment ? <Entypo name="attachment" size={20} color="#E9573F" style={$listItemRightComp} /> : null}
    >
      <Text size="xs">{dateStr}</Text>
      <Text size="md">{" " + croppedDescripcion}</Text>
    </ListItem>
  )
})

export const ActividadGrupoScreen: FC<ActividadGrupoScreenProps> = observer(function ActividadGrupoScreen({ route, navigation }) {
  const [isLoading, setIsLoading] = useState(true)
  const [listData, setListData] = useState<any[]>([])
  const [isPlaneacion, setIsPlaneacion] = useState(false)
  const [isMomentos, setIsMomentos] = useState(false)
  const [grupoSelected, setGrupoSelected] = useState({id: "", name: ""})
  const [viewBgColor, setViewBgColor] = useState(colors.palette.bluejeansDark)

  // Use ref for tipoActividad since it's used in callbacks
  const tipoActividadRef = useRef("")

  // Nav Params
  const grupoIdParams = route.params["grupoId"] as string
  const grupoNameParams = route.params["grupoName"] as string
  const actividadTypeParam = route.params["actividadType"] as string

  useEffect(() => {
    setupComponents()
  }, [])

  function setupComponents() {
    const grupoSel = {id: grupoIdParams, name: grupoNameParams}
    setGrupoSelected(grupoSel)

    let actividadTypeString = ""
    let navHeaderTitle = ""

    switch (actividadTypeParam) {
      case "0":
        tipoActividadRef.current = "Tareas"
        actividadTypeString = "Tareas"
        navHeaderTitle = "Tareas - " + grupoNameParams
        setViewBgColor(colors.palette.grassLight)
        fetchDataForTable(grupoIdParams, actividadTypeParam)
        break;
      case "1":
        tipoActividadRef.current = "Anuncios"
        actividadTypeString = "Anuncios"
        navHeaderTitle = "Anuncios - " + grupoNameParams
        setViewBgColor(colors.palette.bluejeansLight)
        fetchDataForTable(grupoIdParams, actividadTypeParam)
        break;
      case "2":
        tipoActividadRef.current = "Momentos"
        actividadTypeString = "Momentos"
        navHeaderTitle = "Momentos - " + grupoNameParams
        setViewBgColor(colors.palette.bittersweetLight)
        setIsMomentos(true)
        setIsLoading(false)
        break;
      case "3":
        tipoActividadRef.current = "Planeación"
        actividadTypeString = "Planeación"
        navHeaderTitle = "Planeación - " + grupoNameParams
        setViewBgColor(colors.palette.sunflowerLight)
        setIsPlaneacion(true)
        setIsLoading(false)
        break;
      default:
        actividadTypeString = "Actividad"
        setViewBgColor(colors.palette.bluejeansDark)
        break;
    }

    // Header
    if (actividadTypeParam === "2" || actividadTypeParam === "3") {
      navigation.setOptions({
        headerBackTitleVisible: false,
        headerTintColor: colors.palette.actionColor,
        headerTitleStyle: {color: colors.palette.neutral100},
        title: navHeaderTitle
      })
    } else {
      navigation.setOptions({
        headerBackTitleVisible: false,
        headerTintColor: colors.palette.actionColor,
        title: navHeaderTitle,
        headerTitleStyle: {color: colors.palette.neutral100},
        headerRight: () => (
          <Entypo name="plus" size={28} style={{marginTop: 2}} color={colors.palette.actionColor} onPress={headerRightBttnPressed} />
        ),
      })
    }
  }

  function headerRightBttnPressed() {
    actionButtonTapped()
  }

  async function fetchDataForTable(grupoObjId: string, actividadType: string) {
    const grupoActividadesRes = await ParseAPI.fetchGrupoActividad(grupoObjId, actividadType)
    setIsLoading(false)
    setListData(grupoActividadesRes)
  }

  function actionButtonTapped() {
    const actIdMap: Record<string, number> = {
      "Tareas": 0,
      "Anuncios": 1,
      "Momentos": 2,
      "Planeación": 3,
    }
    const actId = actIdMap[tipoActividadRef.current] ?? 0

    const actividadParams = {
      actividadType: actId,
      grupoName: grupoNameParams,
      grupoId: grupoIdParams,
      reloadList: reloadActividadList
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
    navigation.navigate("CrearActividad", actividadParams)
  }

  function reloadActividadList() {
    setupComponents()
  }

  const handleCellPress = useCallback((item: any) => {
    navigation.navigate("mensajeDetail", { ...item, _fromActividadGrupo: true })
  }, [navigation])

  const renderItem = useCallback(({ item }: { item: any }) => (
    <ActividadListItem
      item={item}
      onPress={handleCellPress}
    />
  ), [handleCellPress])

  const keyExtractor = useCallback((item: any) => item.id, [])

  return (
    <Screen style={[$root, {backgroundColor: viewBgColor}]} preset="fixed">
      {isPlaneacion && (
        <PlaneacionList navObject={navigation} grupoObj={grupoSelected} />
      )}

      {isMomentos && (
        <MomentosList grupoId={grupoSelected.id} />
      )}

      {isLoading ? (
        <View style={$spinner}>
          <ActivityIndicator size="large" color="#FFFFFF" />
        </View>
      ) : (
        <FlatList
          style={$flatListStyle}
          data={listData}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
        />
      )}
    </Screen>
  )
})

const $root: ViewStyle = {
  flex: 1,
  padding: spacing.small,
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
  paddingBottom: spacing.extraSmall,
  paddingTop: spacing.extraSmall
}

const $flatListStyle: ViewStyle = {
  marginTop: 4,
  marginBottom: 50,
  borderRadius: 10,
}

const $listItemRightComp: ViewStyle = {
  marginRight: 8,
  marginTop: 2,
}
