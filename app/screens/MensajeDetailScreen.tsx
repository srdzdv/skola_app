import React, { FC, useEffect, useState, useCallback, useRef, useMemo, memo } from "react"
import * as AWSService from '../services/AWSService'
import * as ParseAPI from "../services/parse/ParseAPI"
import { observer } from "mobx-react-lite"
import {
  Image,
  Pressable,
  View,
  StyleSheet,
  ViewStyle,
  TextStyle,
  Dimensions,
  Platform,
  Alert,
  ScrollView,
} from 'react-native'
import { NativeStackScreenProps } from "@react-navigation/native-stack"
import { Entypo } from '@expo/vector-icons'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { AppStackScreenProps } from "app/navigators"
import { Screen, Text } from "app/components"
import { colors } from "../theme"
import { useStores } from "../models"
import * as Haptics from 'expo-haptics'
import moment from 'moment'
import 'moment/locale/es'

// Hoisted constants
const screenWidth = Dimensions.get('window').width
const screenHeight = Dimensions.get('window').height
const INITIAL_TEXT_INPUT_HEIGHT = screenHeight > 700 ? 480 : 350
const THUMBNAIL_SIZE = (screenWidth - 60) / 3 // 3 columns with gaps

interface MensajeDetailScreenProps extends NativeStackScreenProps<AppStackScreenProps<"MensajeDetail">> {}

interface AttachmentData {
  objectId: string
  tipo: string
  isNewBucket: boolean
  thumbnailUrl?: string
}

// Helper function - hoisted outside component
function getDateFormatStr(dateStr: string) {
  return moment(dateStr).format('ddd DD/MMM')
}

// Memoized thumbnail component for better performance
const ImageThumbnail = memo(function ImageThumbnail({
  thumbnailUrl,
  onPress,
  index,
  total,
}: {
  thumbnailUrl: string
  onPress: () => void
  index: number
  total: number
}) {
  return (
    <Pressable onPress={onPress} style={styles.thumbnailWrapper}>
      <Image
        source={{ uri: thumbnailUrl }}
        style={styles.gridThumbnail}
        resizeMode="cover"
      />
      {total > 1 ? (
        <View style={styles.thumbnailBadge}>
          <Text style={styles.thumbnailBadgeText}>{index + 1}</Text>
        </View>
      ) : null}
    </Pressable>
  )
})

