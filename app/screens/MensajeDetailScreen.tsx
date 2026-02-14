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
  Dimensions,
  Platform,
  Alert,
  ScrollView,
  FlatList,
  TextInput,
  ActivityIndicator,
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

interface ChatMessage {
  id: string
  objectId: string
  descripcion: string
  autorName: string
  autorId: string
  timestamp: string
  createdAt: Date
  isCurrentUser: boolean
  attachments: AttachmentData[]
  momentosData: any
  estudianteObj: any
  autor: any
  destino: string
  aprobado: boolean
  tipo: string
  msgType: number
}

// Helper function - hoisted outside component
function getDateFormatStr(dateStr: string) {
  return moment(dateStr).format('ddd DD/MMM')
}

// Memoized thumbnail component for detail mode
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

// Memoized chat bubble component
const ChatMessageBubble = memo(function ChatMessageBubble({
  message,
  isExpanded,
  onPress,
  onAttachmentPress,
}: {
  message: ChatMessage
  isExpanded: boolean
  onPress: (id: string) => void
  onAttachmentPress: (attachment: AttachmentData) => void
}) {
  const handlePress = useCallback(() => {
    onPress(message.id)
  }, [message.id, onPress])

  const isCurrentUser = message.isCurrentUser

  return (
    <Pressable onPress={handlePress}>
      <View style={[chatStyles.bubbleContainer, isCurrentUser ? chatStyles.currentUserBubble : chatStyles.otherUserBubble]}>
        {!isCurrentUser ? (
          <Text style={chatStyles.bubbleAuthor} weight="semiBold">
            {message.autorName}
          </Text>
        ) : null}
        <Text style={[chatStyles.bubbleText, isCurrentUser ? chatStyles.currentUserText : undefined]}>
          {message.descripcion}
        </Text>
        <View style={chatStyles.bubbleFooter}>
          <Text style={[chatStyles.bubbleTimestamp, isCurrentUser ? chatStyles.currentUserDetails : undefined]}>
            {message.timestamp}
          </Text>
          {message.attachments.length > 0 ? (
            <View style={chatStyles.attachmentIndicator}>
              <Entypo
                name="attachment"
                size={12}
                color={isCurrentUser ? "rgba(255,255,255,0.7)" : "gray"}
              />
              {message.attachments.length > 1 ? (
                <Text style={[chatStyles.attachmentCountText, isCurrentUser ? chatStyles.currentUserDetails : undefined]}>
                  {" "}{message.attachments.length}
                </Text>
              ) : null}
            </View>
          ) : null}
        </View>
        {/* Inline attachment gallery when expanded */}
        {isExpanded && message.attachments.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={chatStyles.attachmentGallery}
            contentContainerStyle={chatStyles.attachmentGalleryContent}
          >
            {message.attachments.map((att) => (
              <Pressable
                key={att.objectId}
                onPress={() => onAttachmentPress(att)}
                style={chatStyles.attachmentThumb}
              >
                {att.thumbnailUrl ? (
                  <Image
                    source={{ uri: att.thumbnailUrl }}
                    style={chatStyles.attachmentImage}
                    resizeMode="cover"
                  />
                ) : att.tipo === "PDF" ? (
                  <View style={chatStyles.attachmentPlaceholder}>
                    <MaterialCommunityIcons name="file-pdf-box" size={28} color={colors.palette.bittersweetLight} />
                  </View>
                ) : att.tipo === "VID" ? (
                  <View style={chatStyles.attachmentPlaceholder}>
                    <MaterialCommunityIcons name="play-circle" size={28} color={colors.palette.bluejeansLight} />
                  </View>
                ) : (
                  <View style={chatStyles.attachmentPlaceholder}>
                    <Entypo name="image" size={20} color={colors.palette.actionColor} />
                  </View>
                )}
              </Pressable>
            ))}
          </ScrollView>
        ) : null}
      </View>
    </Pressable>
  )
})

