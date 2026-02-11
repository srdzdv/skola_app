import React, { FC, useState, useEffect, useRef } from "react"
import * as ParseAPI from "../services/parse/ParseAPI"
import * as AWSService from '../services/AWSService'
import * as DocumentPicker from 'expo-document-picker';
import { useStores } from "../models"
import { observer } from "mobx-react-lite"
import { ViewStyle, TextStyle, ActivityIndicator, View, Alert, TouchableOpacity, Image } from "react-native"
import { AppStackScreenProps } from "app/navigators"
import { Screen, Text, TextField, Button } from "app/components"
import * as Haptics from 'expo-haptics';
import { colors, spacing } from "../theme"

interface CrearInformacionScreenProps extends AppStackScreenProps<"CrearInformacion"> {}

// Define the type for route params
type CrearInformacionParams = {
  reloadList?: () => void;
}

export const CrearInformacionScreen: FC<CrearInformacionScreenProps> = observer(function CrearInformacionScreen({ route, navigation }) {
  const params = route.params as CrearInformacionParams | undefined
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [nombre, setNombre] = useState("")
  const [descripcion, setDescripcion] = useState("")
  const [docURI, setDocURI] = useState("")
  const [docName, setDocName] = useState("")
  const [docSize, setDocSize] = useState(0)
  const [isDocumentSelected, setIsDocumentSelected] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  const MAX_FILE_SIZE = 6 * 1024 * 1024 // 6MB in bytes

  // Ref to avoid stale closure issues
  const docURIRef = useRef<string>("")
  useEffect(() => {
    docURIRef.current = docURI
  }, [docURI])

  const {
    authenticationStore: {
      authUserEscuela,
    },
  } = useStores()


  useEffect(() => {
    setupComponents()
  }, [])

  function setupComponents() {
    // Header
    navigation.setOptions({
      title: "Crear Información",
      headerBackTitleVisible: false,
    })
  }

  function saveBttnPressed() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
    if (nombre.length > 0) {
      if (!isDocumentSelected) {
        presentFeedback("PDF Requerido", "Por favor adjunta un archivo PDF antes de guardar.")
        return
      }
      setIsSubmitted(true)
      storeInformacion()
    } else {
      presentFeedback("Campos Vacíos", "Ingresa datos en todos los campos para guardar.")
    }
  }

  async function storeInformacion() {
    try {
      setIsUploading(true)
      setUploadProgress(10)

      const resObjId = await ParseAPI.saveInformacion(authUserEscuela, nombre, descripcion)
      console.log("Parse object created with id:", resObjId)

      if (!resObjId || resObjId.length !== 10) {
        throw new Error("Failed to create Parse object")
      }

      setUploadProgress(30)

      const uploadRes = await uploadFileToAWSS3(resObjId)
      console.log("**uploadRes:", JSON.stringify(uploadRes))

      setUploadProgress(100)
      setIsUploading(false)
      onUploadComplete()
    } catch (error) {
      console.error("Error storing information:", error)
      setIsUploading(false)
      setIsSubmitted(false)

      let errorMessage = "Ocurrió un error al guardar. Por favor intenta de nuevo."
      if (error instanceof Error) {
        if (error.message.includes("network") || error.message.includes("Network")) {
          errorMessage = "Error de conexión. Verifica tu conexión a internet e intenta de nuevo."
        } else if (error.message.includes("PDF upload failed")) {
          errorMessage = "No fue posible subir el PDF. Por favor intenta de nuevo."
        }
      }

      presentFeedback("Error", errorMessage)
    }
  }

  async function selectPDF() {
    try {
      // On Android, we MUST copy to cache directory to get a reliable file:// URI
      // content:// URIs have restricted access and cause upload failures
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true  // Critical for Android - ensures we get a file:// URI
      });

      if (!result.canceled && result.assets.length > 0) {
        const docData = result.assets[0]

        // Check file size
        if (docData.size && docData.size > MAX_FILE_SIZE) {
          presentFeedback(
            "Archivo demasiado grande",
            "El tamaño máximo permitido es 6 MB. Por favor selecciona un archivo más pequeño."
          )
          return
        }

        console.log('Name:', docData.name)
        console.log('Size:', docData.size)
        console.log('URI:', docData.uri)

        setDocURI(docData.uri)
        setDocName(docData.name)
        setDocSize(docData.size || 0)
        setIsDocumentSelected(true)
      } else {
        console.log('No file selected')
      }
    } catch (err) {
      console.error('Error picking document:', err)
      presentFeedback(
        "Error al seleccionar documento",
        "No fue posible seleccionar el documento PDF. Por favor intenta de nuevo."
      )
    }
  }

  async function uploadFileToAWSS3(objectId: string) {
    // Use ref to get latest docURI value (avoids stale closure issues)
    const currentDocURI = docURIRef.current

    if (!currentDocURI || currentDocURI.length === 0) {
      throw new Error("No PDF file URI available")
    }

    console.log("Uploading PDF from URI:", currentDocURI)
    const uploadRes = await AWSService.uploadImageDataToAWS(objectId, currentDocURI, "application/pdf", false)
    console.log("**AWSS3_result:", JSON.stringify(uploadRes))

    if (!uploadRes || !uploadRes.success) {
      throw new Error("PDF upload failed")
    }

    return uploadRes
  }

  function onUploadComplete() {
    setIsSubmitted(false)
    runCloudCodeFunction()
    if (params?.reloadList) {
      params.reloadList()
    }
    presentFeedback("Documento Guardado", "El PDF ha sido guardado exitosamente.")
  }

  function runCloudCodeFunction() {
    // Cloud
    let cloudFuncName = "informacionParentNotification"
    const params = {infoType: nombre, escuelaObjId: authUserEscuela}
    ParseAPI.runCloudCodeFunction(cloudFuncName, params)
  }

  function presentFeedback(alertTitle: string, alertMessage: string) {
    Alert.alert(
      alertTitle,
      alertMessage,
      [
        {text: 'Ok', onPress: () => {}, style: 'default'},
      ],
      {cancelable: false},
    );
  }

  function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
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
        labelTx="informacionScreen.nombreTF"
        placeholderTx="informacionScreen.nombrePlaceholder"
      />

      <TextField
        value={descripcion}
        onChangeText={setDescripcion}
        containerStyle={$textField}
        inputWrapperStyle={$inputContainer}
        autoCapitalize="sentences"
        autoCorrect={false}
        keyboardType="default"
        labelTx="informacionScreen.descripcionTF"
        placeholderTx="informacionScreen.descripcionPlaceholder"
      />

      <View style={$uploadContainer}>
        <Text style={$uploadTitle}>Documento PDF</Text>
        <Text style={$uploadSubtitle}>Tamaño máximo: 6 MB</Text>
        
        {isDocumentSelected ? (
          <View style={$fileInfoContainer}>
            <View style={$fileDetails}>
              <Text style={$fileName}>{docName}</Text>
              <Text style={$fileSize}>{formatFileSize(docSize)}</Text>
            </View>
            <TouchableOpacity 
              style={$changeFileButton} 
              onPress={selectPDF}
            >
              <Text style={$changeFileText}>Cambiar</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity 
            style={$uploadButton} 
            onPress={selectPDF}
          >
            <Text style={$uploadButtonText}>Adjuntar PDF</Text>
          </TouchableOpacity>
        )}
      </View>

      {isUploading ? (
        <View style={$progressContainer}>
          <View style={[$progressBar, { width: `${uploadProgress}%` }]} />
          <Text style={$progressText}>Subiendo PDF: {uploadProgress}%</Text>
        </View>
      ) : null}

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