export const MensajeDetailScreen: FC<MensajeDetailScreenProps> = observer(function MensajeDetailScreen({ route, navigation }) {
  // Parse nav params once with useMemo to prevent re-parsing on every render
  const anuncioObj = useMemo(() => JSON.parse(JSON.stringify(route.params)), [route.params])

  // Derived values from params
  const descripcion = anuncioObj.descripcion
  const anuncioObjId = anuncioObj.id ?? anuncioObj.objectId
  // console.log("MensajeDetailScreen - anuncioObj keys:", Object.keys(anuncioObj), "id:", anuncioObj.id, "objectId:", anuncioObj.objectId)
  const createdAt = anuncioObj.createdAt
  const createdAtDisplay = useMemo(() => getDateFormatStr(createdAt), [createdAt])
  const userObj = anuncioObj.autor
  const msgType = anuncioObj.msgType
  const tipoAnuncioId = anuncioObj.tipo?.objectId
  const momentosData = anuncioObj.momentosData

  // Compute initial autor name
  const initialAutorName = useMemo(() => {
    return anuncioObj.autorName ?? userObj?.username ?? ""
  }, [anuncioObj.autorName, userObj])

  // Use refs for mutable values that don't trigger re-renders
  const seenByDataRef = useRef<any[]>([])
  const aprobadoRef = useRef(anuncioObj.aprobado)

  // State
  const [tipoAnuncio, setTipoAnuncio] = useState("")
  const [anuncioAutor, setAnuncioAutor] = useState(initialAutorName)
  const [anuncioDestino, setAnuncioDestino] = useState("")
  const [anuncioCreatedAt, setAnuncioCreatedAt] = useState(createdAtDisplay)
  const [attachmentsData, setAttachmentsData] = useState<AttachmentData[]>([])
  const [descripcionTextInputHeight, setDescripcionTextInputHeight] = useState(INITIAL_TEXT_INPUT_HEIGHT)
  const [anuncioDescripcion, setAnuncioDescripcion] = useState(descripcion)
  const [isAprobado, setIsAprobado] = useState(anuncioObj.aprobado)

  const {
    authenticationStore: {
      authUserEscuela
    },
  } = useStores()

  // Fetch tipo anuncio on mount
  useEffect(() => {
    if (tipoAnuncioId) {
      getTipoAnuncioNombreFromServer(tipoAnuncioId)
    }
  }, [tipoAnuncioId])

  // Lifecycle
  useEffect(() => {
    setupComponents()
    fetchAnuncioPhotos(anuncioObjId)
    getSeenByCount()
  }, [])

  const setupComponents = useCallback(() => {
    let showResponderBttn = true
    if (anuncioObj.grupos != null) {
      showResponderBttn = false
      const gruposArr = anuncioObj.grupos
      getGrupoIDs(gruposArr)
    } else if (anuncioObj.destino?.length > 0) {
      setAnuncioDestino(anuncioObj.destino)
    }
    if (msgType != null && msgType === 0) {
      setAnuncioDestino("Escuela")
    }
    // HEADER
    navigation.setOptions({
      headerBackTitleVisible: false,
    })
    if (showResponderBttn) {
      if (msgType === 2) {
        navigation.setOptions({
          headerBackTitleVisible: false,
          headerRight: () => (
            <MaterialCommunityIcons
              name="dots-horizontal-circle-outline"
              size={28}
              style={styles.headerRightIcon}
              color={colors.palette.actionColor}
              onPress={headerRightBttnPressed}
            />
          ),
        })
      } else {
        navigation.setOptions({
          headerBackTitleVisible: false,
          headerRight: () => (
            <Entypo
              name="plus"
              size={28}
              style={styles.headerRightIcon}
              color={colors.palette.actionColor}
              onPress={headerRightBttnPressed}
            />
          ),
        })
      }
    }
    if (momentosData != null) {
      processMomento(momentosData)
    }
  }, [anuncioObj, msgType, momentosData, navigation])

  const getSeenByCount = useCallback(async () => {
    const seenByRes = await ParseAPI.fetchSeenBy(anuncioObjId)
    if (seenByRes != null) {
      const count = seenByRes.length
      setTipoAnuncio("Visto por: " + count)
      seenByDataRef.current = seenByRes
    }
  }, [anuncioObjId])

  const processMomento = useCallback((momentoData: any) => {
    let desayunoString = ""
    let comidaString = ""
    let colacionString = ""
    let meriendaString = ""
    let lecheString = ""
    let duracionSiestaString = ""
    let horaSiestaString = ""
    let pipiString = ""
    let popoString = ""

    if (momentoData.desayuno?.length > 0) {
      desayunoString = "Desayuno: " + momentoData.desayuno + "\r\n"
    }
    if (momentoData.comida?.length > 0) {
      comidaString = "Comida: " + momentoData.comida + "\r\n"
    }
    if (momentoData.colacion?.length > 0) {
      colacionString = "Colacion: " + momentoData.colacion + "\r\n"
    }
    if (momentoData.merienda?.length > 0) {
      meriendaString = "Merienda: " + momentoData.merienda + "\r\n"
    }
    if (momentoData.leche?.length > 0) {
      lecheString = "\r\nLeche: " + momentoData.leche + "\r\n"
    }

    const durmioString = momentoData.descanso === true ? "Durmio: Si" : "Durmio: No"
    if (momentoData.tiempoSiesta?.length > 0) {
      duracionSiestaString = "Tiempo: " + momentoData.tiempoSiesta + "\r\n"
    }
    if (momentoData.horaSiesta?.length > 0) {
      horaSiestaString = "Horario: " + momentoData.horaSiesta + "\r\n"
    }

    const funcionString = momentoData.avisoFuncion === true ? "Aviso: Si" : "Aviso: No"
    if (momentoData.pipi?.length > 0) {
      pipiString = "Pipi: " + momentoData.pipi + "\r\n"
    }
    if (momentoData.popo?.length > 0) {
      popoString = "Popo: " + momentoData.popo + "\r\n"
    }

    const comentariosString = momentoData.alimentosComentarios || ""
    const descripcionString = "Momentos del Dia\n\nAlimentacion\r\n" + desayunoString + comidaString + colacionString + meriendaString + lecheString + "\r\nDescanso\r\n" + durmioString + "\r\n" + duracionSiestaString + horaSiestaString + "\r\nFunciones\r\n" + funcionString + "\r\n" + pipiString + popoString + "\r\nComentarios generales:\r\n" + comentariosString
    setAnuncioDescripcion(descripcionString)
  }, [])

  const headerRightBttnPressed = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
    const alertActionsArr: any[] = [
      { text: 'Cancelar', onPress: () => {}, style: 'cancel' }
    ]
    const responder = { text: 'Responder mensaje', onPress: () => responderAction() }
    const archivar = { text: 'Archivar', onPress: () => archivarAction() }
    const aprobarOption = { text: 'Aprobar mensaje', onPress: () => toggleAprobarAction() }
    const eliminar = { text: 'Eliminar mensaje', onPress: () => eliminarAction() }
    const desactivar = { text: 'Desactivar mensaje', onPress: () => toggleAprobarAction() }
    const visto = { text: 'Visto por', onPress: () => vistoAction() }

    if (msgType != null) {
      switch (msgType) {
        case 0:
          alertActionsArr.push(responder)
          alertActionsArr.push(archivar)
          break
        case 1:
          alertActionsArr.push(aprobarOption)
          alertActionsArr.push(eliminar)
          break
        case 2:
          if (aprobadoRef.current) {
            alertActionsArr.push(desactivar)
            alertActionsArr.push(visto)
          } else {
            alertActionsArr.push(aprobarOption)
            alertActionsArr.push(eliminar)
          }
          break
        default:
          break
      }
    }
    Alert.alert('Opciones Adicionales', 'Selecciona la accion que deseas ejecutar:', alertActionsArr)
  }, [msgType])

  const reloadActividadList = useCallback(() => {
    // Placeholder for reload functionality
  }, [])

  const responderAction = useCallback(() => {
    const estudiante = anuncioObj.estudianteObj
    Haptics.notificationAsync()
    const actividadParams = {
      actividadType: 4,
      grupoName: estudiante.NOMBRE + " " + estudiante.APELLIDO,
      grupoId: null,
      estudianteId: estudiante.objectId,
      reloadList: reloadActividadList
    }
    navigation.navigate("CrearActividad", actividadParams)
  }, [anuncioObj.estudianteObj, navigation, reloadActividadList])

  const archivarAction = useCallback(async () => {
    const res = await ParseAPI.archivarAnuncio(anuncioObjId)
    if (res != null) {
      route.params.reloadTable?.(msgType)
      Alert.alert("El mensaje ha sido archivado", "El mensaje seguira visible en Grupos -> Alumno")
    }
  }, [anuncioObjId, msgType, route.params])

  const vistoAction = useCallback(() => {
    const params = {
      tableData: seenByDataRef.current
    }
    navigation.navigate("seenBy", params)
  }, [navigation])

  const eliminarAction = useCallback(async () => {
    const res = await ParseAPI.eliminarAnuncio(anuncioObjId)
    if (res != null) {
      route.params.reloadTable?.(msgType)
      Alert.alert("El mensaje ha sido eliminado", "")
    }
  }, [anuncioObjId, msgType, route.params])

  const runCloudCodeFunction = useCallback((anuncioId: string) => {
    const cloudFuncName = "adminApprovedAnuncio"
    const params = { anuncioObjectId: anuncioId, escuelaObjId: authUserEscuela }
    ParseAPI.runCloudCodeFunction(cloudFuncName, params)
  }, [authUserEscuela])

  const toggleAprobarAction = useCallback(async () => {
    const anuncioResult = await ParseAPI.toggleAprobarAnuncio(anuncioObjId)
    if (anuncioResult != null) {
      if (!aprobadoRef.current) {
        runCloudCodeFunction(anuncioResult)
      }
      aprobadoRef.current = !aprobadoRef.current
      setIsAprobado(aprobadoRef.current)
      route.params.reloadTable?.(msgType)

      const alertTitle = aprobadoRef.current ? "El mensaje ha sido aprobado" : "El mensaje ha sido desactivado"
      const alertMsg = aprobadoRef.current
        ? "Ha sido enviado a los Papas correspondientes"
        : "Nadie puede ver el mensaje hasta que sea activado de nuevo."
      Alert.alert(alertTitle, alertMsg)
    }
  }, [anuncioObjId, msgType, route.params, runCloudCodeFunction])

  const getTipoAnuncioNombreFromServer = useCallback(async (tipoId: string) => {
    const tipoAnuncioNombre = await ParseAPI.fetchTipoAnuncioNombre(tipoId)
    setTipoAnuncio(tipoAnuncioNombre)
  }, [])

  const fetchResizedAttachment = useCallback(async (objectId: string): Promise<string | null> => {
    const resizedPrefix = "resized-"
    const resizedObjId = resizedPrefix + objectId
    const signedURL = await AWSService.getSignedObjectUrl(resizedObjId)
    return signedURL ?? null
  }, [])

  // Fetch ALL photos for the anuncio (supports multiple images)
  const fetchAnuncioPhotos = useCallback(async (anuncioId: string) => {
    if (attachmentsData.length === 0) {
      const results = await ParseAPI.fetchAnuncioPhotos(anuncioId)
      console.log("fetchAnuncioPhotos results:", results?.length ?? 0, "for anuncioId:", anuncioId)
      if (results != null && results.length > 0) {
        const attachments: AttachmentData[] = []

        for (const result of results) {
          const tipo = result.get("TipoArchivo")
          console.log("Attachment found - id:", result.id, "tipo:", tipo, "newS3Bucket:", result.get("newS3Bucket"))
          const attachmentData: AttachmentData = {
            objectId: result.id,
            tipo: tipo,
            isNewBucket: result.get("newS3Bucket"),
            thumbnailUrl: undefined,
          }

          // Fetch thumbnail if available
          if (result.get("newS3Bucket")) {
            const thumbnailUrl = await fetchResizedAttachment(result.id)
            if (thumbnailUrl) {
              attachmentData.thumbnailUrl = thumbnailUrl
            }
          }

          attachments.push(attachmentData)
        }

        setAttachmentsData(attachments)
      }
    }
  }, [attachmentsData.length, fetchResizedAttachment])

  const getGrupoIDs = useCallback((gruposArr: any[]) => {
    let grupoIDsStrings = ""
    if (gruposArr.length > 4) {
      grupoIDsStrings = "Toda la escuela"
    } else {
      for (let i = 0; i < gruposArr.length; i++) {
        const grupoObj = gruposArr[i]
        if (grupoObj != null) {
          const grupoID = grupoObj.grupoId
          if (gruposArr.length > 1) {
            grupoIDsStrings = grupoIDsStrings + grupoID + ", "
          } else {
            grupoIDsStrings = grupoID
          }
        }
      }
    }
    setAnuncioDestino(grupoIDsStrings)
  }, [])

  const openAttachmentBtnPressed = useCallback((attachment: AttachmentData) => {
    navigation.navigate('attachmentDetail', attachment)
  }, [navigation])

  const displayAprobadoStatus = useCallback((aprobadoVal: boolean) => {
    return aprobadoVal === true ? "Aprobado" : "Por aprobar"
  }, [])

  // Derived values
  const hasMultipleAttachments = attachmentsData.length > 1
  const hasSingleAttachment = attachmentsData.length === 1
  const firstAttachment = attachmentsData[0]
  const firstThumbnailUrl = firstAttachment?.thumbnailUrl ?? ""
  const isPdfAttachment = firstAttachment?.tipo === "PDF"
  const isVideoAttachment = firstAttachment?.tipo === "VID"

  return (
    <Screen style={$root} preset="scroll">
      <View style={styles.container}>
        <View style={styles.contentContainer}>
          <View style={styles.twoColumnContainer}>
            <View style={styles.textColumn}>
              <Text style={styles.subtitleText} weight="semiBold">{`${anuncioAutor} -> ${anuncioDestino}`}</Text>
              <Text style={styles.dateText}>{anuncioCreatedAt}</Text>
              <Text style={styles.titleText}>{tipoAnuncio}</Text>
              <Text style={styles.dateText}>{displayAprobadoStatus(isAprobado)}</Text>
            </View>

            {/* Single image thumbnail on the right (backward compatible) */}
            {hasSingleAttachment && firstThumbnailUrl !== "" && !isPdfAttachment ? (
              <Pressable
                style={styles.imageColumn}
                onPress={() => openAttachmentBtnPressed(firstAttachment)}
              >
                <Image
                  source={{ uri: firstThumbnailUrl }}
                  style={styles.thumbnail}
                  resizeMode="cover"
                />
                <Text style={styles.attachmentSubtext}>
                  Abrir adjunto
                </Text>
              </Pressable>
            ) : null}

            {/* PDF document thumbnail on the right */}
            {hasSingleAttachment && isPdfAttachment ? (
              <Pressable
                style={styles.imageColumn}
                onPress={() => openAttachmentBtnPressed(firstAttachment)}
              >
                <View style={styles.pdfDocumentShape}>
                  <MaterialCommunityIcons name="file-pdf-box" size={36} color={colors.palette.bittersweetLight} />
                </View>
                <Text style={styles.attachmentSubtext}>
                  Abrir adjunto
                </Text>
              </Pressable>
            ) : null}

            {/* Video attachment thumbnail on the right */}
            {hasSingleAttachment && isVideoAttachment ? (
              <Pressable
                style={styles.imageColumn}
                onPress={() => openAttachmentBtnPressed(firstAttachment)}
              >
                <View style={styles.videoDocumentShape}>
                  <MaterialCommunityIcons name="play-circle" size={40} color={colors.palette.bluejeansLight} />
                </View>
                <Text style={styles.attachmentSubtext}>
                  Abrir video
                </Text>
              </Pressable>
            ) : null}
          </View>

          {/* Multiple images grid */}
          {hasMultipleAttachments ? (
            <View style={styles.multipleImagesContainer}>
              <Text style={styles.multipleImagesTitle} weight="semiBold">
                {attachmentsData.length} imagenes adjuntas
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.imagesScrollContent}
              >
                {attachmentsData.map((attachment, index) => (
                  attachment.thumbnailUrl ? (
                    <ImageThumbnail
                      key={attachment.objectId}
                      thumbnailUrl={attachment.thumbnailUrl}
                      onPress={() => openAttachmentBtnPressed(attachment)}
                      index={index}
                      total={attachmentsData.length}
                    />
                  ) : (
                    <Pressable
                      key={attachment.objectId}
                      style={styles.noThumbnailButton}
                      onPress={() => openAttachmentBtnPressed(attachment)}
                    >
                      <Entypo name="image" size={24} color={colors.palette.actionColor} />
                      <Text style={styles.noThumbnailText}>Imagen {index + 1}</Text>
                    </Pressable>
                  )
                ))}
              </ScrollView>
            </View>
          ) : null}

          {/* Single attachment without thumbnail (non-PDF, non-video) - show button */}
          {hasSingleAttachment && firstThumbnailUrl === "" && !isPdfAttachment && !isVideoAttachment ? (
            <View style={styles.header}>
              <Pressable style={styles.headerButton} onPress={() => openAttachmentBtnPressed(firstAttachment)}>
                <Text style={styles.headerButtonText} weight="bold">
                  Abrir adjunto
                </Text>
              </Pressable>
            </View>
          ) : null}

          <View style={styles.messageContainer}>
            <Text style={styles.messageText}>{anuncioDescripcion}</Text>
          </View>
        </View>
      </View>
    </Screen>
  )
})

