import React, { FC, useEffect, useState, useCallback, useRef, memo } from "react"
import { observer } from "mobx-react-lite"
import * as ParseAPI from "../services/parse/ParseAPI"
import { ViewStyle, View, Pressable, Image, FlatList, StyleSheet, ActivityIndicator } from "react-native"
import { NativeStackScreenProps } from "@react-navigation/native-stack"
import { Entypo } from '@expo/vector-icons';
import { AppStackScreenProps } from "app/navigators"
import { Screen, Text } from "app/components"
import { colors } from "../theme"
import * as Haptics from 'expo-haptics';
import moment from 'moment';

const EMPTY_STATE_COPY = "Aquí van a aparecer mensajes de la Escuela. Por ahora no hay mensajes."

interface AlumnoMensajesScreenProps extends NativeStackScreenProps<AppStackScreenProps<"AlumnoMensajes">> {}

interface MessageItem {
  id: string
  objectId: string
  estudianteObj: any
  tipo: string
  timestamp: string
  autor: any
  autorName: string
  destino: string
  descripcionPreview: string
  descripcion: string
  momentosData: any
  hasAttachment: boolean
  attachmentCount: number
  anuncioSeen: boolean
  aprobado: boolean
  isCurrentUser: boolean
}

// Memoized message item component
const MessageListItem = memo(function MessageListItem({
  id,
  descripcionPreview,
  autorName,
  timestamp,
  hasAttachment,
  attachmentCount,
  isCurrentUser,
  onPress,
}: {
  id: string
  descripcionPreview: string
  autorName: string
  timestamp: string
  hasAttachment: boolean
  attachmentCount: number
  isCurrentUser: boolean
  onPress: (id: string) => void
}) {
  const handlePress = useCallback(() => {
    onPress(id)
  }, [id, onPress])

  const containerStyle = isCurrentUser ? styles.currentUserMessage : styles.otherUserMessage
  const textStyle = isCurrentUser ? styles.currentUserText : undefined
  const detailsStyle = isCurrentUser ? styles.currentUserDetails : undefined
  const iconTintStyle = isCurrentUser ? styles.currentUserIcon : undefined
  const chevronColor = isCurrentUser ? "rgba(255, 255, 255, 0.7)" : "rgba(0, 0, 0, 0.5)"
  const badgeStyle = isCurrentUser ? styles.currentUserBadge : styles.otherUserBadge

  return (
    <Pressable onPress={handlePress}>
      <View style={[styles.messageContainer, containerStyle]}>
        <Text style={[styles.messageText, textStyle]}>{descripcionPreview}</Text>
        <View style={styles.messageFooter}>
          <Text style={[styles.messageDetails, detailsStyle]}>{autorName} • {timestamp}</Text>
          <View style={styles.iconContainer}>
            {hasAttachment ? (
              <View style={styles.attachmentIndicator}>
                <Image
                  style={[styles.attachmentImage, iconTintStyle]}
                  source={require('../../assets/images/attachmentIconBlack.png')}
                />
                {attachmentCount > 1 ? (
                  <View style={[styles.attachmentBadge, badgeStyle]}>
                    <Text style={styles.attachmentBadgeText}>{attachmentCount}</Text>
                  </View>
                ) : null}
              </View>
            ) : null}
            <Entypo
              name="chevron-right"
              size={16}
              color={chevronColor}
            />
          </View>
        </View>
      </View>
    </Pressable>
  )
})

