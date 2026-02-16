import React, { FC, useEffect, useState, useCallback, useRef, memo } from "react"
import { observer } from "mobx-react-lite"
import * as ParseAPI from "../services/parse/ParseAPI"
import { getSignedObjectUrl, getS3FileSignedURL } from "../services/AWSService"
import {
  ViewStyle,
  View,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  Pressable,
  Platform,
  Alert,
} from "react-native"
import { Image } from "expo-image"
import { NativeStackScreenProps } from "@react-navigation/native-stack"
import { Entypo, MaterialCommunityIcons } from "@expo/vector-icons"
import { AppStackScreenProps } from "app/navigators"
import { Screen, Text } from "app/components"
import { colors } from "../theme"
import { useStores } from "../models"
import * as Haptics from "expo-haptics"
import moment from "moment"
import "moment/locale/es"

interface ThreadDetailScreenProps
  extends NativeStackScreenProps<AppStackScreenProps<"ThreadDetail">> {}

interface ThreadMessage {
  id: string
  objectId: string
  descripcion: string
  autorName: string
  autorId: string
  timestamp: string
  createdAt: Date
  isCurrentUser: boolean
  hasAttachment: boolean
  attachmentCount: number
  firstPhotoId: string | null
  firstPhotoTipo: string
  isNewBucket: boolean
  thumbnailUrl: string | null
  momentosData: any
  estudianteObj: any
  autor: any
  destino: string
  aprobado: boolean
  tipo: string
  msgType: number
}

