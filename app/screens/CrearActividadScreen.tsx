import React, { FC, useState, useEffect, useCallback, memo, useRef } from "react"
import { useStores } from "../models"
import { observer } from "mobx-react-lite"
import { Entypo } from '@expo/vector-icons'
import * as DocumentPicker from 'expo-document-picker'
import {
  View,
  ViewStyle,
  TextStyle,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
  Dimensions,
  Modal,
  FlatList,
  StyleSheet,
  Pressable,
} from "react-native"
import { NativeStackScreenProps } from "@react-navigation/native-stack"
import { AppStackScreenProps } from "app/navigators"
import { Screen, Text, Button } from "app/components"
import { colors, spacing } from "../theme"
import * as ParseAPI from "../services/parse/ParseAPI"
import * as AWSService from '../services/AWSService'
import ImageAttachment, { MediaAsset } from '../components/ImageAttachment'
import * as Haptics from 'expo-haptics'
import * as SQLiteAPI from "../services/sqlite/SQLiteAPI"

// Hoisted constants
const ATTACHMENT_WIDTH = Dimensions.get('window').width * 0.9

interface CrearActividadScreenProps extends NativeStackScreenProps<AppStackScreenProps<"CrearActividad">> {}

interface GrupoItem {
  id: string
  name: string
}

// Memoized list item component for better FlatList performance
const GrupoListItem = memo(function GrupoListItem({
  name,
  isSelected,
  onToggle,
}: {
  name: string
  isSelected: boolean
  onToggle: (name: string) => void
}) {
  const handlePress = useCallback(() => {
    onToggle(name)
  }, [name, onToggle])

  return (
    <Pressable
      onPress={handlePress}
      style={[styles.item, isSelected ? styles.selectedItem : null]}
    >
      <Text style={isSelected ? $selectedItemText : $unselectedItemText}>{name}</Text>
    </Pressable>
  )
})