const $inputContainer: ViewStyle = {
  height: 36, 
  borderColor: colors.palette.neutral300,
  borderWidth: 1,
  margin: 4,
  borderRadius: 10,
  paddingLeft: 8, 
  paddingTop: 4
}

const $uploadContainer: ViewStyle = {
  marginTop: spacing.medium,
  borderWidth: 1,
  borderColor: colors.palette.neutral300,
  borderRadius: 10,
  padding: spacing.small,
  backgroundColor: colors.background,
}

const $uploadTitle: TextStyle = {
  fontWeight: "bold",
  fontSize: 16,
  marginBottom: 4,
}

const $uploadSubtitle: TextStyle = {
  fontSize: 12,
  color: colors.palette.neutral600,
  marginBottom: spacing.small,
}

const $uploadButton: ViewStyle = {
  backgroundColor: colors.palette.actionBlue,
  padding: spacing.small,
  borderRadius: 8,
  alignItems: "center",
  marginVertical: spacing.small,
}

const $uploadButtonText: TextStyle = {
  color: colors.palette.neutral100,
  fontWeight: "bold",
}

const $fileInfoContainer: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  backgroundColor: colors.palette.neutral200,
  padding: spacing.small,
  borderRadius: 8,
  marginVertical: spacing.small,
}

const $fileDetails: ViewStyle = {
  flex: 1,
}

const $fileName: TextStyle = {
  fontWeight: "600",
  fontSize: 14,
}

const $fileSize: TextStyle = {
  fontSize: 12,
  color: colors.palette.neutral600,
  marginTop: 2,
}

const $changeFileButton: ViewStyle = {
  backgroundColor: colors.palette.actionBlue,
  paddingVertical: 6,
  paddingHorizontal: 12,
  borderRadius: 6,
  marginLeft: 8,
}

const $changeFileText: TextStyle = {
  color: colors.palette.neutral100,
  fontWeight: "500",
  fontSize: 12,
}

const $progressContainer: ViewStyle = {
  padding: 10,
  marginTop: spacing.medium,
  marginBottom: 10,
  borderRadius: 8,
  backgroundColor: colors.palette.neutral200,
  borderColor: colors.palette.neutral300,
  borderWidth: 1,
}

const $progressBar: ViewStyle = {
  height: 20,
  borderRadius: 10,
  backgroundColor: colors.palette.grassLight,
  marginBottom: 10,
}

const $progressText: TextStyle = {
  fontSize: 14,
  fontWeight: "bold",
  color: colors.palette.neutral800,
  textAlign: "center",
}