import React, { FC, useEffect, useState } from "react"
import * as ParseAPI from "../services/parse/ParseAPI"
import { useStores } from "../models"
import { observer } from "mobx-react-lite"
import moment from 'moment';
import { ViewStyle, FlatList, View, ActivityIndicator, TouchableOpacity, Alert } from "react-native"
import { AppStackScreenProps } from "app/navigators"
import { Screen, Text, ListItem } from "app/components"
import * as Haptics from 'expo-haptics';
import { colors, spacing } from "../theme"


interface EstadoCuentaScreenProps extends AppStackScreenProps<"EstadoCuenta"> {}

export const EstadoCuentaScreen: FC<EstadoCuentaScreenProps> = observer(function EstadoCuentaScreen({ route, navigation }) {
  const [adeudo, setAdeudo] = useState(0)
  const [listData, setListData] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [studentName, setStudentName] = useState("")
  const [studentGroup, setStudentGroup] = useState("")

  const estudianteIdParams = route.params["estudianteId"]

  const {
    authenticationStore: {
      authUserEscuela
    },
  } = useStores()

  useEffect(() => {
    setupComponents()
    fetchPagosFromServer()
  }, [])

  function setupComponents() {
    navigation.setOptions({
      title: "Estado de Cuenta",
      headerBackTitleVisible: false,
    });
  }

  async function fetchPagosFromServer() {
    let res = await ParseAPI.fetchPagosEstudiante(estudianteIdParams)
    if (res != null) {
      setIsLoading(false)
      setListData(res)
      processAdeudo(res)
      setStudentName(res[0].get('student').get('NOMBRE') + " " + res[0].get('student').get('APELLIDO'))
      setStudentGroup(res[0].get('student').get('grupo').get('grupoId'))
    } else {
      // EMPTY STATE!!

    }
  }

  function processAdeudo(pagoArr: any[]) {
    var totalAdeudo = 0
    for (var i = 0; i < pagoArr.length; i++) {
      let item = pagoArr[i]
      if (item.get('pagado') == false) {
        let pagoAmount = item.get('total')
        totalAdeudo = totalAdeudo + pagoAmount
      }
      setAdeudo(totalAdeudo)
    }
  }

  function formatCreatedAtDate(createdAt: Date) {
    let timestampStr = moment(createdAt).format("DD/MMM/YY [|] HH:mm");
    return timestampStr
  }

  function handleCellPress(item: any) {
    if (item.get('pagado') == true) {
      navigation.navigate("PagoDetalle")
    } else {
      Alert.alert('Pago Pendiente', "Selecciona una acción:", [
        {text: 'Mandar recordatorio de pago', onPress: () => mandarRecordatorio(item)},
        {text: 'Confirmar Pago Recibido', onPress: () => confirmarPago(item)},
        {text: 'Eliminar pago', onPress: () => eliminarPago(item), style: 'destructive'},
        {text: 'Cancelar', onPress: () => console.log('Cancel Pressed'), style: 'cancel'},
      ]);
    }
  }

  function mandarRecordatorio(pagoObject: any) {
    let studentName = pagoObject.get('student').get('NOMBRE') + " " + pagoObject.get('student').get('ApPATERNO')
    const actividadParams = {
      actividadType: 4, // Mensaje directo para estudiante
      grupoName: studentName,
      grupoId: null,
      estudianteId: pagoObject.get('student').id,
      reloadList: null
    }
    navigation.navigate("CrearActividad", actividadParams)
  }

  async function confirmarPago(pagoObject: any) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    let res = await ParseAPI.updatePagoManual(pagoObject)
    console.log("res: " + res)
    if (res != null) {
      runCloudCodeFunction(pagoObject.id)
      fetchPagosFromServer()
      presentFeedback("Pago Confirmado", "Una notificación fue enviada a los Papás del alumno.")
    } else {
      presentFeedback("Ocurrió algo inesperado", "No fue posible confirmar el pago. Intenta de nuevo, por favor.")
    }
  }

  function eliminarPago(pagoObject: any) {
    Alert.alert('¿Eliminar Pago?', "Confirma tu acción:", [
      {text: 'Eliminar pago', onPress: () => eliminarPagoFromServer(pagoObject), style: 'destructive'},
      {text: 'Cancelar', onPress: () => console.log('Cancel Pressed'), style: 'cancel'},
    ]);
  }

  async function eliminarPagoFromServer(pagoObject: any) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    let res = await ParseAPI.eliminarPago(pagoObject)
    console.log("res: " + res)
    if (res != null) {
      fetchPagosFromServer()
      presentFeedback("Pago Eliminado", "El pago fue eliminado exitosamente.")
    } else {
      presentFeedback("Ocurrió algo inesperado", "No fue posible eliminar el pago. Intenta de nuevo, por favor.")
    }
  }

  function runCloudCodeFunction(objectId: string) {
    // Cloud
    let cloudFuncName = "pagoManualNotification"
    const params = { pagoId: objectId, escuelaObjId:  authUserEscuela}
    ParseAPI.runCloudCodeFunction(cloudFuncName, params)
  }

  function presentFeedback(alertTitle, alertMessage) {
    Alert.alert(
      alertTitle,
      alertMessage,
      [
        {text: 'Ok', onPress: null, style: 'default'},
      ],
      {cancelable: false},
    );
  }


  return (
    <Screen style={$root} preset="fixed">
      <Text size="sm">{studentName}</Text>
      <Text size="xs" style={{marginTop: 4}}>{studentGroup}</Text>
      <Text style={{marginBottom: 4}}>{"Adeudo total: $" + adeudo}</Text>

      {isLoading ? 
        <>
          <View style={$spinner}>
            <ActivityIndicator size="large" color="#007AFF" /> 
          </View>
        </>
      :
        <FlatList
          style={$flatListStyle}
          data={listData}
          renderItem={({item}) =>
            <ListItem 
              style={$itemRow} 
              topSeparator={false} 
              bottomSeparator={true}
              onPress={() => handleCellPress(item)}
            >
              <Text size="xs">{item.get('pagado') == true ? "🟢  " : "🔴  "}</Text>
              <Text size="xs">{formatCreatedAtDate(item.createdAt) + "  \n"}</Text>
              <Text size="sm">{item.get('concepto') + "  \n"}</Text>
              <Text size="sm">{"$" + item.get('total')}</Text>
            </ListItem>
          }
          keyExtractor={item => item.id}
        />  
      }
    </Screen>
  )
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
  justifyContent: "center"
}

const $flatListStyle: ViewStyle = {
  marginTop: 8,
  marginBottom: 20,
  borderRadius: 10,
}

const $itemRow: ViewStyle = {
  flex: 1,
  flexDirection: "row",
  backgroundColor: colors.palette.neutral100,
  padding: spacing.small,
}