export const CrearActividadScreen: FC<CrearActividadScreenProps> = observer(function CrearActividadScreen({ route, navigation }) {
  const [actividadId, setActividadId] = useState("")
  const [actividadType, setActividadType] = useState("")
  const [grupoName, setGrupoName] = useState("")
  const [grupo, setGrupo] = useState<any>(null)
  const [tfValue, onChangeText] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [currUserType, setCurrUserType] = useState(9)
  const [currUserEscuelaId, setCurrUserEscuelaId] = useState("")
  const [tipoAnuncio, setTipoAnuncio] = useState<any>(null)
  const [media, setMedia] = useState("")
  const [mediaURL, setMediaURL] = useState("")
  const [estudianteId, setEstudianteId] = useState<string | null>(null)
  const [nivelGrupos, setNivelGrupos] = useState<any[] | null>(null)
  const [docURI, setDocURI] = useState("")
  const [docName, setDocName] = useState("")
  const [mimeType, setMimeType] = useState("")
  const [gruposArr, setGruposArr] = useState<GrupoItem[]>([])
  const [selectedGrupos, setSelectedGrupos] = useState<string[]>([])
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  const [isModalVisible, setModalVisible] = useState(false)
  const [isPublicoVisible, setPublicoVisible] = useState(false)
  // New state for multiple images
  const [multipleImages, setMultipleImages] = useState<MediaAsset[]>([])

  // Ref to always have access to the latest multipleImages (avoids stale closure issues)
  const multipleImagesRef = useRef<MediaAsset[]>([])
  useEffect(() => {
    multipleImagesRef.current = multipleImages
  }, [multipleImages])

  // Ref for docURI to avoid stale closure issues
  const docURIRef = useRef<string>("")
  useEffect(() => {
    docURIRef.current = docURI
  }, [docURI])

  // Ref for mimeType to avoid stale closure issues
  const mimeTypeRef = useRef<string>("")
  useEffect(() => {
    mimeTypeRef.current = mimeType
  }, [mimeType])

  // Ref for media to avoid stale closure issues
  const mediaRef = useRef<string>("")
  useEffect(() => {
    mediaRef.current = media
  }, [media])

  // Ref for mediaURL to avoid stale closure issues
  const mediaURLRef = useRef<string>("")
  useEffect(() => {
    mediaURLRef.current = mediaURL
  }, [mediaURL])

  const {
    authenticationStore: {
      authUserEscuela
    },
  } = useStores()

  // Thread support: if a threadId is passed, the new message will be linked to the thread
  const [threadId, setThreadId] = useState<string | null>(null)

  useEffect(() => {
    getCurrentUserType()
    const actividadTypeParam = route.params["actividadType"]
    let grupoNameParams = "toda la Escuela"
    if (route.params["grupoName"] !== "all") {
      grupoNameParams = route.params["grupoName"]
    }

    if (route.params["estudianteId"] != null) {
      setEstudianteId(route.params["estudianteId"])
    }
    if (route.params["grupoId"] != null) {
      const grupoIdParams = route.params["grupoId"]
      getGrupo(grupoIdParams)
    }
    if (route.params["nivelId"] != null) {
      fetchGruposFromServer(route.params["nivelId"])
    }
    if (route.params["msgPreview"] != null) {
      onChangeText(route.params["msgPreview"])
    }
    if (route.params["threadId"] != null) {
      setThreadId(route.params["threadId"])
    }

    let actividadTypeString = ""
    switch (actividadTypeParam) {
      case 0:
        actividadTypeString = "Tarea"
        break
      case 1:
        actividadTypeString = "Anuncio"
        break
      case 2:
        actividadTypeString = "Momentos"
        break
      case 3:
        actividadTypeString = "Planeacion"
        break
      case 4:
        actividadTypeString = "Mensaje"
        break
      default:
        actividadTypeString = "Actividad"
        break
    }

    const navBarTitle = "Crear " + actividadTypeString + " para " + grupoNameParams
    navigation.setOptions({
      title: navBarTitle,
    })

    getTipoAnuncio(actividadTypeString)
    setActividadId(String(actividadTypeParam))
    setActividadType(actividadTypeString)
    setGrupoName(grupoNameParams)
    const tempSelectedGrupos = [grupoNameParams]
    setSelectedGrupos(tempSelectedGrupos)
  }, [actividadId])

  useEffect(() => {
    fetchDBGrupos()
  }, [])

  async function getCurrentUserType() {
    const currentUser = await ParseAPI.getCurrentUserObj()
    const userType = currentUser.get('usertype')
    const userEscuela = currentUser.get('escuela')
    setCurrUserType(userType)
    setCurrUserEscuelaId(userEscuela.id)
  }

  async function getTipoAnuncio(actividadNombre: string) {
    const tipoAnuncioRes = await ParseAPI.getTipoAnuncio(actividadNombre)
    setTipoAnuncio(tipoAnuncioRes)
  }

  async function getGrupo(grupoId: string) {
    const grupoObj = await ParseAPI.fetchGrupo(grupoId)
    setGrupo(grupoObj)
  }

  async function fetchGruposFromServer(nivelId: string) {
    if (nivelId === 'all') {
      const escuelaObj = await ParseAPI.fetchUserEscuela(authUserEscuela)
      const gruposRes = await ParseAPI.fetchGrupos(escuelaObj)
      setNivelGrupos(gruposRes)
    } else {
      const gruposRes = await ParseAPI.fetchGruposOfNivel(nivelId)
      setNivelGrupos(gruposRes)
    }
  }

  async function fetchDBGrupos() {
    const dbResults: any[] = await SQLiteAPI.readDBPromise("Grupo", "WHERE TRUE", [])
    const tempGruposArr: GrupoItem[] = []
    if (dbResults.length > 0) {
      for (const grupoItem of dbResults) {
        const dataObj: GrupoItem = {
          id: grupoItem.objectId,
          name: grupoItem.name
        }
        tempGruposArr.push(dataObj)
      }
      setGruposArr(tempGruposArr)
    }
  }

  const toggleModal = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    setPublicoVisible(true)
    setModalVisible(prev => !prev)
  }, [])

  const toggleSelection = useCallback((name: string) => {
    setSelectedGrupos(prev =>
      prev.includes(name)
        ? prev.filter(item => item !== name)
        : [...prev, name]
    )
  }, [])

  // Hoisted renderItem with proper memoization
  const renderNameItem = useCallback(({ item }: { item: GrupoItem }) => {
    return (
      <GrupoListItem
        name={item.name}
        isSelected={selectedGrupos.includes(item.name)}
        onToggle={toggleSelection}
      />
    )
  }, [selectedGrupos, toggleSelection])

  const onDone = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
    setGrupoName(selectedGrupos.join(', '))
    toggleModal()
  }, [selectedGrupos, toggleModal])

  const enviarButtonTapped = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
    if (tfValue.length > 0) {
      processDataForAnuncio()
    } else {
      Alert.alert('Mensaje vacio', 'Ingresa algun mensaje para poder enviar al grupo.', [
        { text: 'Ok' },
      ])
    }
  }, [tfValue])

  async function processDataForAnuncio() {
    setIsLoading(true)
    let isAnuncioAprobado = true
    if (currUserType === 1) {
      isAnuncioAprobado = false
    }

    if (route.params["estudiantesIdsArr"] != null && route.params["estudiantesIdsArr"].length > 0) {
      await sendMessagesToMultipleStudents(isAnuncioAprobado)
      return
    }

    let gruposSelectedArr: any[] = []
    if (nivelGrupos != null) {
      gruposSelectedArr = nivelGrupos
    } else if (grupo != null) {
      gruposSelectedArr = [grupo]
    }

    if (selectedGrupos.length > 1) {
      const tempGruposSelectedArr = selectedGrupos.map(selectedName =>
        gruposArr.find(g => g.name === selectedName)
      ).filter(g => g !== undefined)
      const selectedGrupoIds = tempGruposSelectedArr.map(g => g!.id)
      const tempGrupoObjArr: any[] = []
      for (const grupoId of selectedGrupoIds) {
        const grupoObj = await ParseAPI.fetchGrupo(grupoId)
        tempGrupoObjArr.push(grupoObj)
      }
      gruposSelectedArr = tempGrupoObjArr
    }

    const currentUser = await ParseAPI.getCurrentUserObj()
    // Check for multiple images or single media (use ref to get latest value)
    const currentMultipleImages = multipleImagesRef.current
    const currentDocURI = docURIRef.current
    const currentMediaURL = mediaURLRef.current
    const hasMultipleImages = currentMultipleImages.length > 0
    const hasSingleMedia = currentMediaURL.length > 0
    const hasDocument = currentDocURI.length > 0
    const awsAttachment = hasMultipleImages || hasSingleMedia || hasDocument
    const sentFrom = "skolaRN_" + Platform.OS
    const anuncioParams: Record<string, any> = {
      "aprobado": isAnuncioAprobado,
      "descripcion": tfValue,
      "autor": currentUser,
      "tipo": tipoAnuncio,
      "awsAttachment": awsAttachment,
      "materia": "",
      "sentFrom": sentFrom,
    }
    if (gruposSelectedArr.length > 0) {
      anuncioParams["grupos"] = gruposSelectedArr
    }
    saveActividadToServer(anuncioParams)
  }

  async function sendMessagesToMultipleStudents(isAnuncioAprobado: boolean) {
    const studentIds = route.params["estudiantesIdsArr"]
    const currentUser = await ParseAPI.getCurrentUserObj()
    // Use refs to get latest values (avoids stale closure issues)
    const currentMultipleImages = multipleImagesRef.current
    const currentDocURI = docURIRef.current
    const currentMediaURL = mediaURLRef.current
    const hasMultipleImages = currentMultipleImages.length > 0
    const hasSingleMedia = currentMediaURL.length > 0
    const hasDocument = currentDocURI.length > 0
    const awsAttachment = hasMultipleImages || hasSingleMedia || hasDocument
    const sentFrom = "skolaRN_" + Platform.OS

    let successCount = 0

    for (const studentId of studentIds) {
      const messageParams = {
        "aprobado": isAnuncioAprobado,
        "descripcion": tfValue,
        "autor": currentUser,
        "tipo": tipoAnuncio,
        "awsAttachment": awsAttachment,
        "materia": "",
        "sentFrom": sentFrom,
      }

      const result = await ParseAPI.saveAnuncioObject(messageParams, null, studentId, null)

      if (result && result.length === 10) {
        successCount++
        runCloudCodeFunction(result)

        // Handle multiple images upload
        if (currentMultipleImages.length > 0) {
          await uploadMultipleImages(result)
        } else if (currentMediaURL.length > 0) {
          await saveAttachmentToParse(result, false)
        } else if (currentDocURI.length > 0) {
          await saveAttachmentToParse(result, true)
        }
      }
    }

    if (successCount > 0) {
      presentFeedback("Mensajes Enviados", `${successCount} de ${studentIds.length} mensajes fueron enviados exitosamente.`)

      if (route.params.reloadList != null) {
        route.params.reloadList()
      }
      if (route.params.reloadTable != null) {
        route.params.reloadTable(2)
      }

      successFeedback()
    } else {
      setIsLoading(false)
      Alert.alert("Ocurrio un error", "No fue posible enviar los mensajes. Intenta de nuevo, por favor.")
    }
  }

  function presentFeedback(alertTitle: string, alertMessage: string) {
    Alert.alert(
      alertTitle,
      alertMessage,
      [{ text: 'Ok' }],
      { cancelable: false }
    )
  }

  async function saveActividadToServer(params: Record<string, any>) {
    // Use thread-aware save for direct messages (actividadType 4)
    let anuncioResult: string
    if (actividadId === "4" || threadId != null) {
      anuncioResult = await ParseAPI.saveAnuncioWithThread(params, grupo, estudianteId, nivelGrupos, threadId)
    } else {
      anuncioResult = await ParseAPI.saveAnuncioObject(params, grupo, estudianteId, nivelGrupos)
    }
    if (anuncioResult.length === 10) {
      if (route.params.reloadList != null) {
        route.params.reloadList()
      }
      if (route.params.reloadTable != null) {
        route.params.reloadTable(2)
      }
      runCloudCodeFunction(anuncioResult)

      // Handle multiple images upload (use refs to get latest values)
      const currentMultipleImages = multipleImagesRef.current
      const currentDocURI = docURIRef.current
      const currentMediaURL = mediaURLRef.current
      console.log("saveActividadToServer - checking attachments: multipleImages:", currentMultipleImages.length, "mediaURL:", currentMediaURL.length, "docURI:", currentDocURI.length)
      if (currentMultipleImages.length > 0) {
        console.log("-> Uploading multiple images")
        await uploadMultipleImages(anuncioResult)
      } else if (currentMediaURL.length > 0) {
        console.log("-> Uploading single media (image/video)")
        saveAttachmentToParse(anuncioResult, false)
      } else if (currentDocURI.length > 0) {
        console.log("-> Uploading PDF document, docURI:", currentDocURI)
        saveAttachmentToParse(anuncioResult, true)
      } else {
        console.log("-> No attachments to upload")
        successFeedback()
      }
    } else {
      Alert.alert("Ocurio un error. Por favor intenta de nuevo.")
    }
  }

  // New function to upload multiple images
  async function uploadMultipleImages(anuncioObjectId: string) {
    // Use ref to get latest images (avoids stale closure)
    const currentMultipleImages = multipleImagesRef.current

    try {
      setIsUploading(true)
      setUploadProgress(0)

      const totalImages = currentMultipleImages.length
      let uploadedCount = 0

      for (const imageAsset of currentMultipleImages) {
        const anuncioPhotoResult = await ParseAPI.saveAnuncioPhoto(anuncioObjectId, "JPG")
        if (anuncioPhotoResult.id) {
          await AWSService.uploadImageDataToAWS(
            anuncioPhotoResult.id,
            imageAsset.uri,
            imageAsset.mimeType,
            true
          )
          uploadedCount++
          const progress = Math.round((uploadedCount / totalImages) * 100)
          setUploadProgress(progress)
        }
      }

      setIsUploading(false)
      successFeedback()
    } catch (error) {
      console.error('Multiple image upload failed:', error)
      setIsUploading(false)
      setIsLoading(false)
      Alert.alert("Ocurrio un error al subir las imagenes. Por favor intenta de nuevo.")
    }
  }

  function successFeedback() {
    onChangeText("")
    setIsLoading(false)
    setMedia("")
    setMediaURL("")
    setMultipleImages([])
    setPublicoVisible(false)
    navigation.goBack()
    Alert.alert("Enviado exitosamente!")
  }

  function runCloudCodeFunction(anuncioId: string) {
    let cloudFuncName = "adminApprovedAnuncio"
    if (currUserType === 1) {
      cloudFuncName = "teacherAnuncioToBeApproved"
    }
    const params = { anuncioObjectId: anuncioId, escuelaObjId: currUserEscuelaId }
    ParseAPI.runCloudCodeFunction(cloudFuncName, params)
  }

  const attachmentButtonTapped = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
    Alert.alert('Adjuntar', 'Selecciona el tipo de documento que quieres adjuntar.', [
      { text: 'Imágenes', onPress: () => mediaSelected("multi_img") },
      { text: 'Video', onPress: () => mediaSelected("vid") },
      { text: 'PDF', onPress: () => mediaSelected("pdf") },
      { text: 'Cancelar', onPress: () => {}, style: 'cancel' },
    ],
    { cancelable: true })
  }, [])

  const mediaSelected = useCallback((mediaType: string) => {
    if (mediaType === "pdf") {
      selectPDF()
    } else if (mediaType === "multi_img") {
      setMedia("img")
      setMultipleImages([]) // Reset to trigger picker with multiple selection
    } else {
      setMedia(mediaType)
      setMultipleImages([])
    }
  }, [])

  async function selectPDF() {
    try {
      // On Android, we MUST copy to cache directory to get a reliable file:// URI
      // content:// URIs have restricted access and cause upload failures
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true  // Critical for Android - ensures we get a file:// URI
      })

      if (!result.canceled && result.assets.length > 0) {
        const docData = result.assets[0]

        // Validate file size (max 10MB for PDFs)
        const MAX_PDF_SIZE = 10 * 1024 * 1024 // 10MB
        if (docData.size && docData.size > MAX_PDF_SIZE) {
          Alert.alert(
            "Archivo muy grande",
            "El PDF no puede ser mayor a 10MB. Por favor selecciona un archivo más pequeño.",
            [{ text: "Ok" }]
          )
          return
        }

        setMimeType("application/pdf")
        setDocURI(docData.uri)
        const docNameStr = "Documento adjunto: " + docData.name
        setDocName(docNameStr)
      }
    } catch (err) {
      console.error('Error picking document:', err)
      Alert.alert(
        "Error al seleccionar documento",
        "No fue posible seleccionar el documento PDF. Por favor intenta de nuevo.",
        [{ text: "Ok" }]
      )
    }
  }

  const setAssetURL = useCallback((assetURL: string) => {
    setMediaURL(assetURL)
  }, [])

  const setMimeTypeCallback = useCallback((type: string) => {
    setMimeType(type)
  }, [])

  const handleMultipleImagesSelected = useCallback((assets: MediaAsset[]) => {
    setMultipleImages(assets)
  }, [])

  async function saveAttachmentToParse(anuncioObjectId: string, isPDF: boolean) {
    // Use ref to get latest media value (avoids stale closure issues)
    const currentMedia = mediaRef.current
    let mediaType = "JPG"
    if (currentMedia === "vid") {
      mediaType = "VID"
    }
    if (isPDF) {
      mediaType = "PDF"
    }
    console.log("saveAttachmentToParse - anuncioObjectId:", anuncioObjectId, "mediaType:", mediaType, "isPDF:", isPDF)

    try {
      const anuncioPhotoResult = await ParseAPI.saveAnuncioPhoto(anuncioObjectId, mediaType)
      console.log("saveAnuncioPhoto result:", anuncioPhotoResult, "id:", anuncioPhotoResult?.id)

      if (anuncioPhotoResult && anuncioPhotoResult.id) {
        if (currentMedia === "vid") {
          uploadVideo(anuncioPhotoResult.id)
        } else {
          console.log("Calling uploadFileToAWSS3 with id:", anuncioPhotoResult.id, "isPDF:", isPDF)
          uploadFileToAWSS3(anuncioPhotoResult.id, isPDF)
        }
      } else {
        console.error("ERROR: anuncioPhotoResult.id is undefined/null")
        setIsLoading(false)
        Alert.alert(
          "Error",
          "No fue posible crear el registro del archivo. Por favor intenta de nuevo.",
          [{ text: "Ok" }]
        )
      }
    } catch (error) {
      console.error("Error saving attachment to Parse:", error)
      setIsLoading(false)
      Alert.alert(
        "Error",
        "Ocurrió un error al preparar el archivo. Por favor intenta de nuevo.",
        [{ text: "Ok" }]
      )
    }
  }

  async function uploadFileToAWSS3(anuncioPhotoObjectId: string, isPDF: boolean) {
    const shouldResize = !isPDF  // Don't resize PDFs
    // Use ref to get latest mediaURL value (avoids stale closure issues)
    let assetURL = mediaURLRef.current
    if (isPDF) {
      assetURL = docURIRef.current
    }
    console.log("uploadFileToAWSS3 - objectId:", anuncioPhotoObjectId, "isPDF:", isPDF, "assetURL:", assetURL, "mimeType:", mimeTypeRef.current, "shouldResize:", shouldResize)

    // Validate that we have a valid URI
    if (!assetURL || assetURL.length === 0) {
      console.error("Upload failed: No asset URL provided")
      setIsLoading(false)
      Alert.alert(
        "Error",
        "No se encontró el archivo a subir. Por favor selecciona el archivo de nuevo.",
        [{ text: "Ok" }]
      )
      return
    }

    // Show upload progress for PDFs
    if (isPDF) {
      setIsUploading(true)
      setUploadProgress(0)
    }

    try {
      // Update progress to show we're starting
      if (isPDF) {
        setUploadProgress(10)
      }

      const uploadRes = await AWSService.uploadImageDataToAWS(anuncioPhotoObjectId, assetURL, mimeTypeRef.current, shouldResize)

      if (isPDF) {
        setUploadProgress(100)
      }

      if (uploadRes.resizedUpload) {
        console.log("Resized upload:", uploadRes.resizedUpload)
      }

      // Both Parse object and S3 upload succeeded
      if (isPDF) {
        setIsUploading(false)
      }
      successFeedback()
    } catch (error) {
      console.error('Upload failed:', error)
      setIsUploading(false)
      setIsLoading(false)

      // Provide specific error messages based on error type
      let errorMessage = "Ocurrió un error al subir el archivo. Por favor intenta de nuevo."

      if (error instanceof Error) {
        if (error.message.includes("network") || error.message.includes("Network")) {
          errorMessage = "Error de conexión. Verifica tu conexión a internet e intenta de nuevo."
        } else if (error.message.includes("timeout") || error.message.includes("Timeout")) {
          errorMessage = "La subida tardó demasiado. Verifica tu conexión e intenta de nuevo."
        } else if (error.message.includes("permission") || error.message.includes("Permission")) {
          errorMessage = "No se tiene permiso para acceder al archivo. Por favor selecciona el archivo de nuevo."
        } else if (error.message.includes("File not found") || error.message.includes("No such file")) {
          errorMessage = "El archivo no fue encontrado. Por favor selecciona el archivo de nuevo."
        }
      }

      Alert.alert("Error al subir archivo", errorMessage, [{ text: "Ok" }])
    }
  }

  const uploadVideo = async (anuncioPhotoObjectId: string) => {
    try {
      setIsLoading(true)
      setIsUploading(true)
      setUploadProgress(0)
      // Use ref to get latest mediaURL value (avoids stale closure issues)
      const videoUri = mediaURLRef.current
      const response = await fetch(videoUri)
      const blob = await response.blob()
      const CHUNK_SIZE = 5 * 1024 * 1024
      const totalSize = blob.size
      const chunks = Math.ceil(totalSize / CHUNK_SIZE)

      const initResult = await ParseAPI.runCloudCodeFunction("initiateMultipartUpload", {
        objectKey: anuncioPhotoObjectId,
        contentType: 'video/mp4'
      })

      // Handle new standardized response format
      if (!initResult || !initResult.success) {
        const errorMsg = initResult?.error?.message || 'No response from server'
        throw new Error(`Failed to initiate upload: ${errorMsg}`)
      }

      const uploadId = initResult.data.uploadId
      const uploadedParts: { PartNumber: number; ETag: string }[] = []

      for (let i = 0; i < chunks; i++) {
        const start = i * CHUNK_SIZE
        const end = Math.min(start + CHUNK_SIZE, totalSize)
        const chunk = blob.slice(start, end)

        const reader = new FileReader()
        const chunkBase64 = await new Promise((resolve, reject) => {
          reader.onloadend = () => resolve(reader.result)
          reader.onerror = reject
          reader.readAsDataURL(chunk)
        })

        let retries = 0
        const maxRetries = 3
        while (retries < maxRetries) {
          try {
            const partResult = await ParseAPI.runCloudCodeFunction("uploadPart", {
              objectKey: anuncioPhotoObjectId,
              uploadId: uploadId,
              partNumber: i + 1,
              data: chunkBase64,
              contentType: 'video/mp4'
            })

            // Handle new standardized response format
            if (!partResult || !partResult.success) {
              const errorMsg = partResult?.error?.message || 'No response from server'
              throw new Error(`Failed to upload part ${i + 1}: ${errorMsg}`)
            }

            uploadedParts.push({
              PartNumber: partResult.data.PartNumber,
              ETag: partResult.data.ETag
            })

            const progress = Math.round((i + 1) * 100 / chunks)
            setUploadProgress(progress)
            break

          } catch (error) {
            retries++
            if (retries === maxRetries) {
              throw new Error(`Failed to upload part ${i + 1} after ${maxRetries} attempts`)
            }
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, retries) * 1000))
          }
        }
      }

      const completeResult = await ParseAPI.runCloudCodeFunction("completeMultipartUpload", {
        objectKey: anuncioPhotoObjectId,
        uploadId: uploadId,
        parts: uploadedParts
      })

      // Handle new standardized response format
      if (!completeResult || !completeResult.success) {
        const errorMsg = completeResult?.error?.message || 'No response from server'
        throw new Error(`Failed to complete upload: ${errorMsg}`)
      }

      console.log("Video upload completed, location:", completeResult.data?.location)
      successFeedback()
      setIsUploading(false)
      return completeResult.data

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error during video upload'
      console.error('Video upload error:', errorMessage)
      Alert.alert('Error', errorMessage)
      setIsUploading(false)
      setIsLoading(false)
      return null
    } finally {
      setIsLoading(false)
    }
  }

  const keyExtractor = useCallback((item: GrupoItem) => item.id, [])

  // Derive if we should show multiple image mode
  const isMultipleImageMode = multipleImages.length > 0 || (media === "img" && multipleImages.length === 0)
  const attachmentCount = multipleImages.length > 0 ? multipleImages.length : (mediaURL.length > 0 ? 1 : 0)

  return (
    <Screen style={$root} preset="auto">
      <View style={$headerRow}>
        <Pressable onPress={attachmentButtonTapped} style={$attachmentButton}>
          <Entypo name="attachment" size={24} color={colors.palette.bittersweetLight} />
          {attachmentCount > 0 ? (
            <View style={$attachmentBadge}>
              <Text style={$attachmentBadgeText}>{attachmentCount}</Text>
            </View>
          ) : null}
        </Pressable>

        {(actividadId === "0" || actividadId === "1") ? (
          <Pressable onPress={toggleModal}>
            <Text style={$addGroupButton}>
              Agregar grupo
            </Text>
          </Pressable>
        ) : null}

        {isLoading ? (
          <ActivityIndicator size="small" color="#007AFF" style={$loadingIndicator} />
        ) : (
          <Pressable style={$sendButton} onPress={enviarButtonTapped}>
            <Text style={$sendButtonText}>Enviar</Text>
          </Pressable>
        )}
      </View>

      {isPublicoVisible ? (
        <Text style={$publicoText}>{"Para: " + grupoName}</Text>
      ) : null}

      {isUploading ? (
        <View style={$progressContainer}>
          <View style={[$progressBar, { width: `${uploadProgress}%` }]} />
          <Text style={$progressText}>
            {multipleImages.length > 1
              ? `Subiendo imagenes: ${uploadProgress}%`
              : docURIRef.current.length > 0
                ? `Subiendo PDF: ${uploadProgress}%`
                : `Subiendo video: ${uploadProgress}%`
            }
          </Text>
        </View>
      ) : null}

      <Modal visible={isModalVisible} onRequestClose={toggleModal} transparent={true}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle} weight="bold">Selecciona grupos</Text>
          <View style={$modalDivider} />
          <FlatList
            data={gruposArr}
            keyExtractor={keyExtractor}
            renderItem={renderNameItem}
            extraData={selectedGrupos}
          />
          <Button text="Listo" onPress={onDone} preset="filled" style={styles.modalButton} />
        </View>
      </Modal>

      {docName.length > 0 ? (
        <Text style={$docNameText}>{docName}</Text>
      ) : null}

      {media.length > 0 ? (
        <View style={$attachmentView}>
          <Text text="Adjunto:" preset="default" style={$attachmentLabel} />
          <ImageAttachment
            mediaType={media as 'img' | 'vid'}
            setAssetURL={setAssetURL}
            setMimeType={setMimeTypeCallback}
            allowMultiple={media === "img"}
            onMultipleImagesSelected={handleMultipleImagesSelected}
          />
        </View>
      ) : null}

      <TextInput
        editable
        multiline
        numberOfLines={15}
        maxLength={6000}
        onChangeText={text => onChangeText(text)}
        value={tfValue}
        style={$mainInputField}
        textAlign={'left'}
        textAlignVertical={'top'}
        placeholder={"Ingresa tu mensaje aqui..."}
      />

    </Screen>
  )
})

