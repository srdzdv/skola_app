import React, { FC, useState, useEffect } from "react"
import { observer } from "mobx-react-lite"
import { ViewStyle, View, Alert, ActivityIndicator, TextStyle, TouchableOpacity, FlatList, Keyboard, Platform } from "react-native"
import { AppStackScreenProps } from "app/navigators"
import { Screen, Text, TextField, Button } from "app/components"
import { colors, spacing } from "app/theme"
import * as ParseAPI from "app/services/parse/ParseAPI"
import * as Haptics from 'expo-haptics'
import { useStores } from "app/models"

interface CrearPagoScreenProps extends AppStackScreenProps<"CrearPago"> {}

// Define a type for the Parse student object
interface EstudianteObject {
  get(key: string): any
  id: string
}

export const CrearPagoScreen: FC<CrearPagoScreenProps> = observer(function CrearPagoScreen({ navigation }) {
  const [estudiante, setEstudiante] = useState("")
  const [concepto, setConcepto] = useState("")
  const [cantidad, setCantidad] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [estudiantes, setEstudiantes] = useState<EstudianteObject[]>([])
  const [estudianteObj, setEstudianteObj] = useState<EstudianteObject | null>(null)
  const [showResults, setShowResults] = useState(false)

  const {
    authenticationStore: {
      authUserEscuela
    },
  } = useStores()

  useEffect(() => {
    navigation.setOptions({
      headerBackTitleVisible: false,
      headerTitle: "Crear Pago",
    });

    if (estudiante.length > 2) {
      searchEstudiantes()
    } else {
      setShowResults(false)
    }
  }, [estudiante])

  async function searchEstudiantes() {
    setIsSearching(true)
    const estudiantesRes = await ParseAPI.fetchEstudiantes(authUserEscuela)
    if (estudiantesRes != null) {
      const filteredData = estudiantesRes.filter((item: EstudianteObject) => {
        const itemName = (item.get('NOMBRE') + " " + item.get('ApPATERNO') + " " + item.get('ApMATERNO')).toLowerCase()
        const searchLower = estudiante.toLowerCase()
        return itemName.includes(searchLower)
      })
      setEstudiantes(filteredData)
      setShowResults(filteredData.length > 0)
    }
    setIsSearching(false)
  }

  function handleEstudianteSelect(item: EstudianteObject) {
    const nombreCompleto = item.get('NOMBRE') + " " + item.get('ApPATERNO') + " " + item.get('ApMATERNO')
    setEstudiante(nombreCompleto)
    setEstudianteObj(item)
    setShowResults(false)
    Keyboard.dismiss()
  }

  function validateForm() {
    if (!estudianteObj) {
      presentFeedback("Error", "Por favor selecciona un estudiante de la lista")
      return false
    }
    if (!concepto.trim()) {
      presentFeedback("Error", "El concepto del pago es requerido")
      return false
    }
    if (!cantidad.trim() || isNaN(parseFloat(cantidad)) || parseFloat(cantidad) <= 0) {
      presentFeedback("Error", "Ingresa una cantidad válida para el pago")
      return false
    }
    return true
  }

  function presentFeedback(title: string, message: string) {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
    Alert.alert(title, message)
  }

  async function handleCrearPago() {
    if (!validateForm()) return

    setIsLoading(true)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)

    try {
      const pagoData = {
        estudianteObj: estudianteObj,
        concepto: concepto,
        cantidad: parseFloat(cantidad),
      }
      
      const result = await ParseAPI.savePago(pagoData, authUserEscuela);
      
      if (result) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
        Alert.alert(
          "Pago Creado", 
          "El pago se ha guardado exitosamente.", 
          [{ text: "OK", onPress: () => navigation.goBack() }]
        )
      } else {
        presentFeedback("Error", "No fue posible guardar el pago. Intenta de nuevo.")
      }
    } catch (error) {
      console.error(error)
      presentFeedback("Error", "Ocurrió un error al guardar el pago.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Screen style={$root} preset="scroll">
      <View style={$container}>
        <Text preset="heading" text="Pago Nuevo" style={$title} />
        
        <View style={$inputContainer}>
          <Text preset="formLabel" text="Estudiante" />
          <TextField
            placeholder="Buscar estudiante..."
            value={estudiante}
            onChangeText={setEstudiante}
            autoCapitalize="words"
            containerStyle={$textField}
            style={$textFieldInput}
          />
          {isSearching && <ActivityIndicator style={$spinner} size="small" color={colors.palette.neutral800} />}
          
          {showResults && (
            <View style={$resultsContainer}>
              <FlatList
                data={estudiantes}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity 
                    style={$resultItem} 
                    onPress={() => handleEstudianteSelect(item)}
                  >
                    <Text>
                      {item.get('NOMBRE')} {item.get('ApPATERNO')} {item.get('ApMATERNO')}
                    </Text>
                  </TouchableOpacity>
                )}
                style={$resultsList}
              />
            </View>
          )}
        </View>
        
        <View style={$inputContainer}>
          <Text preset="formLabel" text="Concepto del pago" />
          <TextField
            placeholder="Ej. Colegiatura Mayo 2023"
            value={concepto}
            onChangeText={setConcepto}
            containerStyle={$textField}
            style={$textFieldInput}
          />
        </View>
        
        <View style={$inputContainer}>
          <Text preset="formLabel" text="Cantidad (MXN)" />
          <TextField
            placeholder="Ej. 1500.00"
            value={cantidad}
            onChangeText={setCantidad}
            keyboardType="numeric"
            containerStyle={$textField}
            style={$textFieldInput}
          />
        </View>
        
        <Button
          text="Crear Pago"
          preset="filled"
          style={$button}
          onPress={handleCrearPago}
          disabled={isLoading}
        />
        
        {isLoading && <ActivityIndicator style={$spinner} size="large" color={colors.palette.neutral800} />}
      </View>
    </Screen>
  )
})

const $root: ViewStyle = {
  flex: 1,
  backgroundColor: colors.background,
}

const $container: ViewStyle = {
  flex: 1,
  padding: spacing.medium,
}

const $title: TextStyle = {
  marginBottom: spacing.large,
  textAlign: "center",
  color: colors.palette.neutral600,
}

const $inputContainer: ViewStyle = {
  marginBottom: spacing.medium,
}

const $textField: ViewStyle = {
  marginBottom: spacing.extraSmall,
}

const $textFieldInput: TextStyle = {
  paddingLeft: 8,
}

const $button: ViewStyle = {
  alignSelf: "center",
  marginTop: spacing.extraLarge,
  marginBottom: spacing.extraLarge,
  padding: 4,
  width: 250,
  borderRadius: 100,
  backgroundColor: colors.palette.bluejeansLight,
  borderColor: colors.palette.bluejeansDark,
  borderBottomWidth: Platform.OS == 'ios' ? 4 : 0
}

const $spinner: ViewStyle = {
  marginVertical: spacing.medium,
  alignSelf: "center",
}

const $resultsContainer: ViewStyle = {
  maxHeight: 200,
  marginTop: -spacing.extraSmall,
  marginBottom: spacing.medium,
  borderWidth: 1,
  borderColor: colors.palette.neutral400,
  borderRadius: 4,
  backgroundColor: colors.palette.neutral100,
}

const $resultsList: ViewStyle = {
  maxHeight: 200,
}

const $resultItem: ViewStyle = {
  padding: spacing.extraSmall,
  borderBottomWidth: 1,
  borderBottomColor: colors.palette.neutral300,
}