// Memoized message bubble component
const MessageBubble = memo(function MessageBubble({
  descripcion,
  autorName,
  timestamp,
  isCurrentUser,
  hasAttachment,
  attachmentCount,
  thumbnailUrl,
  firstPhotoTipo,
  onPress,
  id,
}: {
  descripcion: string
  autorName: string
  timestamp: string
  isCurrentUser: boolean
  hasAttachment: boolean
  attachmentCount: number
  thumbnailUrl: string | null
  firstPhotoTipo: string
  onPress: (id: string) => void
  id: string
}) {
  const handlePress = useCallback(() => {
    onPress(id)
  }, [id, onPress])

  const containerStyle = isCurrentUser
    ? styles.currentUserMessage
    : styles.otherUserMessage

  const textStyle = isCurrentUser ? styles.currentUserText : undefined
  const detailsStyle = isCurrentUser ? styles.currentUserDetails : undefined

  const showText = descripcion.length > 0

  return (
    <Pressable onPress={handlePress}>
      <View style={[styles.messageContainer, containerStyle]}>
        {!isCurrentUser ? (
          <Text style={styles.autorLabel} weight="semiBold">
            {autorName}
          </Text>
        ) : null}
        {/* Inline thumbnail */}
        {hasAttachment && thumbnailUrl ? (
          <View style={styles.thumbnailWrapper}>
            <Image
              source={{ uri: thumbnailUrl }}
              style={styles.bubbleThumbnail}
              contentFit="cover"
              cachePolicy="memory-disk"
              transition={200}
            />
            {attachmentCount > 1 ? (
              <View style={styles.thumbnailCountBadge}>
                <Text style={styles.thumbnailCountText}>+{attachmentCount - 1}</Text>
              </View>
            ) : null}
          </View>
        ) : hasAttachment && !thumbnailUrl ? (
          <View style={styles.thumbnailPlaceholder}>
            {firstPhotoTipo === "PDF" ? (
              <MaterialCommunityIcons name="file-pdf-box" size={32} color={isCurrentUser ? "rgba(255,255,255,0.8)" : colors.palette.bittersweetLight} />
            ) : firstPhotoTipo === "VID" ? (
              <MaterialCommunityIcons name="play-circle" size={32} color={isCurrentUser ? "rgba(255,255,255,0.8)" : colors.palette.bluejeansLight} />
            ) : (
              <ActivityIndicator size="small" color={isCurrentUser ? "white" : "gray"} />
            )}
          </View>
        ) : null}
        {showText ? (
          <Text style={[styles.messageText, textStyle, hasAttachment ? styles.bubbleTextWithAttachment : undefined]}>
            {descripcion}
          </Text>
        ) : null}
        <View style={styles.messageFooter}>
          <Text style={[styles.messageDetails, detailsStyle]}>
            {timestamp}
          </Text>
          {hasAttachment ? (
            <View style={styles.attachmentIndicator}>
              <Entypo
                name="attachment"
                size={12}
                color={isCurrentUser ? "rgba(255,255,255,0.7)" : "gray"}
              />
              {attachmentCount > 1 ? (
                <Text
                  style={[
                    styles.attachmentBadgeText,
                    isCurrentUser ? styles.currentUserDetails : undefined,
                  ]}
                >
                  {" "}
                  {attachmentCount}
                </Text>
              ) : null}
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  )
})

export const ThreadDetailScreen: FC<ThreadDetailScreenProps> = observer(
  function ThreadDetailScreen({ route, navigation }) {
    const [isLoading, setIsLoading] = useState(true)
    const [messages, setMessages] = useState<ThreadMessage[]>([])
    const [replyText, setReplyText] = useState("")
    const [isSending, setIsSending] = useState(false)

    const flatListRef = useRef<FlatList>(null)
    const photosRef = useRef<any[]>([])
    const tipoAnuncioRef = useRef<any>(null)
    const rootGruposRef = useRef<any[] | null>(null)

    const threadId = route.params["threadId"] as string
    const threadSubject = route.params["threadSubject"] as string
    const estudianteId = route.params["estudianteId"] as string | null
    const grupoData = route.params["grupoData"] as any[] | null
    const reloadParent = route.params["reloadTable"] as
      | ((msgType: number) => void)
      | undefined

    const {
      authenticationStore: { authUserEscuela, authUsertype },
    } = useStores()

    useEffect(() => {
      navigation.setOptions({
        headerTitle: threadSubject || "Conversación",
        headerBackTitleVisible: false,
      })
      loadThreadMessages()
    }, [])

    async function loadThreadMessages() {
      setIsLoading(true)
      try {
        const currentUser = await ParseAPI.getCurrentUserObj()
        const result = await ParseAPI.fetchThreadMessages(threadId)
        photosRef.current = result.photos

        // Capture tipo and grupos from the root (first) message for replies
        if (result.messages.length > 0) {
          const rootMsg = result.messages[0]
          tipoAnuncioRef.current = rootMsg.get("tipo")
          rootGruposRef.current = rootMsg.get("grupos") || null
        }

        const processed: ThreadMessage[] = []
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
              destino = grupos
                .map((g: any) => g?.get?.("grupoId") || "")
                .filter(Boolean)
                .join(", ")
            }
          }

          let descripcion = msg.get("descripcion") || ""
          const momentosData = msg.get("momento")
          if (momentosData) {
            descripcion = "Momentos del Día"
            if (momentosData.alimentosComentarios) {
              descripcion += "\n" + momentosData.alimentosComentarios
            }
          }

          // Get attachment data for this message
          const photoData = getPhotoData(msg.id)
          const awsAttachmentFlag = !!msg.get("awsAttachment")

          processed.push({
            id: msg.id,
            objectId: msg.id,
            descripcion,
            autorName,
            autorId: autorObj?.id || "",
            timestamp: moment(msg.createdAt).format("ddd DD/MMM HH:mm"),
            createdAt: msg.createdAt,
            isCurrentUser: autorObj?.id === currentUser.id,
            hasAttachment: photoData.count > 0 || awsAttachmentFlag,
            attachmentCount: photoData.count > 0 ? photoData.count : (awsAttachmentFlag ? 1 : 0),
            firstPhotoId: photoData.firstPhotoId,
            firstPhotoTipo: photoData.firstPhotoTipo,
            isNewBucket: photoData.isNewBucket,
            thumbnailUrl: null,
            momentosData,
            estudianteObj: msg.get("estudiante"),
            autor: autorObj,
            destino,
            aprobado: msg.get("aprobado"),
            tipo: msg.get("tipo")?.get?.("nombre") || "Mensaje",
            msgType: 0,
          })
        }

        setMessages(processed)
        // Fetch thumbnails in the background after rendering messages
        loadThumbnails(processed)
      } catch (error) {
        console.error("Error loading thread messages:", error)
        Alert.alert(
          "Error",
          "No fue posible cargar los mensajes de la conversación.",
        )
      } finally {
        setIsLoading(false)
      }
    }

    function getPhotoData(anuncioId: string): { count: number; firstPhotoId: string | null; isNewBucket: boolean; firstPhotoTipo: string } {
      let count = 0
      let firstPhotoId: string | null = null
      let isNewBucket = false
      let firstPhotoTipo = "JPG"
      for (const photo of photosRef.current) {
        const anuncioInPhoto = photo.get("anuncio")
        if (anuncioInPhoto && anuncioInPhoto.id === anuncioId) {
          if (count === 0) {
            firstPhotoId = photo.id
            isNewBucket = !!photo.get("newS3Bucket")
            firstPhotoTipo = photo.get("TipoArchivo") || "JPG"
          }
          count++
        }
      }
      return { count, firstPhotoId, isNewBucket, firstPhotoTipo }
    }

    async function loadThumbnails(viewModels: ThreadMessage[]) {
      const updated = [...viewModels]

      // First pass: resolve messages with awsAttachment but no firstPhotoId
      for (const msg of updated) {
        if (msg.hasAttachment && !msg.firstPhotoId) {
          try {
            const photos = await ParseAPI.fetchAnuncioPhotos(msg.objectId)
            if (photos && photos.length > 0) {
              const photo = photos[0]
              msg.firstPhotoId = photo.id
              msg.firstPhotoTipo = photo.get("TipoArchivo") || "JPG"
              msg.isNewBucket = !!photo.get("newS3Bucket")
              msg.attachmentCount = photos.length
              // Store in photosRef so handleMessagePress can find them
              photosRef.current.push(...photos)
            }
          } catch { /* leave as-is */ }
        }
      }

      // Second pass: fetch thumbnail URLs for image attachments
      const promises: Promise<void>[] = []
      for (const msg of updated) {
        if (msg.firstPhotoId && !msg.thumbnailUrl && msg.firstPhotoTipo === "JPG") {
          const photoId = msg.firstPhotoId
          if (msg.isNewBucket) {
            promises.push(
              getSignedObjectUrl("resized-" + photoId)
                .then((url) => { msg.thumbnailUrl = url })
                .catch(() => { /* thumbnail not available, leave null */ })
            )
          } else {
            // Old bucket: get signed URL for original (no resized version)
            promises.push(
              getS3FileSignedURL(photoId)
                .then((url) => { msg.thumbnailUrl = url })
                .catch(() => { /* thumbnail not available, leave null */ })
            )
          }
        }
      }

      if (promises.length > 0) {
        await Promise.allSettled(promises)
      }
      setMessages([...updated])
    }

    const sendReply = useCallback(async () => {
      if (replyText.trim().length === 0) return

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
      setIsSending(true)

      try {
        const currentUser = await ParseAPI.getCurrentUserObj()
        const isAprobado = authUsertype !== 1 // Teachers need approval

        const params: Record<string, any> = {
          aprobado: isAprobado,
          descripcion: replyText.trim(),
          autor: currentUser,
          awsAttachment: false,
          materia: "",
          sentFrom: "skolaRN_" + Platform.OS,
        }

        if (tipoAnuncioRef.current) {
          params["tipo"] = tipoAnuncioRef.current
        }

        // Pass all grupos from the root message so the reply has the same scope
        const gruposForReply = rootGruposRef.current
        if (gruposForReply && gruposForReply.length > 0) {
          params["grupos"] = gruposForReply
        }

        const { id: anuncioId } = await ParseAPI.saveAnuncioWithThread(
          params,
          null, // don't pass single grupo — grupos are in params
          estudianteId,
          null,
          threadId,
        )

        if (anuncioId) {
          // Trigger notifications
          let cloudFuncName = "adminApprovedAnuncio"
          if (authUsertype === 1) {
            cloudFuncName = "teacherAnuncioToBeApproved"
          }
          ParseAPI.runCloudCodeFunction(cloudFuncName, {
            anuncioObjectId: anuncioId,
            escuelaObjId: authUserEscuela,
          })

          setReplyText("")
          // Reload thread messages
          await loadThreadMessages()

          // Scroll to bottom
          setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true })
          }, 300)

          if (reloadParent) {
            reloadParent(0)
          }
        } else {
          Alert.alert("Error", "No fue posible enviar el mensaje.")
        }
      } catch (error) {
        console.error("Error sending reply:", error)
        Alert.alert("Error", "Ocurrió un error al enviar el mensaje.")
      } finally {
        setIsSending(false)
      }
    }, [
      replyText,
      threadId,
      estudianteId,
      grupoData,
      authUsertype,
      authUserEscuela,
      reloadParent,
    ])

    const handleMessagePress = useCallback(
      async (messageId: string) => {
        const msg = messages.find((m) => m.id === messageId)
        if (!msg) return

        if (msg.hasAttachment && msg.firstPhotoId) {
          // Navigate directly to AttachmentDetail for messages with attachments
          try {
            navigation.navigate("AttachmentDetail", {
              objectId: msg.firstPhotoId,
              tipo: msg.firstPhotoTipo,
              isNewBucket: msg.isNewBucket,
            })
          } catch (error) {
            console.error("Error navigating to attachment:", error)
          }
        } else if (msg.hasAttachment && !msg.firstPhotoId) {
          // awsAttachment flag is true but no AnuncioPhoto was found in bulk query
          // Try fetching on-demand for this specific message
          try {
            const photos = await ParseAPI.fetchAnuncioPhotos(msg.objectId)
            if (photos && photos.length > 0) {
              const photo = photos[0]
              navigation.navigate("AttachmentDetail", {
                objectId: photo.id,
                tipo: photo.get("TipoArchivo") || "JPG",
                isNewBucket: !!photo.get("newS3Bucket"),
              })
            }
          } catch (error) {
            console.error("Error fetching attachment on-demand:", error)
          }
        }
      },
      [messages, navigation],
    )

    const renderMessage = useCallback(
      ({ item }: { item: ThreadMessage }) => (
        <MessageBubble
          id={item.id}
          descripcion={item.descripcion}
          autorName={item.autorName}
          timestamp={item.timestamp}
          isCurrentUser={item.isCurrentUser}
          hasAttachment={item.hasAttachment}
          attachmentCount={item.attachmentCount}
          thumbnailUrl={item.thumbnailUrl}
          firstPhotoTipo={item.firstPhotoTipo}
          onPress={handleMessagePress}
        />
      ),
      [handleMessagePress],
    )

    const keyExtractor = useCallback(
      (item: ThreadMessage) => item.id,
      [],
    )

    return (
      <Screen
        style={$root}
        preset="fixed"
        contentContainerStyle={$contentContainer}
        KeyboardAvoidingViewProps={{ keyboardVerticalOffset: 90 }}
      >
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator
              size="large"
              color={colors.palette.actionBlue}
            />
          </View>
        ) : (
          <View style={styles.chatContainer}>
            {messages.length > 0 && messages[0].destino ? (
              <View style={styles.threadInfoBar}>
                <Text style={styles.threadInfoText}>
                  {messages[0].destino}
                </Text>
                <Text style={styles.threadCountText}>
                  {messages.length}{" "}
                  {messages.length === 1 ? "mensaje" : "mensajes"}
                </Text>
              </View>
            ) : null}

            <FlatList
              ref={flatListRef}
              data={messages}
              renderItem={renderMessage}
              keyExtractor={keyExtractor}
              style={styles.messagesList}
              contentContainerStyle={styles.messagesContent}
              onContentSizeChange={() =>
                flatListRef.current?.scrollToEnd({ animated: false })
              }
            />

            <View style={styles.replyContainer}>
              <TextInput
                style={styles.replyInput}
                value={replyText}
                onChangeText={setReplyText}
                placeholder="Responder en la conversación..."
                placeholderTextColor={colors.palette.neutral400}
                multiline
                maxLength={2000}
                editable={!isSending}
              />
              {isSending ? (
                <ActivityIndicator
                  size="small"
                  color={colors.palette.actionBlue}
                  style={styles.sendButton}
                />
              ) : (
                <Pressable
                  onPress={sendReply}
                  style={[
                    styles.sendButton,
                    replyText.trim().length === 0
                      ? styles.sendButtonDisabled
                      : null,
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
  },
)

const $root: ViewStyle = {
  flex: 1,
  backgroundColor: colors.palette.bluejeansClear,
}

const $contentContainer: ViewStyle = {
  flex: 1,
}

const styles = StyleSheet.create({
  chatContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  threadInfoBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: colors.palette.bluejeansLight,
  },
  threadInfoText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  threadCountText: {
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
  messageContainer: {
    maxWidth: "80%",
    borderRadius: 16,
    borderCurve: "continuous",
    padding: 12,
    marginBottom: 8,
  },
  currentUserMessage: {
    alignSelf: "flex-end",
    backgroundColor: colors.palette.actionBlue,
    marginRight: 8,
    borderBottomRightRadius: 4,
  },
  otherUserMessage: {
    alignSelf: "flex-start",
    backgroundColor: "white",
    marginLeft: 8,
    borderBottomLeftRadius: 4,
  },
  autorLabel: {
    fontSize: 12,
    color: colors.palette.bluejeansLight,
    marginBottom: 4,
  },
  messageText: {
    fontSize: 16,
    color: "black",
  },
  currentUserText: {
    color: "white",
  },
  messageFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 6,
  },
  messageDetails: {
    fontSize: 11,
    color: "gray",
  },
  currentUserDetails: {
    color: "rgba(255, 255, 255, 0.7)",
  },
  attachmentIndicator: {
    flexDirection: "row",
    alignItems: "center",
  },
  attachmentBadgeText: {
    fontSize: 11,
    color: "gray",
  },
  thumbnailWrapper: {
    borderRadius: 10,
    borderCurve: "continuous",
    overflow: "hidden",
    marginBottom: 4,
    position: "relative",
  },
  bubbleThumbnail: {
    width: "100%",
    height: 160,
    borderRadius: 10,
    borderCurve: "continuous",
  },
  thumbnailCountBadge: {
    position: "absolute",
    top: 6,
    right: 6,
    backgroundColor: "rgba(0,0,0,0.55)",
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  thumbnailCountText: {
    color: "white",
    fontSize: 11,
    fontWeight: "bold",
  },
  thumbnailPlaceholder: {
    height: 80,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  bubbleTextWithAttachment: {
    marginTop: 4,
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