export const AlumnoMensajesScreen: FC<AlumnoMensajesScreenProps> = observer(function AlumnoMensajesScreen({ route, navigation }) {
  const [isLoading, setIsLoading] = useState(true)
  const [data, setData] = useState<MessageItem[]>([])
  const [hasData, setHasData] = useState(true)
  const [flatListIsRefreshing, setFlatListIsRefreshing] = useState(false)

  // Use refs for mutable values that don't need to trigger re-renders
  const anunciosPhotoArrRef = useRef<any[]>([])
  const estudianteDataRef = useRef({ id: "", name: "" })
  const currentUserIdRef = useRef("")

  // Extract params once
  const estudianteObjId = route.params["estudianteObjectId"] as string
  const estudianteNombre = route.params["nombre"] as string

  const reloadActividadList = useCallback(() => {
    fetchAnunciosFromServer(estudianteDataRef.current.id)
  }, [])

  const enviarAction = useCallback(() => {
    const actividadParams = {
      actividadType: 4,
      grupoName: estudianteDataRef.current.name,
      grupoId: null,
      estudianteId: estudianteDataRef.current.id,
      reloadList: reloadActividadList
    }
    navigation.navigate("CrearActividad", actividadParams)
  }, [navigation, reloadActividadList])

  const headerRightBttnPressed = useCallback(() => {
    Haptics.notificationAsync()
    enviarAction()
  }, [enviarAction])

  useEffect(() => {
    estudianteDataRef.current = { id: estudianteObjId, name: estudianteNombre }
    navigation.setOptions({
      title: estudianteNombre,
      headerBackTitleVisible: false,
      headerRight: () => (
        <Entypo name="plus" size={28} style={styles.headerRightIcon} color={colors.palette.actionColor} onPress={headerRightBttnPressed} />
      ),
    })
    getCurrentUserType()
    fetchAnunciosFromServer(estudianteObjId)
  }, [estudianteObjId, estudianteNombre, navigation, headerRightBttnPressed])

  async function getCurrentUserType() {
    const currentUser = await ParseAPI.getCurrentUserObj()
    currentUserIdRef.current = currentUser.id
  }

  async function fetchAnunciosFromServer(objId: string) {
    const resultObj = await ParseAPI.fetchGrupoAndEstudianteAnuncios(objId)
    const anunciosRes = resultObj.mainResultArr
    const attachmentsArr = resultObj.anuncioPhotoArr

    anunciosPhotoArrRef.current = attachmentsArr

    if (anunciosRes.length === 0) {
      setHasData(false)
      setIsLoading(false)
    } else {
      processAnunciosForDisplay(anunciosRes)
    }
  }

  function processAnunciosForDisplay(anunciosArr: any[]) {
    const estudiantesArr: MessageItem[] = []
    const currentUserId = currentUserIdRef.current

    for (let i = 0; i < anunciosArr.length; i++) {
      const object = anunciosArr[i]
      let tipo = "Mensaje"
      if (object.get('tipo') != null) {
        tipo = object.get('tipo').get('nombre')
      }
      const timestamp = moment(object.createdAt).format("dd DD/MMM")

      let destino = ""
      let estudianteObj = null
      if (object.get('estudiante') != null) {
        destino = object.get('estudiante').get('NOMBRE')
        estudianteObj = object.get('estudiante')
      } else if (object.get('grupos') != null) {
        // grupo message
        const grupos = object.get('grupos')
        if (grupos.length > 6) {
          destino = "Toda la escuela."
        } else {
          for (let j = 0; j < grupos.length; j++) {
            const grupo = grupos[j]
            if (grupo != null) {
              const grupoId = grupo.get('grupoId')
              if (grupoId) {
                if (j === grupos.length - 1) {
                  destino = destino + grupoId + "."
                } else {
                  destino = destino + grupoId + ", "
                }
              }
            }
          }
        }
      }

      let autorName = ""
      const autorObj = object.get('autor')
      if (autorObj) {
        const usertype = autorObj.get('usertype')
        // If autor usertype es 2 then add parentesco else username
        if (usertype === 2) {
          destino = "Escuela"
          autorName = autorObj.get('parentesco')
        } else {
          autorName = autorObj.get('username')
        }
      }

      const momentosData = object.get('momento')
      let descripcion = ""
      if (object.get('momento') != null) {
        tipo = "Momentos"
        let comentariosString = ""
        if (momentosData["alimentosComentarios"]) {
          comentariosString = momentosData["alimentosComentarios"]
        }
        descripcion = "Momentos del día\n\n Comentarios: " + comentariosString
      } else if (object.get('descripcion')) {
        descripcion = object.get('descripcion')
      }

      // Descripcion
      if (descripcion.length > 100) {
        descripcion = descripcion.substring(0, 100)
        if (descripcion.includes("\n")) {
          descripcion = descripcion.replace("\n", " ")
        }
        descripcion = descripcion + "..."
      }

      // Attachment - count all attachments for this anuncio
      const attachmentCount = countAttachmentsForAnuncio(object.id)
      const hasAttachment = attachmentCount > 0

      const dataItem: MessageItem = {
        id: object.id,
        objectId: object.id,
        estudianteObj: estudianteObj,
        tipo: tipo,
        timestamp: timestamp,
        autor: autorObj,
        autorName: autorName,
        destino: destino,
        descripcionPreview: descripcion,
        descripcion: object.get('descripcion'),
        momentosData: momentosData,
        hasAttachment: hasAttachment,
        attachmentCount: attachmentCount,
        anuncioSeen: true,
        aprobado: object.get('aprobado'),
        isCurrentUser: autorObj?.id === currentUserId
      }
      estudiantesArr.push(dataItem)
    }

    setIsLoading(false)
    setData(estudiantesArr)
  }

  function countAttachmentsForAnuncio(anuncioObjId: string): number {
    const resultAnuncioPhoto = anunciosPhotoArrRef.current
    let count = 0
    for (let i = 0; i < resultAnuncioPhoto.length; i++) {
      const object = resultAnuncioPhoto[i]
      const anuncioInPhoto = object.get('anuncio')
      if (anuncioInPhoto.id === anuncioObjId) {
        count++
      }
    }
    return count
  }

  const refreshFlatList = useCallback(() => {
    setFlatListIsRefreshing(true)
    fetchAnunciosFromServer(estudianteDataRef.current.id).then(() => {
      setFlatListIsRefreshing(false)
    })
  }, [])

  // Create item lookup for navigation
  const itemLookupRef = useRef<Map<string, MessageItem>>(new Map())

  useEffect(() => {
    const map = new Map<string, MessageItem>()
    data.forEach(item => {
      map.set(item.id, item)
    })
    itemLookupRef.current = map
  }, [data])

  const didSelectItem = useCallback((itemId: string) => {
    const item = itemLookupRef.current.get(itemId)
    if (item) {
      navigation.navigate("mensajeDetail", item)
    }
  }, [navigation])

  const renderItem = useCallback(({ item }: { item: MessageItem }) => (
    <MessageListItem
      id={item.id}
      descripcionPreview={item.descripcionPreview}
      autorName={item.autorName}
      timestamp={item.timestamp}
      hasAttachment={item.hasAttachment}
      attachmentCount={item.attachmentCount}
      isCurrentUser={item.isCurrentUser}
      onPress={didSelectItem}
    />
  ), [didSelectItem])

  const keyExtractor = useCallback((item: MessageItem) => item.id, [])

  return (
    <Screen style={$root} preset="fixed">
      {isLoading ? (
        <ActivityIndicator size="large" color={colors.palette.actionBlue} animating={isLoading} style={styles.loadingIndicator} hidesWhenStopped={true} />
      ) : (
        <>
          {hasData ? (
            <FlatList
              data={data}
              style={styles.flatlist}
              refreshing={flatListIsRefreshing}
              onRefresh={refreshFlatList}
              renderItem={renderItem}
              keyExtractor={keyExtractor}
            />
          ) : (
            <View style={styles.emptyStateView}>
              <Text text={EMPTY_STATE_COPY} />
              <Image source={require('../../assets/images/kido.png')} style={styles.emptyStateLogoImg} />
            </View>
          )}
        </>
      )}
    </Screen>
  )
})

