import React, { FC, useEffect, useState, useCallback, useRef } from "react"
import * as ParseAPI from "../services/parse/ParseAPI"
import * as SQLiteAPI from "../services/sqlite/SQLiteAPI"
import * as AWSService from '../services/AWSService'
import { observer } from "mobx-react-lite"
import moment from 'moment';
import { useStores } from "../models"
// import { Image } from 'expo-image';
import { ViewStyle, Pressable, TextStyle, Alert, ActivityIndicator, View, FlatList, Image, TouchableOpacity } from "react-native"
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { NativeStackScreenProps } from "@react-navigation/native-stack"
import { AppStackScreenProps } from "app/navigators"
import { Screen, Text } from "app/components"
import * as Haptics from 'expo-haptics';
import { colors, spacing } from "../theme"
import { AntDesign } from '@expo/vector-icons';

// Convert HEIC/HEIF images to JPEG for S3 compatibility
const convertHeicToJpeg = async (uri: string, mimeType: string): Promise<string> => {
  const isHeic = mimeType?.toLowerCase().includes('heic') || mimeType?.toLowerCase().includes('heif')
  if (!isHeic) {
    return uri
  }

  const result = await ImageManipulator.manipulateAsync(
    uri,
    [],
    { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG }
  )
  return result.uri
}

const RESIZED_PREFIX = "resized-"

interface EventoViewScreenProps extends NativeStackScreenProps<AppStackScreenProps<"EventoView">> {}

interface GaleriaImage {
  eventoGaleriaObjId: string
  uri: string
  isNewBucket: boolean
}