const $root: ViewStyle = {
  flex: 1,
  backgroundColor: colors.background,
  padding: spacing.small,
}

const $headerRow: ViewStyle = {
  flexDirection: "row",
  justifyContent: "space-between",
  marginTop: 14,
  marginBottom: 8,
}

const $mainInputField: ViewStyle = {
  height: 400,
  borderRadius: 8,
  borderCurve: 'continuous',
  marginTop: 2,
  marginBottom: 8,
  padding: 10,
  backgroundColor: colors.palette.neutral100,
  borderColor: colors.palette.lavanderLight,
  borderWidth: 1,
}

const $sendButton: ViewStyle = {
  padding: 4,
  width: 70,
  borderRadius: 100,
  marginTop: 0,
  backgroundColor: colors.palette.bluejeansLight,
  borderColor: colors.palette.bluejeansDark,
  borderBottomWidth: Platform.OS === 'ios' ? 4 : 0
}

const $sendButtonText: TextStyle = {
  fontSize: 14,
  marginLeft: 2,
  fontWeight: "bold",
  alignSelf: "center",
  color: "white"
}

const $attachmentView: ViewStyle = {
  padding: 8,
  marginTop: 8,
  marginBottom: 20,
  borderRadius: 8,
  borderCurve: 'continuous',
  backgroundColor: colors.palette.neutral100,
  width: ATTACHMENT_WIDTH,
  borderColor: colors.palette.lavanderLight,
  borderWidth: 1,
}