export const MensajeDetailScreen: FC<MensajeDetailScreenProps> = observer(function MensajeDetailScreen({ route, navigation }) {
  // Parse nav params once with useMemo to prevent re-parsing on every render
  const anuncioObj = useMemo(() => JSON.parse(JSON.stringify(route.params)), [route.params])

  // Derived values from params
  const descripcion = anuncioObj.descripcion
  const anuncioObjId = anuncioObj.id ?? anuncioObj.objectId
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

  // Mode determination
  const chatMode = useMemo(() => {
    return !anuncioObj._fromThreadDetail && !anuncioObj._fromActividadGrupo && anuncioObj.estudianteObj != null
  }, [anuncioObj._fromThreadDetail, anuncioObj._fromActividadGrupo, anuncioObj.estudianteObj])

  const chatThreadId = useMemo(() => {
    return anuncioObj.threadId ?? anuncioObjId
  }, [anuncioObj.threadId, anuncioObjId])

  // Use refs for mutable values that don't trigger re-renders
  const seenByDataRef = useRef<any[]>([])
  const aprobadoRef = useRef(anuncioObj.aprobado)
  const flatListRef = useRef<FlatList>(null)
  const photosRef = useRef<any[]>([])
  const tipoAnuncioServerRef = useRef<any>(null)
  const rootGruposRef = useRef<any[] | null>(null)

  // Detail mode state
  const [tipoAnuncio, setTipoAnuncio] = useState("")
  const [anuncioAutor, setAnuncioAutor] = useState(initialAutorName)
  const [anuncioDestino, setAnuncioDestino] = useState("")
  const [anuncioCreatedAt, setAnuncioCreatedAt] = useState(createdAtDisplay)
  const [attachmentsData, setAttachmentsData] = useState<AttachmentData[]>([])
  const [descripcionTextInputHeight, setDescripcionTextInputHeight] = useState(INITIAL_TEXT_INPUT_HEIGHT)
  const [anuncioDescripcion, setAnuncioDescripcion] = useState(descripcion)
  const [isAprobado, setIsAprobado] = useState(anuncioObj.aprobado)

  // Chat mode state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [replyText, setReplyText] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [isChatLoading, setIsChatLoading] = useState(true)
  const [expandedBubbleId, setExpandedBubbleId] = useState<string | null>(null)

  const {
    authenticationStore: {
      authUserEscuela,
      authUsertype,
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
    if (chatMode) {
      loadChatMessages()
    } else {
      fetchAnuncioPhotos(anuncioObjId)
    }
    getSeenByCount()
  }, [])

  // ========== Chat mode functions ==========

  const fetchResizedAttachment = useCallback(async (objectId: string): Promise<string | null> => {
    const resizedPrefix = "resized-"
    const resizedObjId = resizedPrefix + objectId
    const signedURL = await AWSService.getSignedObjectUrl(resizedObjId)
    return signedURL ?? null
  }, [])

  function getAttachmentsForMessage(messageId: string): AttachmentData[] {
    const attachments: AttachmentData[] = []
    for (const photo of photosRef.current) {
      const anuncioInPhoto = photo.get("anuncio")
      if (anuncioInPhoto && anuncioInPhoto.id === messageId) {
        attachments.push({
          objectId: photo.id,
          tipo: photo.get("TipoArchivo"),
          isNewBucket: photo.get("newS3Bucket"),
          thumbnailUrl: undefined,
        })
      }
    }
    return attachments
  }

  function buildFallbackChatMessage(currentUser: any): ChatMessage {
    return {
      id: anuncioObjId,
      objectId: anuncioObjId,
      descripcion: descripcion || "",
      autorName: initialAutorName,
      autorId: userObj?.objectId || userObj?.id || "",
      timestamp: moment(createdAt).format("ddd DD/MMM HH:mm"),
      createdAt: new Date(createdAt),
      isCurrentUser: (userObj?.objectId || userObj?.id) === currentUser?.id,
      attachments: [],
      momentosData: momentosData,
      estudianteObj: anuncioObj.estudianteObj,
      autor: userObj,
      destino: anuncioObj.destino || "",
      aprobado: anuncioObj.aprobado,
      tipo: "Mensaje",
      msgType: msgType ?? 0,
    }
  }

  const loadChatMessages = useCallback(async () => {
    setIsChatLoading(true)
    try {
      const currentUser = await ParseAPI.getCurrentUserObj()
      const result = await ParseAPI.fetchThreadMessages(chatThreadId)
      photosRef.current = result.photos

      // Capture tipo and grupos from root message for replies
      if (result.messages.length > 0) {
        const rootMsg = result.messages[0]
        tipoAnuncioServerRef.current = rootMsg.get("tipo")
        rootGruposRef.current = rootMsg.get("grupos") || null
      }

      const processed: ChatMessage[] = []

      if (result.messages.length === 0) {
        // Fallback: show single bubble from route params
        processed.push(buildFallbackChatMessage(currentUser))
      } else {
        for (const msg of result.messages) {
          const autorObj = msg.get("autor")
          let autorName = ""
          if (autorObj) {
            const usertype = autorObj.get("usertype")
            if (usertype === 2) {
              autorName = autorObj.get("parentesco") || autorObj.get("username")
            } else {
              autorName = autorObj.get("username")
            }
          }

          let destino = ""
          if (msg.get("estudiante")) {
            destino = msg.get("estudiante").get("NOMBRE")
          } else if (msg.get("grupos")) {
            const grupos = msg.get("grupos")
            if (grupos.length > 4) {
              destino = "Toda la escuela"
            } else {
              destino = grupos.map((g: any) => g?.get?.("grupoId") || "").filter(Boolean).join(", ")
            }
          }

          let msgDescripcion = msg.get("descripcion") || ""
          const msgMomentos = msg.get("momento")
          if (msgMomentos) {
            msgDescripcion = "Momentos del Día"
            if (msgMomentos.alimentosComentarios) {
              msgDescripcion += "\n" + msgMomentos.alimentosComentarios
            }
          }

          // Get attachments for this message
          const msgAttachments = getAttachmentsForMessage(msg.id)

          processed.push({
            id: msg.id,
            objectId: msg.id,
            descripcion: msgDescripcion,
            autorName,
            autorId: autorObj?.id || "",
            timestamp: moment(msg.createdAt).format("ddd DD/MMM HH:mm"),
            createdAt: msg.createdAt,
            isCurrentUser: autorObj?.id === currentUser.id,
            attachments: msgAttachments,
            momentosData: msgMomentos,
            estudianteObj: msg.get("estudiante"),
            autor: autorObj,
            destino,
            aprobado: msg.get("aprobado"),
            tipo: msg.get("tipo")?.get?.("nombre") || "Mensaje",
            msgType: 0,
          })
        }
      }

      // Fetch thumbnails for all attachments
      for (const msg of processed) {
        for (const att of msg.attachments) {
          if (att.isNewBucket && !att.thumbnailUrl) {
            const url = await fetchResizedAttachment(att.objectId)
            if (url) att.thumbnailUrl = url
          }
        }
      }

      setChatMessages(processed)
    } catch (error) {
      console.error("Error loading chat messages:", error)
      Alert.alert("Error", "No fue posible cargar los mensajes.")
    } finally {
      setIsChatLoading(false)
    }
  }, [chatThreadId])

  const sendReply = useCallback(async () => {
    if (replyText.trim().length === 0) return

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    setIsSending(true)

    try {
      const currentUser = await ParseAPI.getCurrentUserObj()
      const isReplyAprobado = authUsertype !== 1

      const params: Record<string, any> = {
        aprobado: isReplyAprobado,
        descripcion: replyText.trim(),
        autor: currentUser,
        awsAttachment: false,
        materia: "",
        sentFrom: "skolaRN_" + Platform.OS,
      }

      if (tipoAnuncioServerRef.current) {
        params["tipo"] = tipoAnuncioServerRef.current
      }

      const gruposForReply = rootGruposRef.current
      if (gruposForReply && gruposForReply.length > 0) {
        params["grupos"] = gruposForReply
      }

      const estudianteId = anuncioObj.estudianteObj?.objectId || anuncioObj.estudianteObj?.id || null

      const { id: anuncioId } = await ParseAPI.saveAnuncioWithThread(
        params,
        null,
        estudianteId,
        null,
        chatThreadId,
      )

      if (anuncioId) {
        let cloudFuncName = "adminApprovedAnuncio"
        if (authUsertype === 1) {
          cloudFuncName = "teacherAnuncioToBeApproved"
        }
        ParseAPI.runCloudCodeFunction(cloudFuncName, {
          anuncioObjectId: anuncioId,
          escuelaObjId: authUserEscuela,
        })

        setReplyText("")
        await loadChatMessages()

        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true })
        }, 300)

        route.params.reloadTable?.(msgType ?? 0)
      } else {
        Alert.alert("Error", "No fue posible enviar el mensaje.")
      }
    } catch (error) {
      console.error("Error sending reply:", error)
      Alert.alert("Error", "Ocurrió un error al enviar el mensaje.")
    } finally {
      setIsSending(false)
    }
  }, [replyText, chatThreadId, authUsertype, authUserEscuela, anuncioObj.estudianteObj])

  const handleBubblePress = useCallback((messageId: string) => {
    setExpandedBubbleId(prev => prev === messageId ? null : messageId)
  }, [])

  const handleBubbleAttachmentPress = useCallback((attachment: AttachmentData) => {
    navigation.navigate('AttachmentDetail', attachment)
  }, [navigation])

  const renderChatMessage = useCallback(({ item }: { item: ChatMessage }) => (
    <ChatMessageBubble
      message={item}
      isExpanded={expandedBubbleId === item.id}
      onPress={handleBubblePress}
      onAttachmentPress={handleBubbleAttachmentPress}
    />
  ), [expandedBubbleId, handleBubblePress, handleBubbleAttachmentPress])

  const chatKeyExtractor = useCallback((item: ChatMessage) => item.id, [])

  // ========== Shared / Detail mode functions ==========

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

    if (chatMode) {
      // Chat mode: show dots menu for additional actions (no Responder needed)
      navigation.setOptions({
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
    } else if (showResponderBttn) {
      // Detail mode: original header setup
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
  }, [anuncioObj, msgType, momentosData, navigation, chatMode])

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
          if (!chatMode) alertActionsArr.push(responder)
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
    } else if (chatMode) {
      // Messages without msgType (e.g. from AlumnoMensajes) — add archivar
      alertActionsArr.push(archivar)
    }
    Alert.alert('Opciones Adicionales', 'Selecciona la accion que deseas ejecutar:', alertActionsArr)
  }, [msgType, chatMode])

  const reloadActividadList = useCallback(() => {
    // Placeholder for reload functionality
  }, [])

  const responderAction = useCallback(() => {
    const estudiante = anuncioObj.estudianteObj
    Haptics.notificationAsync()
    // Use existing threadId if available, otherwise use this message's id
    // so the reply links to this message as the thread root
    const replyThreadId = anuncioObj.threadId ?? anuncioObjId
    const actividadParams = {
      actividadType: 4,
      grupoName: estudiante.NOMBRE + " " + estudiante.APELLIDO,
      grupoId: null,
      estudianteId: estudiante.objectId,
      threadId: replyThreadId,
      reloadList: reloadActividadList
    }
    navigation.navigate("CrearActividad", actividadParams)
  }, [anuncioObj.estudianteObj, anuncioObj.threadId, anuncioObjId, navigation, reloadActividadList])

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

  // Fetch ALL photos for the anuncio (detail mode only)
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
    navigation.navigate('AttachmentDetail', attachment)
  }, [navigation])

  const displayAprobadoStatus = useCallback((aprobadoVal: boolean) => {
    return aprobadoVal === true ? "Aprobado" : "Por aprobar"
  }, [])

  // ========== Render ==========

  // Chat mode render
  if (chatMode) {
    const chatDestino = anuncioDestino || anuncioObj.destino || ""

    return (
      <Screen
        style={$chatRoot}
        preset="fixed"
        contentContainerStyle={$chatContentContainer}
        KeyboardAvoidingViewProps={{ keyboardVerticalOffset: 90 }}
      >
        {isChatLoading ? (
          <View style={chatStyles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.palette.actionBlue} />
          </View>
        ) : (
          <View style={chatStyles.chatContainer}>
            {/* Info bar */}
            <View style={chatStyles.infoBar}>
              <View style={chatStyles.infoBarLeft}>
                <Text style={chatStyles.infoBarName} weight="semiBold">
                  {chatDestino}
                </Text>
                <Text style={chatStyles.infoBarDate}>
                  {anuncioCreatedAt}
                </Text>
              </View>
              <Text style={chatStyles.infoBarCount}>
                {chatMessages.length} {chatMessages.length === 1 ? "mensaje" : "mensajes"}
              </Text>
            </View>

            {/* Chat messages */}
            <FlatList
              ref={flatListRef}
              data={chatMessages}
              renderItem={renderChatMessage}
              keyExtractor={chatKeyExtractor}
              style={chatStyles.messagesList}
              contentContainerStyle={chatStyles.messagesContent}
              onContentSizeChange={() =>
                flatListRef.current?.scrollToEnd({ animated: false })
              }
            />

            {/* Reply input */}
            <View style={chatStyles.replyContainer}>
              <TextInput
                style={chatStyles.replyInput}
                value={replyText}
                onChangeText={setReplyText}
                placeholder="Escribe tu respuesta..."
                placeholderTextColor={colors.palette.neutral400}
                multiline
                maxLength={2000}
                editable={!isSending}
              />
              {isSending ? (
                <ActivityIndicator
                  size="small"
                  color={colors.palette.actionBlue}
                  style={chatStyles.sendButton}
                />
              ) : (
                <Pressable
                  onPress={sendReply}
                  style={[
                    chatStyles.sendButton,
                    replyText.trim().length === 0 ? chatStyles.sendButtonDisabled : null,
                  ]}
                  disabled={replyText.trim().length === 0}
                >
                  <Entypo
                    name="paper-plane"
                    size={22}
                    color={
                      replyText.trim().length === 0
                        ? colors.palette.neutral400
                        : colors.palette.actionBlue
                    }
                  />
                </Pressable>
              )}
            </View>
          </View>
        )}
      </Screen>
    )
  }

  // Detail mode render (original, unchanged)
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

