import React, { FC, useEffect, useState, useCallback } from "react"
import * as ParseAPI from "../services/parse/ParseAPI"
import { observer } from "mobx-react-lite"
import { useStores } from "../models"
import { ViewStyle, FlatList, ActivityIndicator, View, Dimensions, Alert, Pressable, TextStyle } from "react-native"
import { Entypo } from '@expo/vector-icons'
import { AppStackScreenProps } from "app/navigators"
import { Screen, Text } from "app/components"
import { colors, spacing } from "../theme"
import moment from 'moment'
import 'moment/locale/es'
import * as Haptics from 'expo-haptics'

// Hoisted constants
const SCREEN_WIDTH = Dimensions.get('window').width
const FLAT_LIST_WIDTH = SCREEN_WIDTH - 24
const COLUMN_WIDTH = (FLAT_LIST_WIDTH / 2) - 8

interface InformacionScreenProps extends AppStackScreenProps<"Informacion"> {}

interface DocumentoItem {
  id: string
  get: (key: string) => any
  createdAt: Date
}

export const InformacionScreen: FC<InformacionScreenProps> = observer(function InformacionScreen({ navigation }) {
  const [isLoading, setIsLoading] = useState(true)
  const [documentos, setDocumentos] = useState<DocumentoItem[]>([])

  const {
    authenticationStore: {
      authUserEscuela,
    },
  } = useStores()

  const fetchInformacionFromServer = useCallback(async () => {
    const resultObj = await ParseAPI.fetchInformacion(authUserEscuela)
    if (resultObj != null) {
      setDocumentos(resultObj)
      setIsLoading(false)
    }
  }, [authUserEscuela])

  const reloadActividadList = useCallback(() => {
    fetchInformacionFromServer()
  }, [fetchInformacionFromServer])

  const plusButtonTapped = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
    navigation.navigate("CrearInformacion", { reloadList: reloadActividadList })
  }, [navigation, reloadActividadList])

  useEffect(() => {
    navigation.setOptions({
      headerBackTitleVisible: false,
      headerStyle: {
        backgroundColor: colors.palette.sunflowerDark
      },
      title: "Información",
      headerRight: () => (
        <Entypo name="plus" size={23} style={$headerPlusIcon} color={colors.palette.actionColor} onPress={plusButtonTapped} />
      ),
    })
    fetchInformacionFromServer()
  }, [plusButtonTapped, fetchInformacionFromServer])

  const getDateFormatStr = useCallback((dateStr: Date) => {
    return moment(dateStr).format('ddd DD/MMM/YY')
  }, [])

  const formatTitleStr = useCallback((title: string) => {
    if (title.length > 30) {
      return title.slice(0, 31) + "..."
    }
    return title
  }, [])

  const fetchSeenByData = useCallback(async (itemId: string) => {
    const seenByRes = await ParseAPI.fetchInformacionSeenBy(itemId)
    const params = {
      infoTableData: seenByRes
    }
    navigation.navigate("seenBy", params)
  }, [navigation])

  const handleSeenBy = useCallback((item: DocumentoItem) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    fetchSeenByData(item.id)
  }, [fetchSeenByData])

  const executeDelete = useCallback(async (item: DocumentoItem) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    await ParseAPI.eliminarInformacion(item)
    fetchInformacionFromServer()
    Alert.alert("Documento eliminado", "El documento ha sido eliminado correctamente")
  }, [fetchInformacionFromServer])

  const handleDelete = useCallback((item: DocumentoItem) => {
    Alert.alert(
      "Confirmar eliminación",
      "¿Quieres eliminar este documento?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: () => executeDelete(item)
        }
      ]
    )
  }, [executeDelete])

  const onCellClick = useCallback((item: DocumentoItem) => {
    const attachmentData = {
      objectId: item.id,
      tipo: "PDF",
      isNewBucket: item.get("newS3Bucket")
    }
    navigation.navigate('attachmentDetail', attachmentData)
  }, [navigation])

  const onCellLongPress = useCallback((item: DocumentoItem) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    Alert.alert(
      "Opciones del documento",
      "Selecciona una acción",
      [
        {
          text: "Visto por",
          onPress: () => handleSeenBy(item),
          style: "default"
        },
        {
          text: "Eliminar",
          onPress: () => handleDelete(item),
          style: "destructive"
        },
        {
          text: "Cancelar",
          style: "cancel"
        }
      ],
      { cancelable: true }
    )
  }, [handleSeenBy, handleDelete])

  const renderItem = useCallback(({ item }: { item: DocumentoItem }) => (
    <Pressable onPress={() => onCellClick(item)} onLongPress={() => onCellLongPress(item)}>
      <View style={$cardContainer}>
        <View style={$pdfIconContainer}>
          <Text>PDF</Text>
        </View>
        <Text>{formatTitleStr(item.get("tipo"))}</Text>
        <Text size="xs">{formatTitleStr(item.get("contenido"))}</Text>
        <Text size="xxs">{getDateFormatStr(item.createdAt)}</Text>
      </View>
    </Pressable>
  ), [onCellClick, onCellLongPress, formatTitleStr, getDateFormatStr])

  const keyExtractor = useCallback((item: DocumentoItem, index: number) => index.toString(), [])


  return (
    <Screen style={$root} preset="fixed">
      <Text text="Documentos Activos" size="md" weight="bold" />
      {isLoading ? (
        <View style={$spinner}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      ) : (
        <FlatList
          data={documentos}
          style={$flatListStyle}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          numColumns={2}
        />
      )}
    </Screen>
  )
})

const $root: ViewStyle = {
  flex: 1,
  backgroundColor: colors.background,
  paddingTop: spacing.tiny,
  paddingHorizontal: spacing.medium,
}

const $spinner: ViewStyle = {
  flex: 1,
  paddingTop: 50,
  alignContent: "center",
  alignItems: "center",
  justifyContent: "center",
}

const $headerPlusIcon: TextStyle = {
  marginTop: -2,
}

const $flatListStyle: ViewStyle = {
  width: FLAT_LIST_WIDTH,
  marginBottom: 30,
}

const $cardContainer: ViewStyle = {
  width: COLUMN_WIDTH,
  justifyContent: "center",
  alignSelf: "center",
  alignItems: "center",
  height: 210,
  padding: spacing.extraSmall,
  borderRadius: 8,
  marginRight: 8,
  marginBottom: 8,
  backgroundColor: colors.palette.neutral100,
}

const $pdfIconContainer: ViewStyle = {
  backgroundColor: colors.palette.neutral200,
  height: 90,
  width: 70,
  marginTop: 2,
  marginBottom: 6,
  alignItems: "center",
  justifyContent: "center",
}