const $attachmentButton: ViewStyle = {
  marginTop: 4,
  marginLeft: 4,
  position: 'relative',
}

const $attachmentBadge: ViewStyle = {
  position: 'absolute',
  top: -6,
  right: -10,
  backgroundColor: colors.palette.bittersweetLight,
  borderRadius: 10,
  minWidth: 20,
  height: 20,
  alignItems: 'center',
  justifyContent: 'center',
  paddingHorizontal: 4,
}

const $attachmentBadgeText: TextStyle = {
  color: 'white',
  fontSize: 12,
  fontWeight: 'bold',
}

const $attachmentLabel: TextStyle = {
  marginBottom: 6,
}

const $addGroupButton: TextStyle = {
  fontSize: 14,
  marginTop: 4,
  marginLeft: 24,
  fontWeight: "bold",
  alignSelf: "center",
  color: colors.palette.bluejeansLight
}

const $loadingIndicator: ViewStyle = {
  marginTop: 2,
}

const $publicoText: TextStyle = {
  marginTop: 2,
  marginBottom: 8,
}

const $docNameText: TextStyle = {
  alignSelf: "center",
  marginBottom: 4,
}

const $modalDivider: ViewStyle = {
  height: 1,
  backgroundColor: colors.palette.neutral300,
}

const $selectedItemText: TextStyle = {
  color: "black",
  fontWeight: "normal",
}