const $root: ViewStyle = {
  flex: 1,
  backgroundColor: colors.palette.bluejeansLight,
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.palette.bluejeansLight
  },
  backBtnText: {
    color: colors.palette.actionColor,
    fontWeight: '700',
    fontSize: 16
  },
  responderBtnText: {
    color: colors.palette.actionColor,
    fontWeight: '800',
    fontSize: 16
  },
  container: {
    flex: 1,
    backgroundColor: colors.palette.bluejeansLight,
  },
  header: {
    alignItems: 'center',
    padding: 1,
    marginBottom: 12,
    backgroundColor: colors.palette.bluejeansLight,
  },
  headerButton: {
    padding: 2,
    borderRadius: 20,
    borderCurve: 'continuous',
    backgroundColor: colors.palette.bluejeansLight,
  },
  headerButtonText: {
    color: colors.palette.actionColor,
    fontWeight: '700',
  },
  resizedImg: {
    width: 100,
    height: 100,
  },
  contentContainer: {
    padding: 15,
  },
  titleText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5,
  },
  subtitleText: {
    fontSize: 16,
    color: 'white',
    marginBottom: 5,
  },
  dateText: {
    fontSize: 14,
    color: 'white',
    marginBottom: 5,
  },
  messageContainer: {
    backgroundColor: 'white',
    borderRadius: 10,
    borderCurve: 'continuous',
    padding: 15,
    marginTop: 8,
  },
  messageText: {
    fontSize: 16,
    color: 'black',
  },
  attachmentContainer: {
    marginVertical: 12,
    backgroundColor: colors.palette.bluejeansDark,
    borderRadius: 10,
    borderCurve: 'continuous',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  thumbnailContainer: {
    marginRight: 12,
  },
  attachmentInfo: {
    flex: 1,
  },
  twoColumnContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  textColumn: {
    flex: 1,
    marginRight: 12,
  },
  imageColumn: {
    alignItems: 'center',
    width: 100,
  },
  thumbnail: {
    width: 100,
    height: 100,
    borderRadius: 8,
    borderCurve: 'continuous',
    marginBottom: 4,
  },
  attachmentSubtext: {
    fontSize: 12,
    color: colors.palette.actionColor,
    textAlign: 'center',
  },
  androidSafeArea: {
    height: 40,
    backgroundColor: 'white',
  },
  headerRightIcon: {
    marginTop: Platform.OS === 'android' ? 24 : 2,
    marginRight: Platform.OS === 'android' ? 4 : 0,
    padding: 4,
  },
  // Multiple images styles
  multipleImagesContainer: {
    marginBottom: 12,
    backgroundColor: colors.palette.bluejeansDark,
    borderRadius: 12,
    borderCurve: 'continuous',
    padding: 12,
  },
  multipleImagesTitle: {
    color: 'white',
    fontSize: 14,
    marginBottom: 10,
  },
  imagesScrollContent: {
    gap: 10,
    paddingRight: 4,
  },
  thumbnailWrapper: {
    position: 'relative',
  },
  gridThumbnail: {
    width: 90,
    height: 90,
    borderRadius: 8,
    borderCurve: 'continuous',
  },
  thumbnailBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  thumbnailBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  noThumbnailButton: {
    width: 90,
    height: 90,
    borderRadius: 8,
    borderCurve: 'continuous',
    backgroundColor: colors.palette.neutral200,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  noThumbnailText: {
    fontSize: 10,
    color: colors.palette.actionColor,
    textAlign: 'center',
  },
  pdfDocumentShape: {
    width: 80,
    height: 100,
    backgroundColor: 'white',
    borderRadius: 8,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  videoDocumentShape: {
    width: 80,
    height: 80,
    backgroundColor: 'white',
    borderRadius: 40,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
})