export const EventoViewScreen: FC<EventoViewScreenProps> = observer(function EventoViewScreen({ route, navigation }: any) {
  const eventoObj = route.params?.eventoObj ? JSON.parse(JSON.stringify(route.params.eventoObj)) : null

  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingGallery, setIsLoadingGallery] = useState(true)
  const [eventoNombre, setEventoNombre] = useState("")
  const [fecha, setFecha] = useState("")
  const [hora, setHora] = useState("")
  const [lugar, setLugar] = useState("")
  const [descripcion, setDescripcion] = useState("")
  const [eventoPublico, setEventoPublico] = useState("")
  const [eventoRSVPCount, setEventoRSVPCount] = useState("")
  const [assetCount, setAssetCount] = useState(0)
  const [images, setImages] = useState<GaleriaImage[]>([])
  const [totalImgs, setTotalImgs] = useState(0)
  const [rsvpList, setRSVPList] = useState<any[]>([])

  // Use refs for mutable values that persist across async calls
  const imgCountRef = useRef(0)
  const galeriaCountRef = useRef(0)
  const currGaleriaImgRef = useRef(0)
  const tempImgURLArrRef = useRef<GaleriaImage[]>([])

  const {
    authenticationStore: {
      authUserEscuela,
    },
  } = useStores()


  useEffect(() => {
    setupComponents()
    fetchEventoGaleria()
  }, [])

  function setupComponents() {
    navigation.setOptions({
      headerBackTitleVisible: false,
    })
    if (!eventoObj) return

    const fechaObj = eventoObj.fecha
    const fechaStr = moment(fechaObj).format('dddd DD MMMM YYYY')
    setFecha(fechaStr)
    const horaStr = moment(fechaObj).format('HH:mm')
    setHora(horaStr)
    setEventoNombre(eventoObj.nombre)
    setLugar("Lugar: " + eventoObj.lugar)
    setDescripcion(eventoObj.descripcion)
    const publicoArr = eventoObj.publico
    if (publicoArr == null || publicoArr.includes("all")) {
      setEventoPublico("Público: Toda la escuela")
    } else {
      fetchDBGrupos(eventoObj.publico)
    }
    if (eventoObj.confirmacion) {
      fetchEventoAsistencia()
    }
  }

  async function fetchDBGrupos(publico: string[]) {
    const dbResults: any[] = await SQLiteAPI.readDBPromise("Grupo", "WHERE TRUE", [])
    const tempGruposArr: string[] = []
    if (dbResults.length > 0) {
      for (const grupo of dbResults) {
        if (publico.includes(grupo.objectId)) {
          tempGruposArr.push(grupo.name)
        }
      }
      if (tempGruposArr.length > 0) {
        setEventoPublico("Público: " + tempGruposArr.join(', '))
      }
    }
  }

  async function fetchEventoAsistencia() {
    const eventoRSVPRes = await ParseAPI.fetchEventoRSVP(eventoObj.objectId)
    setEventoRSVPCount("Asistencia: " + eventoRSVPRes.length)
    setRSVPList(eventoRSVPRes)
  }

  async function fetchEventoGaleria() {
    // Reset refs for fresh fetch
    currGaleriaImgRef.current = 0
    tempImgURLArrRef.current = []

    const galeriaRes = await ParseAPI.fetchEventoGaleria(eventoObj.objectId)
    if (galeriaRes != null) {
      if (galeriaRes.length === 0) {
        setIsLoadingGallery(false)
      } else {
        galeriaCountRef.current = galeriaRes.length
        processGaleriaData(galeriaRes)
      }
    } else {
      setIsLoadingGallery(false)
    }
  }

  function processGaleriaData(data: any) {
    data.forEach((item: any) => {
      if (item.get("newS3Bucket")) {
        fetchS3SignedObjectUrl(item.id)
      } else {
        fetchResizedPhotoURL(item.id)
      }
    })
  }

  async function fetchS3SignedObjectUrl(objectId: string) {
    const resizedObjId = RESIZED_PREFIX + objectId
    const signedURL = await AWSService.getSignedObjectUrl(resizedObjId)
    if (signedURL != null) {
      pushImageURL(objectId, signedURL, true)
    } else {
      const fullSizeURL = await AWSService.getSignedObjectUrl(objectId)
      pushImageURL(objectId, fullSizeURL, true)
    }
  }

  async function fetchResizedPhotoURL(objectId: string) {
    const resizedObjId = RESIZED_PREFIX + objectId
    const signedURL = await AWSService.getS3FileSignedURL(resizedObjId)
    if (signedURL != null) {
      pushImageURL(objectId, signedURL, false)
    } else {
      fetchFullSizePhotoURL(objectId)
    }
  }

  async function fetchFullSizePhotoURL(objectId: string) {
    const signedURL = await AWSService.getS3FileSignedURL(objectId)
    if (signedURL != null) {
      pushImageURL(objectId, signedURL, false)
    }
  }

  function pushImageURL(objectId: string, newURL: string, isNewBucket: boolean) {
    currGaleriaImgRef.current = currGaleriaImgRef.current + 1
    const dataObj: GaleriaImage = {
      eventoGaleriaObjId: objectId,
      uri: newURL,
      isNewBucket: isNewBucket
    }
    tempImgURLArrRef.current.push(dataObj)
    if (currGaleriaImgRef.current === galeriaCountRef.current) {
      setTotalImgs(tempImgURLArrRef.current.length)
      setImages([...tempImgURLArrRef.current])
      setIsLoadingGallery(false)
    }
  }

  const cameraBttnPressed = useCallback(() => {
    Haptics.notificationAsync()
    adjuntarFotoAction()
  }, [])

  async function adjuntarFotoAction() {
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: false,
      allowsMultipleSelection: true,
      quality: 1,
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
    })
    setIsLoading(true)
    if (!result.canceled) {
      const assetsArr = result.assets
      const assetsArrLen = assetsArr.length
      setAssetCount(assetsArrLen)
      imgCountRef.current = assetsArrLen

      try {
        // Convert HEIC to JPEG for each asset
        const convertedAssets = await Promise.all(
          assetsArr.map(async (asset) => {
            const convertedUri = await convertHeicToJpeg(asset.uri, asset.mimeType ?? '')
            return convertedUri
          })
        )
        await Promise.all(convertedAssets.map(uri => createEventoGaleriaObject(uri)))
        onUploadComplete()
      } catch (error) {
        console.error("Error uploading images:", error)
        presentFeedback(
          "Error al subir fotos",
          "Ocurrió un error al subir las fotos. Por favor intenta de nuevo."
        )
      } finally {
        setIsLoading(false)
      }
    } else {
      setIsLoading(false)
    }
  }

  async function createEventoGaleriaObject(assetURI: string) {
    const resObjId = await ParseAPI.saveEventoGaleria(eventoObj.objectId)
    if (resObjId != null) {
      await uploadFileToAWSS3(resObjId, assetURI)
    } else {
      throw new Error("No fue posible guardar la foto")
    }
  }


  async function uploadFileToAWSS3(objectId: string, assetURL: string) {
    try {
      await AWSService.uploadImageDataToAWS(objectId, assetURL, 'image/jpg', true)
    } catch (error) {
      console.error("Error uploading to AWS:", error)
      imgCountRef.current--
      if (imgCountRef.current === 0) {
        presentFeedback(
          "Error al subir fotos",
          "Ocurrió un error al subir las fotos. Por favor intenta de nuevo."
        )
      }
    }
  }

  function onUploadComplete() {
    setIsLoading(false)
    runCloudCodeFunction()
    fetchEventoGaleria()
    const alertTitle = imgCountRef.current + " fotos han sido guardadas"
    presentFeedback(alertTitle, "Una notificación ha sido enviada a Papás.")
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

  function runCloudCodeFunction() {
    const cloudFuncName = "eventoFotoNueva"
    const params = { eventoNombre: eventoNombre, escuelaObjId: authUserEscuela, objectId: eventoObj.objectId }
    ParseAPI.runCloudCodeFunction(cloudFuncName, params)
  }

  const onImageClick = useCallback((item: GaleriaImage) => {
    const attachmentData = {
      objectId: item.eventoGaleriaObjId,
      tipo: "JPG",
      isNewBucket: item.isNewBucket
    }
    navigation.navigate('attachmentDetail', attachmentData)
  }, [navigation])

  const handleRSVPNavigation = useCallback(() => {
    const eventoData = {
      objectId: eventoObj.objectId,
      rsvpList: rsvpList
    }
    navigation.navigate('eventoRsvp' as any, eventoData)
  }, [navigation, eventoObj, rsvpList])

  const handleDeleteEvento = useCallback(() => {
    if (!eventoObj) return

    Alert.alert(
      "Eliminar Evento",
      "¿Deseas eliminar este evento? Esta acción no se puede deshacer.",
      [
        {
          text: "Cancelar",
          style: "cancel"
        },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            setIsLoading(true)
            try {
              const res = await ParseAPI.deleteEvento(eventoObj.objectId)
              if (res) {
                if (route.params?.reloadTable) {
                  route.params.reloadTable()
                }
                navigation.goBack()
              } else {
                presentFeedback("Error", "No fue posible eliminar el evento. Por favor intenta de nuevo.")
              }
            } catch (error) {
              Alert.alert(
                "Error",
                "No fue posible eliminar el evento. Por favor intenta de nuevo."
              )
            } finally {
              setIsLoading(false)
            }
          }
        }
      ]
    )
  }, [eventoObj, navigation, route.params])

  const handleLongPress = useCallback((item: GaleriaImage) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    Alert.alert(
      "Eliminar Foto",
      "¿Deseas eliminar esta foto? Esta acción no se puede deshacer.",
      [
        {
          text: "Cancelar",
          style: "cancel"
        },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            setIsLoading(true)
            try {
              const success = await ParseAPI.deleteEventoFoto(item.eventoGaleriaObjId)
              if (success) {
                const updatedImages = images.filter(img => img.eventoGaleriaObjId !== item.eventoGaleriaObjId)
                setImages(updatedImages)
                setTotalImgs(updatedImages.length)
                presentFeedback("Foto eliminada", "La foto ha sido eliminada exitosamente.")
              } else {
                presentFeedback("Error", "No fue posible eliminar la foto. Por favor intenta de nuevo.")
              }
            } catch (error) {
              console.error("Error deleting image:", error)
              presentFeedback("Error", "Ocurrió un error al eliminar la foto.")
            } finally {
              setIsLoading(false)
            }
          }
        }
      ]
    )
  }, [images])

  const renderGalleryItem = useCallback(({ item }: { item: GaleriaImage }) => (
    <TouchableOpacity
      style={$item}
      onPress={() => onImageClick(item)}
      onLongPress={() => handleLongPress(item)}
      delayLongPress={500}
    >
      <Image
        source={{ uri: item.uri }}
        width={100}
        height={120}
        style={$galleryImage}
      />
    </TouchableOpacity>
  ), [onImageClick, handleLongPress])

  const keyExtractor = useCallback((item: GaleriaImage, index: number) => index.toString(), [])

  return (
    <Screen style={$root} preset="scroll">
      <Text size="xl" text={eventoNombre} />
      <Text size="lg" text={fecha} />
      <Text size="md" weight="medium" text={hora} />
      <Text size="md" style={$label} text={lugar} />
      <Text size="md" style={$label} text={eventoPublico} />
      <Text size="sm" style={$label} text={descripcion} />

      {eventoRSVPCount.length > 0 &&
      <>
        <View style={$dividerView}></View>
        <TouchableOpacity onPress={handleRSVPNavigation}>
          <Text size="md" style={$rsvpLabel} text={eventoRSVPCount} />
        </TouchableOpacity>
        <View style={$dividerView}></View>
      </>
      }



      {isLoading ?
        <View>
          <Text size="xl" style={$savingText}>{"Guardando " + assetCount + " fotos."}</Text>
          <ActivityIndicator size="small" color={colors.palette.actionBlue} style={$savingSpinner} />
        </View>
        :
        <Pressable onPress={cameraBttnPressed} style={$addFotoBttn}>
          <AntDesign name="camera" size={22} style={$cameraIcon} color={colors.palette.actionBlue} />
          <Text style={$cameraLabelBttn}>Agregar fotos al evento</Text>
        </Pressable>
      }

      {isLoadingGallery ?
        <ActivityIndicator size="small" color={colors.palette.actionBlue} style={$gallerySpinner} />
        :
        <>
          <Text style={$imgCountLabel}>{totalImgs + " fotos."}</Text>
          <View style={$galleryView}>
            <FlatList
              data={images}
              renderItem={renderGalleryItem}
              keyExtractor={keyExtractor}
              numColumns={3}
            />
          </View>
        </>
      } 

      <Pressable onPress={handleDeleteEvento} style={$deleteBttn}>
        <Text style={$deleteBttnText}>Eliminar Evento</Text>
      </Pressable>

    </Screen>
  )
})

