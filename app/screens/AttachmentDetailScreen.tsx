import React, { FC, useEffect, useState, useCallback, useMemo } from "react"
import { observer } from "mobx-react-lite"
import {
  ViewStyle,
  TextStyle,
  ImageStyle,
  View,
  Pressable,
  Platform,
  ActivityIndicator,
  Dimensions,
  Alert,
  AlertButton,
} from "react-native"
import { Image } from 'expo-image'
import { colors } from "../theme"
import { ResizeMode, Video } from 'expo-av'
import { WebView } from 'react-native-webview'
import * as MediaLibrary from 'expo-media-library'
import * as FileSystem from 'expo-file-system/legacy'
import * as Share from 'expo-sharing'
import { NativeStackScreenProps } from "@react-navigation/native-stack"
import { AppStackScreenProps } from "app/navigators"
import { Screen, Text } from "app/components"
import { getSignedObjectUrl } from "app/services/AWSService"

// Hoisted constants
const SCREEN_WIDTH = Dimensions.get('window').width
const SCREEN_HEIGHT = Dimensions.get('window').height
const SCREEN_PADDING_TOP = Platform.OS === 'ios' ? 4 : 28
const VIDEO_PLAYER_HEIGHT = SCREEN_HEIGHT - SCREEN_PADDING_TOP
const OLD_BUCKET_BASE_URL = "https://skola-photos.s3.us-east-2.amazonaws.com/"
const GOOGLE_DOCS_VIEWER_URL = "https://docs.google.com/gview?embedded=true&url="

// Hoisted file extension map
const FILE_EXTENSIONS: Record<string, string> = {
  PDF: ".pdf",
  VID: ".mov",
  JPG: ".png",
}

interface AttachmentDetailScreenProps extends NativeStackScreenProps<AppStackScreenProps<"AttachmentDetail">> {}

interface RouteParams {
  objectId: string
  tipo?: string
  isNewBucket?: boolean
  url?: string
}