const $unselectedItemText: TextStyle = {
  color: "white",
  fontWeight: "bold",
}

const $progressContainer: ViewStyle = {
  padding: 10,
  marginTop: 10,
  marginBottom: 10,
  borderRadius: 8,
  borderCurve: 'continuous',
  backgroundColor: colors.palette.neutral100,
  width: ATTACHMENT_WIDTH,
  borderColor: colors.palette.lavanderLight,
  borderWidth: 1,
  alignSelf: "center",
}

const $progressBar: ViewStyle = {
  height: 20,
  borderRadius: 10,
  borderCurve: 'continuous',
  backgroundColor: colors.palette.sunflowerClear,
  marginBottom: 10,
}

const $progressText: TextStyle = {
  fontSize: 14,
  fontWeight: "bold",
  color: colors.palette.neutral800,
  textAlign: "center",
}

const styles = StyleSheet.create({
  modalContent: {
    flex: 1,
    borderRadius: 12,
    borderCurve: 'continuous',
    backgroundColor: colors.palette.lavanderDark,
    marginVertical: 150,
    marginHorizontal: 40,
    padding: 16
  },
  modalTitle: {
    fontSize: 18,
    marginBottom: 10,
    color: colors.palette.neutral100
  },
  modalButton: {
    backgroundColor: colors.palette.actionYellow,
    marginHorizontal: 40,
    borderRadius: 20
  },
  item: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.palette.neutral100,
  },
  selectedItem: {
    backgroundColor: colors.palette.sunflowerClear,
    color: 'white'
  },
})