const $root: ViewStyle = {
  flex: 1,
  backgroundColor: colors.background,
  paddingTop: spacing.tiny,
  paddingHorizontal: spacing.medium,
}
const $item: ViewStyle = {
  flex: 1,
  flexDirection: 'column',
  margin: 8,
}
const $galleryView: ViewStyle = {
  height: 370,
  marginTop: 0,
  marginBottom: 14,
  borderRadius: 8,
  backgroundColor: colors.palette.neutral100,
}
const $addFotoBttn: ViewStyle = {
  flexDirection: "row", 
  justifyContent: "space-between", 
  paddingHorizontal: 72, 
  marginTop: 8, 
  alignItems: "center",  
  marginBottom: 1
}
const $label: TextStyle = {
  marginTop: 2
}
const $rsvpLabel: TextStyle = {
  marginTop: 2,
  color: colors.palette.actionBlue,
}
const $cameraLabelBttn: TextStyle = {
  marginTop: 1,
  color: colors.palette.actionBlue,
  fontWeight: "bold"
}
const $imgCountLabel: TextStyle = {
  marginTop: -10,
  fontWeight: "bold",
  fontSize: spacing.small,
  alignSelf: "flex-end",
  marginRight: 4,
}
const $dividerView: ViewStyle = {
  height: 1,
  marginTop: 6,
  backgroundColor: colors.palette.neutral400,
}
const $deleteBttn: ViewStyle = {
  alignItems: "center",
  padding: spacing.small,
  marginVertical: spacing.small,
  backgroundColor: colors.palette.angry100,
  borderRadius: 8,
  marginTop: 10,
  marginBottom: 16,
}

const $deleteBttnText: TextStyle = {
  color: colors.palette.angry500,
  fontWeight: "bold",
}

const $savingText: TextStyle = {
  marginTop: 4,
  marginBottom: 4,
  alignSelf: 'center',
}

const $savingSpinner: ViewStyle = {
  marginBottom: 4,
}

const $cameraIcon: ViewStyle = {
  marginTop: 2,
}

const $gallerySpinner: ViewStyle = {
  marginTop: 40,
}

const $galleryImage: ViewStyle = {
  borderRadius: 4,
}