export const AttachmentDetailScreen: FC<AttachmentDetailScreenProps> = observer(function AttachmentDetailScreen({ route, navigation }) {
  const [isLoading, setIsLoading] = useState(true)
  const [localURI, setLocalURI] = useState("")
  const [assetURL, setAssetURL] = useState("")
  const [displayMode, setDisplayMode] = useState<'webview' | 'image' | 'video'>('image')

  // Derive file type from route params - no need for separate state
  const fileType = useMemo(() => {
    const item = route.params as RouteParams
    if (item.tipo === "PDF") return "PDF"
    if (item.tipo === "VID") return "VID"
    return "JPG"
  }, [route.params])

  const setupComponents = useCallback(async (item: RouteParams) => {
    let urlString = OLD_BUCKET_BASE_URL + item.objectId
    let mode: 'webview' | 'image' | 'video' = 'image'

    // NEW Bucket
    if (item.isNewBucket) {
      const baseURL = await getSignedObjectUrl(item.objectId)
      urlString = baseURL

      if (item.tipo === "PDF") {
        mode = 'webview'
        // Android WebView can't display PDFs directly, use Google Docs viewer
        if (Platform.OS === "android") {
          urlString = GOOGLE_DOCS_VIEWER_URL + encodeURIComponent(baseURL)
        }
      } else if (item.tipo === "VID") {
        mode = 'video'
      } else {
        mode = 'webview'
      }

      setAssetURL(urlString)
      setDisplayMode(mode)
      return
    }

    // OLD Bucket
    if (item.tipo === "PDF") {
      mode = 'webview'
      if (Platform.OS === "android") {
        urlString = GOOGLE_DOCS_VIEWER_URL + OLD_BUCKET_BASE_URL + item.objectId
      }
    } else if (item.tipo === "VID") {
      mode = 'video'
    }

    if (item.url) {
      let itemURL = item.url
      if (itemURL.includes("resized-")) {
        itemURL = itemURL.replace("resized-", "")
      }
      urlString = itemURL
    }

    setAssetURL(urlString)
    setDisplayMode(mode)
  }, [])

  useEffect(() => {
    navigation.setOptions({
      title: "Adjunto"
    })
    const item = route.params as RouteParams
    setupComponents(item)

    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 1500)

    return () => clearTimeout(timer)
  }, [navigation, route.params, setupComponents])

  const sharePhotoOption = useCallback((uri: string) => {
    Share.shareAsync(uri)
  }, [])

  const savePhotoToLibrary = useCallback((uri: string) => {
    MediaLibrary.saveToLibraryAsync(uri).then(() => {
      Alert.alert(
        "Foto Guardada",
        "La foto ha sido guardada en tu carrete de fotos.",
        [{ text: 'Ok', onPress: () => {}, style: 'default' }],
        { cancelable: false },
      )
    })
  }, [])

  const displayShareOrSaveToLibrary = useCallback((uri: string, type: string) => {
    // For PDFs, just show share sheet directly (can't save to photo library)
    if (type === "PDF") {
      sharePhotoOption(uri)
      return
    }

    const options: AlertButton[] = []

    if (Platform.OS === 'ios') {
      options.push({ text: 'Guardar al carrete', onPress: () => savePhotoToLibrary(uri), style: 'default' })
    }
    options.push({ text: 'Compartir', onPress: () => sharePhotoOption(uri), style: 'default' })
    options.push({ text: 'Cancelar', onPress: () => {}, style: 'cancel' })

    Alert.alert(
      "Selecciona una opción",
      type === "VID" ? "Comparte o guarda el video" : "Comparte o guarda la foto",
      options,
      { cancelable: false },
    )
  }, [savePhotoToLibrary, sharePhotoOption])

  const shareAttachmentBtnPressed = useCallback(async () => {
    const fileExtension = FILE_EXTENSIONS[fileType] ?? ""
    const fileDirectory = FileSystem.documentDirectory + "adjunto_skola" + fileExtension

    try {
      const { uri } = await FileSystem.downloadAsync(assetURL, fileDirectory)
      setLocalURI(uri)
      displayShareOrSaveToLibrary(uri, fileType)
    } catch (error) {
      console.error('Download failed:', error)
      Alert.alert("Error", "No se pudo descargar el archivo.")
    }
  }, [fileType, assetURL, displayShareOrSaveToLibrary])

  const backBtnPressed = useCallback(() => {
    navigation.goBack()
  }, [navigation])

  // Derived display conditions
  const showWebView = assetURL.length > 0 && displayMode === 'webview'
  const showImage = assetURL.length > 0 && displayMode === 'image'
  const showVideo = displayMode === 'video'

  return (
    <Screen style={$root} preset="auto">
      <View style={$topContainer}>
        <Pressable style={$backButton} onPress={backBtnPressed}>
          <Text style={$buttonText}>Cerrar</Text>
        </Pressable>
        <Pressable style={$saveButton} onPress={shareAttachmentBtnPressed}>
          <Text style={$buttonText}>Guardar</Text>
        </Pressable>
      </View>

      <View style={$dividerView} />

      {isLoading ? (
        <ActivityIndicator
          size="large"
          color={colors.palette.lavanderDark}
          animating={isLoading}
          style={$loadingIndicator}
          hidesWhenStopped={true}
        />
      ) : null}

      {showWebView ? (
        <View style={$webViewContainer}>
          <WebView
            useWebKit={true}
            style={$webView}
            startInLoadingState={true}
            source={{ uri: assetURL }}
          />
        </View>
      ) : null}

      {showImage ? (
        <View style={$imageContainer}>
          <Image
            source={{ uri: assetURL }}
            style={$imageStyle}
            contentFit="contain"
            transition={200}
          />
        </View>
      ) : null}

      {showVideo ? (
        <Video
          source={{ uri: assetURL }}
          rate={1.0}
          volume={1.0}
          isMuted={false}
          resizeMode={ResizeMode.COVER}
          shouldPlay
          isLooping
          style={$videoPlayer}
        />
      ) : null}
    </Screen>
  )
})

const $root: ViewStyle = {
  flex: 1,
}

const $topContainer: ViewStyle = {
  flexDirection: 'row',
  justifyContent: 'space-between',
  paddingTop: SCREEN_PADDING_TOP,
  marginTop: 20,
}

const $backButton: ViewStyle = {
  marginLeft: 12,
}

const $saveButton: ViewStyle = {
  marginRight: 12,
}

const $buttonText: TextStyle = {
  color: colors.palette.neutral800,
  fontWeight: '700',
  fontSize: 17,
}

const $dividerView: ViewStyle = {
  height: 1,
  backgroundColor: colors.palette.neutral400,
  marginTop: 4,
}

const $loadingIndicator: ViewStyle = {
  marginTop: 8,
}

const $webViewContainer: ViewStyle = {
  flex: 1,
}

const $webView: ViewStyle = {
  flex: 1,
  marginTop: 4,
  height: SCREEN_HEIGHT,
  width: SCREEN_WIDTH,
}

const $imageContainer: ViewStyle = {
  justifyContent: 'center',
  alignItems: 'center',
}

const $imageStyle: ImageStyle = {
  marginTop: 2,
  height: SCREEN_HEIGHT / 2,
  width: SCREEN_WIDTH - 16,
  borderRadius: 8,
  borderCurve: 'continuous',
}

const $videoPlayer: ViewStyle = {
  width: SCREEN_WIDTH,
  height: VIDEO_PLAYER_HEIGHT,
}
