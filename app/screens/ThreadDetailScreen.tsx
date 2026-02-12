import React, { FC, useEffect, useState, useCallback, useRef, memo } from "react"
import { observer } from "mobx-react-lite"
import * as ParseAPI from "../services/parse/ParseAPI"
import {
  ViewStyle,
  View,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native"
import { NativeStackScreenProps } from "@react-navigation/native-stack"
import { Entypo } from "@expo/vector-icons"
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
  onPress,
  id,
}: {
  descripcion: string
  autorName: string
  timestamp: string
  isCurrentUser: boolean
  hasAttachment: boolean
  attachmentCount: number
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

  return (
    <Pressable onPress={handlePress}>
      <View style={[styles.messageContainer, containerStyle]}>
        {!isCurrentUser ? (
          <Text style={styles.autorLabel} weight="semiBold">
            {autorName}
          </Text>
        ) : null}
        <Text style={[styles.messageText, textStyle]}>{descripcion}</Text>
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

    const threadId = route.params["threadId"] as string
    const threadSubject = route.params["threadSubject"] as string
    const estudianteId = route.params["estudianteId"] as string | null
    const grupoData = route.params["grupoData"] as any | null
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

          // Count attachments for this message
          const attachmentCount = countAttachments(msg.id)

          processed.push({
            id: msg.id,
            objectId: msg.id,
            descripcion,
            autorName,
            autorId: autorObj?.id || "",
            timestamp: moment(msg.createdAt).format("ddd DD/MMM HH:mm"),
            createdAt: msg.createdAt,
            isCurrentUser: autorObj?.id === currentUser.id,
            hasAttachment: attachmentCount > 0,
            attachmentCount,
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

    function countAttachments(anuncioId: string): number {
      let count = 0
      for (const photo of photosRef.current) {
        const anuncioInPhoto = photo.get("anuncio")
        if (anuncioInPhoto && anuncioInPhoto.id === anuncioId) {
          count++
        }
      }
      return count
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

        const anuncioId = await ParseAPI.saveAnuncioWithThread(
          params,
          grupoData,
          estudianteId,
          null,
          threadId,
        )

        if (anuncioId && anuncioId.length === 10) {
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
      (messageId: string) => {
        const msg = messages.find((m) => m.id === messageId)
        if (msg) {
          const params = {
            ...msg,
            reloadTable: reloadParent,
          }
          navigation.navigate("mensajeDetail", params)
        }
      },
      [messages, navigation, reloadParent],
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
      <Screen style={$root} preset="fixed">
        <KeyboardAvoidingView
          style={styles.keyboardAvoid}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
        >
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator
                size="large"
                color={colors.palette.actionBlue}
              />
            </View>
          ) : (
            <>
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
            </>
          )}
        </KeyboardAvoidingView>
      </Screen>
    )
  },
)

const $root: ViewStyle = {
  flex: 1,
  backgroundColor: colors.palette.bluejeansClear,
}

const styles = StyleSheet.create({
  keyboardAvoid: {
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
