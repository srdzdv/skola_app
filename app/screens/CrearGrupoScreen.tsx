import React, { FC, useState, useEffect } from "react"
import * as ParseAPI from "../services/parse/ParseAPI"
import {Picker} from '@react-native-picker/picker';
import { useStores } from "../models"
import { observer } from "mobx-react-lite"
import { ViewStyle, TextStyle, ActivityIndicator, View, Alert, Modal, TouchableOpacity } from "react-native"
import { AppStackScreenProps } from "app/navigators"
import { Screen, Text, TextField, Button } from "app/components"
import * as Haptics from 'expo-haptics';
import { colors, spacing } from "../theme"

interface CrearGrupoScreenProps extends AppStackScreenProps<"CrearGrupo"> {}

export const CrearGrupoScreen: FC<CrearGrupoScreenProps> = observer(function CrearGrupoScreen({ route, navigation }) {
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [nombre, setNombre] = useState("")
  const [grupoAbrv, setGrupoAbrv] = useState("")
  const [niveles, setNiveles] = useState([])
  const [isPickerVisible, setIsPickerVisible] = useState(false)
  const [nivel, setNivel] = useState({name: "", id: ""})

  const {
    authenticationStore: {
      authUserEscuela,
    },
  } = useStores()



  useEffect(() => {
    setupComponents()
    fetchNiveles()
  }, [])

  function setupComponents() {
    // Header
    navigation.setOptions({
      title: "Crear Grupo Nuevo",
      headerBackTitleVisible: false,
    })
  }

  async function fetchNiveles() {
    let res = await ParseAPI.fetchNiveles(authUserEscuela)
    setNiveles(res)
  }

  function handleNivelSelection(itemId: string) {
    const selectedNivel= niveles.find(item => item.id === itemId);
    const nivelObj = {name: selectedNivel.get("nombre"), id: selectedNivel.id}
    setNivel(nivelObj);
    setIsPickerVisible(false);
  }

  function saveBttnPressed() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
    if (nombre.length > 0 && grupoAbrv.length > 0 && nivel.name.length > 0) {
      setIsSubmitted(true)
      storeGrupo()
    } else {
      presentFeedback("Campos Vacíos", "Ingresa datos en todos los campos para guardar.")
    }
  }

  async function storeGrupo() {
    let res = await ParseAPI.createGrupo(nombre, grupoAbrv, nivel.id, authUserEscuela)
    console.log("res: " + res)
    setIsSubmitted(false)
    if (route.params.reloadList != null) {
      route.params.reloadList()
    }
    presentFeedback("Grupo Guardado", "El grupo ha sido guardado exitosamente.")
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
        labelTx="crearGrupo.nombreTF"
      />

      <TextField
        value={grupoAbrv}
        onChangeText={setGrupoAbrv}
        containerStyle={$textField}
        inputWrapperStyle={$inputContainer}
        autoCapitalize="characters"
        autoCorrect={false}
        keyboardType="default"
        placeholderTx="crearGrupo.grupoIdPlaceholder"
        labelTx="crearGrupo.grupoIdTF"
      />

      <Text tx="crearGrupo.nivelTF" style={{  marginTop: spacing.extraSmall,}} />
      {niveles.length > 0 &&
        <>
          <TouchableOpacity style={$inputField} onPress={() => {setIsPickerVisible(true)}}>
            <Text style={{paddingTop: 5, color: nivel.name.length > 0 ? "black" : "gray"}}>{nivel.name.length > 0 ? nivel.name : "Nivel..."}</Text>
          </TouchableOpacity>
          <Modal
              transparent={true}
              visible={isPickerVisible}
              onRequestClose={() => setIsPickerVisible(false)}
          >
            <View style={$modalOverlay}>
            <View style={$pickerContainer}>
                <Picker
                  selectedValue={nivel}
                  onValueChange={(itemId, itemIndex) => {
                    handleNivelSelection(itemId)
                  }
                }>
                  <Picker.Item label="Seleccione un nivel" value="" />
                    {niveles.map((grupoObj, index) => (
                      <Picker.Item label={grupoObj.get("nombre")} value={grupoObj.id} />
                    ))}
                </Picker>
            </View>
            </View>
          </Modal>
        </>
      }

      {isSubmitted ? 
        <View style={{marginTop: spacing.extraLarge}}>
          <ActivityIndicator size="large" color="#007AFF" /> 
        </View>
        :
        <Button
          testID="login-button"
          text={"Guardar"}
          style={$tapButton}
          textStyle={[{ fontSize: 20, fontWeight: "bold" }]}
          preset="reversed"
          onPress={saveBttnPressed}
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

const $textField: ViewStyle = {
  marginTop: spacing.small,
  marginBottom: spacing.small,
  borderColor: colors.palette.bluejeansDark,
}

const $tapButton: ViewStyle = {
  backgroundColor: colors.palette.grassLight,
  borderRadius: 80,
  borderColor: colors.palette.grassDark,
  borderBottomWidth: 4,
  marginTop: 50,
  marginBottom: spacing.extraLarge
}

const $pickerContainer: ViewStyle = {
  backgroundColor: 'white',
  width: '80%',
  borderRadius: 4,
}

const $modalOverlay: ViewStyle = {
  flex: 1,
  justifyContent: 'center',
  alignItems: 'center',
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
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

const $inputField: ViewStyle = {
  height: 36,
  borderColor: colors.palette.neutral300,
  borderWidth: 1,
  paddingLeft: 8,
  margin: 4,
  borderRadius: 10,
};