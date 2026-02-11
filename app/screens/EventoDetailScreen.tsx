import React, { FC, useState, useEffect, useCallback } from "react"
import * as ParseAPI from "../services/parse/ParseAPI"
import * as SQLiteAPI from "../services/sqlite/SQLiteAPI"
import { useStores } from "../models"
import { observer } from "mobx-react-lite"
import { ViewStyle, TextStyle, ActivityIndicator, View, Alert, Modal, StyleSheet, Switch, TouchableOpacity, FlatList } from "react-native"
import { NativeStackScreenProps } from "@react-navigation/native-stack"
import { AppStackScreenProps } from "app/navigators"
import { Screen, Button, TextField, Text } from "app/components"
import { colors, spacing } from "../theme"
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';


interface EventoDetailScreenProps extends NativeStackScreenProps<AppStackScreenProps<"EventoDetail">> {}

interface GrupoItem {
  id: string
  name: string
}

export const EventoDetailScreen: FC<EventoDetailScreenProps> = observer(function EventoDetailScreen({ route }) {
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [date, setDate] = useState(new Date())
  const [eventNombre, setEventoNombre] = useState("")
  const [eventoLugar, setEventoLugar] = useState("")
  const [eventoPublico, setEventoPublico] = useState("")
  const [eventoDescripcion, setEventoDescripcion] = useState("")
  const [mainBttnLabel] = useState("Crear Evento")
  const [gruposArr, setGruposArr] = useState<GrupoItem[]>([])
  const [selectedGrupos, setSelectedGrupos] = useState<string[]>([])
  const [isModalVisible, setModalVisible] = useState(false)
  const [requireConfirmation, setRequireConfirmation] = useState(false)

  const {
    authenticationStore: {
      authUserEscuela
    },
  } = useStores()

  useEffect(() => {
    fetchDBGrupos()
  }, [])


  async function fetchDBGrupos() {
    const dbResults: any[] = await SQLiteAPI.readDBPromise("Grupo", "WHERE TRUE", [])
    const tempGruposArr: GrupoItem[] = []
    if (dbResults.length > 0) {
      const allGruposObj: GrupoItem = {
        id: "all",
        name: "Toda la escuela"
      }
      tempGruposArr.push(allGruposObj)
      for (const grupo of dbResults) {
        const dataObj: GrupoItem = {
          id: grupo.objectId,
          name: grupo.name
        }
        tempGruposArr.push(dataObj)
      }
      setGruposArr(tempGruposArr)
    }
  }

  const onChange = useCallback((event: any, selectedDate?: Date) => {
    if (selectedDate) {
      setDate(selectedDate)
    }
  }, [])

  function mainBttnPressed() {
    Haptics.notificationAsync()
    setIsSubmitted(true)
    if (eventNombre.length > 0) {
      storeEvento()
    } else {
      presentFeedback("Campo vacío", "Ingresa el nombre del evento.")
    }
  }

  async function storeEvento() {
    let publico: string[]
    if (selectedGrupos.includes("Toda la escuela")) {
      publico = ["all"]
    } else {
      const publicoIds: string[] = []
      gruposArr.forEach((grupo) => {
        if (selectedGrupos.includes(grupo.name)) {
          publicoIds.push(grupo.id)
        }
      })
      publico = publicoIds
    }

    const dataObj = {
      fecha: date,
      nombre: eventNombre,
      lugar: eventoLugar,
      descripcion: eventoDescripcion,
      publico,
      confirmacion: requireConfirmation
    }
    try {
      const eventoId = await ParseAPI.saveEvento(authUserEscuela, dataObj)
      if (eventoId != null) {
        runCloudCodeFunction(eventoId)
        route.params.reloadTable()
        presentFeedback("Evento Creado", "El evento ha sido creado exitosamente. Todos los Papás han sido notificados.")
        resetState()
      } else {
        presentFeedback("Ocurrió algo inesperado", "Por favor intenta de nuevo.")
      }
    } catch (error) {
      console.error("Error saving evento:", error)
      presentFeedback("Ocurrió algo inesperado", "Por favor intenta de nuevo.")
    } finally {
      setIsSubmitted(false)
    }
  }

  function runCloudCodeFunction(eventoId: string) {
    const cloudFuncName = "eventoParentNotification"
    const params = { eventoObjectId: eventoId, escuelaObjId: authUserEscuela }
    ParseAPI.runCloudCodeFunction(cloudFuncName, params)
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

  function resetState() {
    setDate(new Date())
    setEventoNombre("")
    setEventoLugar("")
    setEventoDescripcion("")
    setEventoPublico("")
    setGruposArr([])
    setSelectedGrupos([])
    setRequireConfirmation(false)
  }

  const toggleModal = useCallback(() => {
    setModalVisible(prev => !prev)
  }, [])

  const toggleSelection = useCallback((name: string) => {
    setSelectedGrupos((prevSelected) =>
      prevSelected.includes(name)
        ? prevSelected.filter((item) => item !== name)
        : [...prevSelected, name]
    )
  }, [])

  const renderNameItem = useCallback(({ item }: { item: GrupoItem }) => {
    const isSelected = selectedGrupos.includes(item.name)
    return (
      <TouchableOpacity
        onPress={() => toggleSelection(item.name)}
        style={[styles.item, isSelected && styles.selectedItem]}>
        <Text>{item.name}</Text>
      </TouchableOpacity>
    )
  }, [selectedGrupos, toggleSelection])

  const onDone = useCallback(() => {
    setEventoPublico(selectedGrupos.join(', '))
    toggleModal()
  }, [selectedGrupos, toggleModal])

  const keyExtractor = useCallback((item: GrupoItem) => item.id, [])


  return (
    <Screen style={$root} preset="scroll" keyboardShouldPersistTaps="never">

      <Text style={$labelStyle}>Fecha:</Text>
      <View style={$datePickerRow}>
        <DateTimePicker
          testID="dateTimePicker"
          value={date}
          mode={'date'}
          is24Hour={true}
          onChange={onChange}
        />
        <DateTimePicker
          testID="dateTimePicker"
          value={date}
          mode={'time'}
          is24Hour={true}
          onChange={onChange}
        />
      </View>

      <TextField
        value={eventNombre}
        onChangeText={setEventoNombre}
        containerStyle={$textField}
        style={$textFieldInside}
        autoCapitalize="words"
        autoComplete="name"
        autoCorrect={false}
        keyboardType="default"
        labelTx="eventoScreen.nombreTF"
      />

      <TextField
        value={eventoLugar}
        onChangeText={setEventoLugar}
        containerStyle={$textField}
        style={$textFieldInside}
        autoCapitalize="words"
        autoComplete="name"
        autoCorrect={false}
        keyboardType="default"
        labelTx="eventoScreen.lugarTF"
      />

      <TextField
        value={eventoPublico}
        containerStyle={$textField}
        style={$textFieldInside}
        onFocus={toggleModal}
        labelTx="eventoScreen.publicoTF"
      />

      <Modal visible={isModalVisible} onRequestClose={toggleModal} transparent={true}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle} weight="bold">Selecciona grupos</Text>
          <View style={styles.modalSeparator} />
          <FlatList
            data={gruposArr}
            keyExtractor={keyExtractor}
            renderItem={renderNameItem}
          />
          <Button text="Listo" onPress={onDone} preset="filled" style={styles.modalButton} />
        </View>
      </Modal>

      <TextField
        value={eventoDescripcion}
        onChangeText={setEventoDescripcion}
        containerStyle={$textField}
        style={$textFieldInside}
        autoCapitalize="sentences"
        autoCorrect={false}
        multiline={true}
        numberOfLines={2}
        keyboardType="default"
        labelTx="eventoScreen.descripcionTF"
      />

    <View style={$switchContainer}>
      <Text style={$labelStyle}>¿Confirmar asistencia?</Text>
      <Switch
        trackColor={{ false: colors.palette.neutral400, true: colors.palette.grassLight }}
        thumbColor={requireConfirmation ? colors.palette.grassDark : colors.palette.neutral200}
        onValueChange={() => setRequireConfirmation(prev => !prev)}
        value={requireConfirmation}
      />
    </View>

      {isSubmitted ?
        <View style={$spinnerContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
        :
        <Button
          testID="login-button"
          text={mainBttnLabel}
          style={$tapButton}
          textStyle={[{ fontSize: 20, fontWeight: "bold" }]}
          preset="reversed"
          onPress={mainBttnPressed}
        />
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

const $labelStyle: TextStyle = {
  marginBottom: spacing.extraSmall,
  color: colors.palette.neutral900,
  fontSize: 16,
  fontWeight: "bold",
}

const $textField: ViewStyle = {
  marginTop: spacing.small,
  marginBottom: spacing.small,
  borderColor: colors.palette.bluejeansDark,
}

const $textFieldInside: ViewStyle = {
  paddingLeft: 6,
  height: 32
}

const $switchContainer: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  marginTop: spacing.medium,
  marginBottom: spacing.medium,
}

const $tapButton: ViewStyle = {
  backgroundColor: colors.palette.grassLight,
  borderRadius: 80,
  borderColor: colors.palette.grassDark,
  borderBottomWidth: 4,
  marginTop: 26,
  marginBottom: spacing.extraLarge
}

const $datePickerRow: ViewStyle = {
  flexDirection: "row",
  justifyContent: "flex-start",
  marginTop: 4,
  marginBottom: 8
}

const $spinnerContainer: ViewStyle = {
  marginTop: spacing.large
}

const styles = StyleSheet.create({
  modalContent: {
    flex: 1,
    height: 470,
    borderRadius: 12,
    backgroundColor: colors.palette.neutral100,
    marginVertical: 120,
    marginHorizontal: 40,
    padding: 16
  },
  modalTitle: {
    fontSize: 18,
    marginBottom: 10,
    color: colors.palette.neutral600
  },
  modalSeparator: {
    height: 1,
    backgroundColor: colors.palette.neutral300
  },
  modalButton: {
    backgroundColor: colors.palette.actionYellow, 
    marginHorizontal: 40, 
    borderRadius: 20
  },
  item: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.palette.neutral300,
  },
  selectedItem: {
    backgroundColor: colors.palette.sunflowerClear,
    color: 'white'
  },
});
