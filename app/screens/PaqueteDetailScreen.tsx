import React, { FC, useState, useEffect } from "react"
import * as ParseAPI from "../services/parse/ParseAPI"
import { observer } from "mobx-react-lite"
import moment from 'moment';
import 'moment/locale/es';
moment.locale('es');
import DateTimePicker from '@react-native-community/datetimepicker';
import { ViewStyle, View, ActivityIndicator, Alert, Button } from "react-native"
import { AppStackScreenProps } from "app/navigators"
import { Screen, Text, TextField } from "app/components"
import * as Haptics from 'expo-haptics';
import { colors, spacing } from "../theme"
import { useStores } from "../models"
import { Platform } from "react-native"

interface PaqueteDetailScreenProps extends AppStackScreenProps<"PaqueteDetail"> {}

export const PaqueteDetailScreen: FC<PaqueteDetailScreenProps> = observer(function PaqueteDetailScreen({ route, navigation }) {
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [isSaved, setIsSaved] = useState(false)
  const [isNewObject, setIsNewObject] = useState(true)
  const [nombre, setNombre] = useState("")
  const [horaEntrada, setHoraEntrada] = useState(new Date());
  const [horaSalida, setHoraSalida] = useState(new Date());
  const [precio, setPrecio] = useState("");

  // Add this new function to validate and format the price input
  const handlePrecioChange = (text: string) => {
    // Remove any non-numeric characters
    const numericValue = text.replace(/[^0-9]/g, '');
    setPrecio(numericValue);
  };

  const {
    authenticationStore: {
      authUserEscuela,
    },
  } = useStores()

  const [showEntrada, setShowEntrada] = useState(false)
  const [showSalida, setShowSalida] = useState(false)

  const onChangeEntrada = (event, selectedDate) => {
    setShowEntrada(false)
    if (event.type === "set") {
      const currentDate = selectedDate || horaEntrada
      setHoraEntrada(currentDate)
    }
  }

  const onChangeSalida = (event, selectedDate) => {
    setShowSalida(false)
    if (event.type === "set") {
      const currentDate = selectedDate || horaSalida
      setHoraSalida(currentDate)
    }
  }

  const showEntradaPicker = () => {
    setShowEntrada(true)
  }

  const showSalidaPicker = () => {
    setShowSalida(true)
  }

  useEffect(() => {
    setupComponents()
  }, [])

  function setupComponents() {
    navigation.setOptions({
      headerBackTitleVisible: false,
      title: "Nuevo Paquete",
    });
    if (route.params["obj"] != null) {
      setIsNewObject(false)
      setupUI()
    }
  }

  function setupUI() {
    let paqueteObj = route.params["obj"]
    let nombre = paqueteObj.get('nombre')
    setNombre(nombre)

    let precio = paqueteObj.get('precio')
    setPrecio(precio)

    let horaEntradaDate = paqueteObj.get('horaEntrada')
    if (horaEntradaDate != null) {
      setHoraEntrada(horaEntradaDate)
    }

    let horaSalidaDate = paqueteObj.get('horaSalida')
    if (horaSalidaDate != null) {
      setHoraSalida(horaSalidaDate)
    }
  }

  const onEntradaTimeChange = (event, selectedDate) => {
    const currentDate = selectedDate;
    setHoraEntrada(currentDate);
  };

  const onSalidaTimeChange = (event, selectedDate) => {
    const currentDate = selectedDate;
    setHoraSalida(currentDate);
  };

  function guardarAction() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
    if (route.params["obj"] != null) {
      // Existing Object
      if (nombre.length > 0 && precio.length > 0) {
        updatePaquete()
      } else {
        presentFeedback("Campos Vacíos", "Ingresa información en todos los campos para guardar.")
      }
    } else {
      // New Object
      if (nombre.length > 0 && precio.length > 0) {
        savePaquete()
      } else {
        presentFeedback("Campos Vacíos", "Ingresa información en todos los campos para guardar.")
      }
    }
  }

  async function savePaquete() {
    setIsSubmitted(true)
    const entradaStr = moment(horaEntrada).format("HH:mm")
    const salidaStr = moment(horaSalida).format("HH:mm")
    let horarioStr = entradaStr + "-" + salidaStr
    let dataObj = {
      escuelaId: authUserEscuela,
      nombre: nombre,
      precio: precio,
      horario: horarioStr,
      horaEntrada: horaEntrada,
      horaSalida: horaSalida
    }
    let paqueteId = await ParseAPI.savePaquete(dataObj)
    setIsSubmitted(false)
    if (paqueteId != null) {
      setIsSaved(true)
      route.params.reloadTable()
      presentFeedback("Paquete Creado", "El paquete ha sido creado exitosamente.")
    } else {
      presentFeedback("Ocurrió algo inesperado", "Por favor intenta de nuevo.")
    }
  }

  async function updatePaquete() {
    setIsSubmitted(true)
    const entradaStr = moment(horaEntrada).format("HH:mm")
    const salidaStr = moment(horaSalida).format("HH:mm")
    let horarioStr = entradaStr + "-" + salidaStr
    let dataObj = {
      objectId: route.params["obj"].id,
      nombre: nombre,
      precio: precio,
      horario: horarioStr,
      horaEntrada: horaEntrada,
      horaSalida: horaSalida
    }
    let success = await ParseAPI.updatePaquete(dataObj)
    setIsSubmitted(false)
    if (success) {
      setIsSaved(true)
      route.params.reloadTable()
      presentFeedback("Paquete Actualizado", "El paquete ha sido actualizado exitosamente.")
    } else {
      presentFeedback("Ocurrió algo inesperado", "Por favor intenta de nuevo.")
    }
  }

  function presentFeedback(alertTitle: string, alertMessage: string) {
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
    <Screen style={$root} preset="scroll">
      <TextField
        value={nombre}
        onChangeText={setNombre}
        containerStyle={$textField}
        inputWrapperStyle={$inputContainer}
        autoCapitalize="words"
        autoComplete="name"
        autoCorrect={false}
        keyboardType="default"
        labelTx="paqueteScreen.nombreTF"
        placeholderTx="paqueteScreen.nombrePlaceholder"
      />

      <TextField
        value={precio}
        onChangeText={handlePrecioChange}
        containerStyle={$textField}
        inputWrapperStyle={$inputContainer}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="numeric"
        labelTx="paqueteScreen.precioTF"
      />

      <View style={{flexDirection: "row", justifyContent: "flex-start", marginTop: 8, marginBottom: 4}}>
        <Text tx="paqueteScreen.horaEntradaTF" />
        {Platform.OS === 'ios' ? (
          <DateTimePicker
            testID="dateTimePicker"
            value={horaEntrada}
            mode={'time'}
            is24Hour={true}
            onChange={onChangeEntrada}
          />
        ) : (
          <>
            <Button
              title={horaEntrada.toLocaleTimeString()}
              onPress={showEntradaPicker}
            />
            {showEntrada && (
              <DateTimePicker
                testID="dateTimePicker"
                value={horaEntrada}
                mode={'time'}
                is24Hour={true}
                onChange={onChangeEntrada}
              />
            )}
          </>
        )}
      </View>

      <View style={{flexDirection: "row", justifyContent: "flex-start", marginLeft: 16, marginTop: 20, marginBottom: 16}}>
        <Text tx="paqueteScreen.horaSalidaTF" />
        {Platform.OS === 'ios' ? (
          <DateTimePicker
            testID="dateTimePicker"
            value={horaSalida}
            mode={'time'}
            is24Hour={true}
            onChange={onChangeSalida}
          />
        ) : (
          <>
            <Button
              title={horaSalida.toLocaleTimeString()}
              onPress={showSalidaPicker}
            />
            {showSalida && (
              <DateTimePicker
                testID="dateTimePicker"
                value={horaSalida}
                mode={'time'}
                is24Hour={true}
                onChange={onChangeSalida}
              />
            )}
          </>
        )}
      </View>


        {isSubmitted ? 
          <View style={{marginTop: spacing.extraLarge}}>
            <ActivityIndicator size="large" color="#007AFF" /> 
          </View>
          :
          !isSaved &&
          <View style={{marginTop: spacing.large}}>
            <Button
            title={isNewObject ? "Guardar" : "Actualizar"}
            onPress={() => guardarAction()}
            />
          </View>
        }


    </Screen>
  )
})

const $root: ViewStyle = {
  flex: 1,
  backgroundColor: colors.background,
  paddingTop: spacing.stdPadding,
  paddingHorizontal: spacing.stdPadding,
}

const $inputContainer: ViewStyle = {
  height: 36, 
  borderColor: colors.palette.neutral300,
  borderWidth: 1,
  margin: 4,
  borderRadius: 10,
  paddingLeft: 8, 
  paddingTop: 4
}

const $textField: ViewStyle = {
  marginBottom: spacing.small,
  borderColor: colors.palette.bluejeansDark,
}
