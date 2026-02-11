import React, { FC, useEffect, useState, useCallback } from "react"
import * as ParseAPI from "../services/parse/ParseAPI"
import { useStores } from "../models"
import moment from 'moment'
import { observer } from "mobx-react-lite"
import { Entypo } from '@expo/vector-icons'
import { ViewStyle, TextStyle, View, FlatList, ActivityIndicator, Alert, Platform, AlertButton, Modal, TouchableOpacity, StyleSheet, ScrollView } from "react-native"
import { NativeStackScreenProps } from "@react-navigation/native-stack"
import { AppStackScreenProps } from "app/navigators"
import { Screen, Text, ListItem } from "app/components"
import { colors, spacing } from "../theme"
import * as Haptics from 'expo-haptics'
import SegmentedControl from '@react-native-segmented-control/segmented-control/js/SegmentedControl.js'

// Hoisted constants
const SEGMENT_CONTROL_VALUES = ["Pendientes", "Recibidos"]

// Define option type for both Alert and custom modal
interface ActionOption {
  text: string
  onPress: () => void
  style?: 'default' | 'destructive' | 'cancel'
}

interface PagoItem {
  id: string
  get: (key: string) => any
}

interface PagosScreenProps extends NativeStackScreenProps<AppStackScreenProps<"Pagos">> {}