// ========== Styles ==========

const $root: ViewStyle = {
  flex: 1,
  backgroundColor: colors.palette.bluejeansLight,
}

const $chatRoot: ViewStyle = {
  flex: 1,
  backgroundColor: colors.palette.bluejeansClear,
}

const $chatContentContainer: ViewStyle = {
  flex: 1,
}

// Detail mode styles (original)
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

// Chat mode styles
const chatStyles = StyleSheet.create({
  chatContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  infoBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: colors.palette.bluejeansLight,
  },
  infoBarLeft: {
    flex: 1,
    marginRight: 8,
  },
  infoBarName: {
    color: "white",
    fontSize: 14,
  },
  infoBarDate: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 12,
    marginTop: 2,
  },
  infoBarCount: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 12,
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  bubbleContainer: {
    maxWidth: "80%",
    borderRadius: 16,
    borderCurve: "continuous",
    padding: 12,
    marginBottom: 8,
  },
  currentUserBubble: {
    alignSelf: "flex-end",
    backgroundColor: colors.palette.actionBlue,
    marginRight: 8,
    borderBottomRightRadius: 4,
  },
  otherUserBubble: {
    alignSelf: "flex-start",
    backgroundColor: "white",
    marginLeft: 8,
    borderBottomLeftRadius: 4,
  },
  bubbleAuthor: {
    fontSize: 12,
    color: colors.palette.bluejeansLight,
    marginBottom: 4,
  },
  bubbleText: {
    fontSize: 16,
    color: "black",
  },
  currentUserText: {
    color: "white",
  },
  bubbleFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 6,
  },
  bubbleTimestamp: {
    fontSize: 11,
    color: "gray",
  },
  currentUserDetails: {
    color: "rgba(255,255,255,0.7)",
  },
  attachmentIndicator: {
    flexDirection: "row",
    alignItems: "center",
  },
  attachmentCountText: {
    fontSize: 11,
    color: "gray",
  },
  attachmentGallery: {
    marginTop: 8,
  },
  attachmentGalleryContent: {
    gap: 8,
  },
  attachmentThumb: {
    borderRadius: 8,
    borderCurve: "continuous",
    overflow: "hidden",
  },
  attachmentImage: {
    width: 70,
    height: 70,
    borderRadius: 8,
    borderCurve: "continuous",
  },
  attachmentPlaceholder: {
    width: 70,
    height: 70,
    borderRadius: 8,
    borderCurve: "continuous",
    backgroundColor: colors.palette.neutral200,
    alignItems: "center",
    justifyContent: "center",
  },
  replyContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "white",
    borderTopWidth: 1,
    borderTopColor: colors.palette.neutral300,
  },
  replyInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    borderRadius: 20,
    borderCurve: "continuous",
    backgroundColor: colors.palette.neutral200,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: 16,
    color: colors.palette.neutral800,
  },
  sendButton: {
    marginLeft: 8,
    marginBottom: 4,
    padding: 8,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
})