const $root: ViewStyle = {
  flex: 1,
}

const styles = StyleSheet.create({
  flatlist: {
    paddingTop: 8,
    backgroundColor: colors.palette.bluejeansClear,
  },
  messageContainer: {
    maxWidth: '80%',
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
  },
  currentUserMessage: {
    alignSelf: 'flex-end',
    backgroundColor: colors.palette.actionBlue,
    marginRight: 10,
  },
  otherUserMessage: {
    alignSelf: 'flex-start',
    backgroundColor: 'white',
    marginLeft: 10,
  },
  messageText: {
    fontSize: 16,
    color: 'black',
  },
  currentUserText: {
    color: 'white',
  },
  messageFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 5,
  },
  messageDetails: {
    fontSize: 12,
    color: 'gray',
  },
  currentUserDetails: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  iconContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  attachmentIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 4,
  },
  attachmentImage: {
    height: 16,
    width: 16,
    tintColor: 'rgba(0, 0, 0, 0.5)',
  },
  currentUserIcon: {
    tintColor: 'rgba(255, 255, 255, 0.7)',
  },
  attachmentBadge: {
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 2,
    paddingHorizontal: 3,
  },
  otherUserBadge: {
    backgroundColor: colors.palette.actionBlue,
  },
  currentUserBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  attachmentBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
    textAlign: 'center',
    includeFontPadding: false,
    textAlignVertical: 'center',
    lineHeight: 12,
  },
  emptyStateText: {
    color: colors.palette.bittersweetDark,
    fontWeight: '700'
  },
  emptyStateLogoImg: {
    height: 80,
    resizeMode: 'contain',
    marginTop: 40
  },
  emptyStateView: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    marginTop: 92
  },
  headerRightIcon: {
    marginTop: 2,
  },
  loadingIndicator: {
    marginTop: 16,
  },
})