export const PagosScreen: FC<PagosScreenProps> = observer(function PagosScreen({ navigation }) {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [pendientesArr, setPendientesArr] = useState<PagoItem[]>([])
  const [pagadosArr, setPagadosArr] = useState<PagoItem[]>([])
  const [pendientesCount, setPendientesCount] = useState(0)
  const [recibidosCount, setRecibidosCount] = useState(0)
  const [listData, setListData] = useState<PagoItem[]>([])
  const [modalVisible, setModalVisible] = useState(false)
  const [modalTitle, setModalTitle] = useState("")
  const [modalOptions, setModalOptions] = useState<ActionOption[]>([])

  const {
    authenticationStore: {
      authUserEscuela
    },
  } = useStores()

  const processDataForTable = useCallback((dataArr: PagoItem[]) => {
    if (dataArr.length > 0) {
      const pendienteArr = dataArr.filter((pago: PagoItem) => pago.get('pagado') === false)
      const pagadoArr = dataArr.filter((pago: PagoItem) => pago.get('pagado') === true)
      setPendientesArr(pendienteArr)
      setPagadosArr(pagadoArr)
      setPendientesCount(pendienteArr.length)
      setRecibidosCount(pagadoArr.length)
      setListData(pendienteArr)
      setIsLoading(false)
    } else {
      setIsLoading(false)
    }
  }, [])

  const fetchPagosFromServer = useCallback(async () => {
    setIsLoading(true)
    const resultObj = await ParseAPI.fetchPagos(authUserEscuela)
    if (resultObj != null) {
      processDataForTable(resultObj)
    }
  }, [authUserEscuela, processDataForTable])

  const presentFeedback = useCallback((alertTitle: string, alertMessage: string) => {
    Alert.alert(
      alertTitle,
      alertMessage,
      [{ text: 'Ok', onPress: () => null, style: 'default' }],
      { cancelable: false },
    )
  }, [])

  const runCloudCodeFunction = useCallback((objectId: string) => {
    const cloudFuncName = "pagoManualNotification"
    const params = { pagoId: objectId, escuelaObjId: authUserEscuela }
    ParseAPI.runCloudCodeFunction(cloudFuncName, params)
  }, [authUserEscuela])

  const crearPagoModal = useCallback(() => {
    navigation.navigate("CrearPago" as any, { escuelaId: authUserEscuela })
  }, [navigation, authUserEscuela])

  const enviarRecordatorio = useCallback(() => {
    const actividadParams = {
      actividadType: 4,
      grupoName: "pagos pendientes",
      grupoId: null,
      estudianteId: null,
      reloadList: null,
      msgPreview: "Queridos Papás, les recordamos que el pago del mes está pendiente. Por favor, confirma el pago lo antes posible.",
      estudiantesIdsArr: pendientesArr.map((pago: PagoItem) => pago.get('student').id)
    }
    navigation.navigate("CrearActividad" as any, actividadParams)
  }, [navigation, pendientesArr])

  const plusButtonTapped = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
    const options: ActionOption[] = [
      { text: 'Crear Pago', onPress: () => crearPagoModal() },
      { text: 'Enviar recordatorio de pago', onPress: () => enviarRecordatorio() },
      { text: 'Cancelar', onPress: () => {}, style: Platform.OS === 'ios' ? 'cancel' : 'default' },
    ]

    if (Platform.OS === 'ios') {
      Alert.alert('Pagos', "Selecciona una acción:", options as AlertButton[])
    } else {
      setModalTitle('Pagos')
      setModalOptions(options)
      setModalVisible(true)
    }
  }, [crearPagoModal, enviarRecordatorio])

  // Setup navigation header
  useEffect(() => {
    navigation.setOptions({
      headerBackTitleVisible: false,
      headerStyle: {
        backgroundColor: colors.palette.bittersweetDark
      },
      headerRight: () => (
        <Entypo name="plus" size={23} style={$headerPlusIcon} color={colors.palette.actionColor} onPress={plusButtonTapped} />
      ),
    })
  }, [navigation, plusButtonTapped])

  // Fetch data on mount only
  useEffect(() => {
    fetchPagosFromServer()
  }, [])

  const displayDataForUsertype = useCallback((indexSelected: number) => {
    setListData([])
    if (indexSelected === 0) {
      setListData(pendientesArr)
    } else {
      setListData(pagadosArr)
    }
    setIsLoading(false)
  }, [pendientesArr, pagadosArr])

  const segmentIndexChanged = useCallback((index: number) => {
    if (selectedIndex !== index) {
      setSelectedIndex(index)
      setIsLoading(true)
      displayDataForUsertype(index)
    }
  }, [selectedIndex, displayDataForUsertype])

  const handleSegmentChange = useCallback((event: any) => {
    segmentIndexChanged(event.nativeEvent.selectedSegmentIndex)
  }, [segmentIndexChanged])

  const formatCreatedAtDate = useCallback((createdAt: Date) => {
    return moment(createdAt).format("DD/MMM [|] HH:mm")
  }, [])

  const mandarRecordatorio = useCallback((pagoObject: PagoItem) => {
    const studentName = pagoObject.get('student').get('NOMBRE') + " " + pagoObject.get('student').get('ApPATERNO')
    const actividadParams = {
      actividadType: 4,
      grupoName: studentName,
      grupoId: null,
      estudianteId: pagoObject.get('student').id,
      reloadList: null
    }
    navigation.navigate("CrearActividad" as any, actividadParams)
  }, [navigation])

  const confirmarPago = useCallback(async (pagoObject: PagoItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    const res = await ParseAPI.updatePagoManual(pagoObject)
    if (res != null) {
      runCloudCodeFunction(pagoObject.id)
      fetchPagosFromServer()
      presentFeedback("Pago Confirmado", "Una notificación fue enviada a los Papás del alumno.")
    } else {
      presentFeedback("Ocurrió algo inesperado", "No fue posible confirmar el pago. Intenta de nuevo, por favor.")
    }
  }, [runCloudCodeFunction, fetchPagosFromServer, presentFeedback])

  const verEdoCuenta = useCallback((pagoObject: PagoItem) => {
    const studentId = pagoObject.get('student').id
    navigation.navigate("EdoCuenta" as any, { estudianteId: studentId })
  }, [navigation])

  const eliminarPagoFromServer = useCallback(async (pagoObject: PagoItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    const res = await ParseAPI.eliminarPago(pagoObject)
    if (res != null) {
      fetchPagosFromServer()
      presentFeedback("Pago Eliminado", "El pago fue eliminado exitosamente.")
    } else {
      presentFeedback("Ocurrió algo inesperado", "No fue posible eliminar el pago. Intenta de nuevo, por favor.")
    }
  }, [fetchPagosFromServer, presentFeedback])

  const eliminarPago = useCallback((pagoObject: PagoItem) => {
    const options: ActionOption[] = [
      { text: 'Eliminar pago', onPress: () => eliminarPagoFromServer(pagoObject), style: Platform.OS === 'ios' ? 'destructive' : 'default' },
      { text: 'Cancelar', onPress: () => {}, style: Platform.OS === 'ios' ? 'cancel' : 'default' },
    ]

    if (Platform.OS === 'ios') {
      Alert.alert('¿Eliminar Pago?', "Confirma tu acción:", options as AlertButton[])
    } else {
      setModalTitle('¿Eliminar Pago?')
      setModalOptions(options)
      setModalVisible(true)
    }
  }, [eliminarPagoFromServer])

  const verFoto = useCallback((pagoObject: PagoItem) => {
    const attachmentData = {
      objectId: pagoObject.id,
      tipo: "JPG",
      isNewBucket: pagoObject.get("newS3Bucket")
    }
    navigation.navigate('attachmentDetail' as any, attachmentData)
  }, [navigation])

  const didSelectRow = useCallback((pagoObject: PagoItem) => {
    if (selectedIndex === 0) {
      const options: ActionOption[] = [
        { text: 'Mandar recordatorio de pago', onPress: () => mandarRecordatorio(pagoObject) },
        { text: 'Confirmar Pago Recibido', onPress: () => confirmarPago(pagoObject) },
        { text: 'Ver Estado de Cuenta', onPress: () => verEdoCuenta(pagoObject) },
        { text: 'Eliminar pago', onPress: () => eliminarPago(pagoObject), style: Platform.OS === 'ios' ? 'destructive' : 'default' },
        { text: 'Cancelar', onPress: () => {}, style: Platform.OS === 'ios' ? 'cancel' : 'default' },
      ]

      if (Platform.OS === 'ios') {
        Alert.alert('Pago Pendiente', "Selecciona una acción:", options as AlertButton[])
      } else {
        setModalTitle('Pago Pendiente')
        setModalOptions(options)
        setModalVisible(true)
      }
    } else {
      const options: ActionOption[] = []
      if (pagoObject.get("aws") === true || pagoObject.get("newS3Bucket") === true) {
        options.push({ text: 'Ver foto de pago', onPress: () => verFoto(pagoObject) })
      }
      options.push(
        { text: 'Mandar mensaje', onPress: () => mandarRecordatorio(pagoObject) },
        { text: 'Ver Estado de Cuenta', onPress: () => verEdoCuenta(pagoObject) },
        { text: 'Eliminar pago', onPress: () => eliminarPago(pagoObject), style: Platform.OS === 'ios' ? 'destructive' : 'default' },
        { text: 'Cancelar', onPress: () => {}, style: Platform.OS === 'ios' ? 'cancel' : 'default' },
      )

      if (Platform.OS === 'ios') {
        Alert.alert('Pago Recibido', "Selecciona una acción:", options as AlertButton[])
      } else {
        setModalTitle('Pago Recibido')
        setModalOptions(options)
        setModalVisible(true)
      }
    }
  }, [selectedIndex, mandarRecordatorio, confirmarPago, verEdoCuenta, eliminarPago, verFoto])

  const closeModal = useCallback(() => setModalVisible(false), [])

  const handleOptionPress = useCallback((option: ActionOption) => {
    setModalVisible(false)
    option.onPress()
  }, [])

  const renderItem = useCallback(({ item }: { item: PagoItem }) => (
    <ListItem
      style={$itemRow}
      topSeparator={false}
      bottomSeparator={true}
      onPress={() => didSelectRow(item)}
    >
      {Platform.OS === "android" ? (
        <Text size="sm" weight="bold">{item.get('student').get('NOMBRE') + " " + item.get('student').get('APELLIDO')}</Text>
      ) : (
        <View style={$itemContentColumn}>
          <Text size="sm" weight="bold">{item.get('student').get('NOMBRE') + " " + item.get('student').get('APELLIDO')}</Text>
          <Text size="xs" weight="bold">{item.get('student').get('grupo').get('grupoId')}</Text>
          <Text size="sm">{item.get('concepto')}</Text>
          <Text size="xs">{"$" + item.get('total')}</Text>
        </View>
      )}
    </ListItem>
  ), [didSelectRow])

  const keyExtractor = useCallback((item: PagoItem) => item.id, [])

  // Android custom action sheet modal
  const renderActionSheetModal = useCallback(() => {
    return (
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={closeModal}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={closeModal}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{modalTitle}</Text>
            <ScrollView>
              {modalOptions.map((option, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.optionButton,
                    option.style === 'destructive' && styles.destructiveButton,
                    option.style === 'cancel' && styles.cancelButton,
                  ]}
                  onPress={() => handleOptionPress(option)}
                >
                  <Text
                    style={[
                      styles.optionText,
                      option.style === 'destructive' && styles.destructiveText,
                      option.style === 'cancel' && styles.cancelText,
                    ]}
                  >
                    {option.text}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    )
  }, [modalVisible, modalTitle, modalOptions, closeModal, handleOptionPress])

  return (
    <Screen style={$root} preset="fixed">
      <View style={$countRow}>
        <Text size="xs" weight={selectedIndex === 0 ? "bold" : "light"}>{pendientesCount}</Text>
        <Text size="xs" weight={selectedIndex === 1 ? "bold" : "light"}>{recibidosCount}</Text>
      </View>
      <SegmentedControl
        values={SEGMENT_CONTROL_VALUES}
        selectedIndex={selectedIndex}
        onChange={handleSegmentChange}
      />

      {isLoading ? (
        <View style={$spinner}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      ) : (
        <FlatList
          style={$flatListStyle}
          data={listData}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
        />
      )}

      {renderActionSheetModal()}
    </Screen>
  )
})

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '80%',
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    maxHeight: '70%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  optionButton: {
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  optionText: {
    fontSize: 16,
    textAlign: 'center',
  },
  destructiveButton: {
    backgroundColor: '#FFF0F0',
  },
  destructiveText: {
    color: '#FF3B30',
  },
  cancelButton: {
    backgroundColor: '#F2F2F2',
  },
  cancelText: {
    fontWeight: 'bold',
  }
})

const $root: ViewStyle = {
  flex: 1,
  backgroundColor: colors.background,
  paddingTop: spacing.extraSmall,
  paddingHorizontal: spacing.stdPadding,
}

const $spinner: ViewStyle = {
  flex: 1,
  paddingTop: 50,
  alignContent: "center",
  alignItems: "center",
  justifyContent: "center",
}

const $flatListStyle: ViewStyle = {
  marginTop: 8,
  marginBottom: 20,
  borderRadius: 10,
}

const $itemRow: ViewStyle = {
  backgroundColor: colors.palette.neutral100,
  paddingLeft: spacing.small,
  paddingRight: spacing.tiny,
  paddingTop: spacing.extraSmall,
  paddingBottom: spacing.tiny,
}

const $headerPlusIcon: TextStyle = {
  marginTop: -2,
}

const $countRow: ViewStyle = {
  flexDirection: "row",
  justifyContent: "space-between",
  height: 20,
  paddingHorizontal: 24,
}

const $itemContentColumn: ViewStyle = {
  flexDirection: "column",
  justifyContent: "space-between",
}