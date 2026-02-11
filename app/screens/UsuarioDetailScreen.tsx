import React, { FC, useState, useEffect, useCallback, memo } from "react"
import * as ParseAPI from "../services/parse/ParseAPI"
import * as AWSService from '../services/AWSService'
import { observer } from "mobx-react-lite"
import { useStores } from "../models"
import { ViewStyle, TextStyle, ImageStyle, View, Image, ActivityIndicator, Alert, Button } from "react-native"
import * as ImagePicker from 'expo-image-picker'
import * as ImageManipulator from 'expo-image-manipulator'
import { AppStackScreenProps } from "app/navigators"
import { Screen, Text, TextField } from "app/components"
import * as Haptics from 'expo-haptics'
import { colors, spacing } from "../theme"
import SegmentedControl from '@react-native-segmented-control/segmented-control'

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

// Hoisted constants
const SEGMENT_CONTROL_VALUES = ["Administrador", "Docente"]
const RESIZED_PREFIX = "resized-"

interface UsuarioDetailScreenProps extends AppStackScreenProps<"UsuarioDetail"> {}

interface RouteParams {
  userObj?: any
  reloadList?: () => void
}

export const UsuarioDetailScreen: FC<UsuarioDetailScreenProps> = observer(function UsuarioDetailScreen({ route, navigation }) {
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [username, setUsername] = useState("")
  const [usrPswd, setUsrPswd] = useState("")
  const [nombre, setNombre] = useState("")
  const [apellidos, setApellidos] = useState("")
  const [userPhoto, setUserPhoto] = useState<string | null>(null)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [showPswdBtn, setShowPswrBtn] = useState(false)
  const [showPswdField, setShowPswrField] = useState(true)

  const routeParams = (route.params || {}) as RouteParams

  const {
    authenticationStore: {
      authUserEscuela,
    },
  } = useStores()

  const presentFeedback = useCallback((alertTitle: string, alertMessage: string) => {
    Alert.alert(
      alertTitle,
      alertMessage,
      [{ text: 'Ok', onPress: () => {}, style: 'default' }],
      { cancelable: false },
    )
  }, [])

  const getFileSignedURL = useCallback(async (objectId: string, isNewBucket: boolean) => {
    let s3URLRes = null
    if (isNewBucket) {
      const resizedObjectId = RESIZED_PREFIX + objectId
      s3URLRes = await AWSService.getSignedObjectUrl(resizedObjectId)
    } else {
      s3URLRes = await AWSService.getS3FileSignedURL(objectId)
    }
    if (s3URLRes != null) {
      setUserPhoto(s3URLRes)
    }
  }, [])

  const fetchUserPhotoFromServer = useCallback(async (userObj: any) => {
    const userPhotoId = await ParseAPI.fetchUserPhotoId(userObj)
    if (userPhotoId != null) {
      getFileSignedURL(userPhotoId.id, userPhotoId.isNewBucket)
    }
  }, [getFileSignedURL])

  useEffect(() => {
    setSelectedIndex(0)
    if (routeParams.userObj != null) {
      setShowPswrField(false)
      const userObj = routeParams.userObj
      setUsername(userObj.get('username'))
      setNombre(userObj.get('nombre'))
      setApellidos(userObj.get('apellidos'))
      setSelectedIndex(userObj.get('usertype'))
      fetchUserPhotoFromServer(userObj)
      setShowPswrBtn(true)
    }
  }, [])

  const adjuntarFotoAction = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: false,
      quality: 1,
    })

    if (!result.canceled) {
      // Convert HEIC to JPEG if needed
      const originalUri = result.assets[0].uri
      const mimeType = result.assets[0].mimeType ?? ''
      const assetURI = await convertHeicToJpeg(originalUri, mimeType)
      setUserPhoto(assetURI)
    }
  }, [])

  const uploadFileToAWSS3 = useCallback(async (anuncioPhotoObjectId: string, assetURL: string) => {
    const uploadRes = await AWSService.uploadImageDataToAWS(anuncioPhotoObjectId, assetURL, 'image/jpg', true)
    console.log("**uploadFileToAWSS3: " + JSON.stringify(uploadRes))
    return true
  }, [])

  const onUploadComplete = useCallback(() => {
    setIsSubmitted(false)
    if (routeParams.reloadList != null) {
      routeParams.reloadList()
    }
    presentFeedback("Usuario Guardado", "El usuario ha sido guardado exitosamente.")
  }, [routeParams, presentFeedback])

  const guardarUserPhoto = useCallback(async (assetURL: string, userObjId: string) => {
    const resId = await ParseAPI.saveUserPhoto(userObjId)
    if (resId != null) {
      await uploadFileToAWSS3(resId, assetURL)
      onUploadComplete()
    } else {
      presentFeedback("Ocurrió algo inesperado", "No fue possible guardar la photo del alumno. Favor de intentar de nuevo.")
    }
  }, [uploadFileToAWSS3, onUploadComplete, presentFeedback])

  const runCloudCodeFunction = useCallback(async () => {
    let usertype = 0
    let parentesco = "Admin"
    if (selectedIndex === 1) {
      usertype = 1
      parentesco = "Docente"
    }
    const usernameExists = await ParseAPI.checkUsernameExists(username)
    if (usernameExists) {
      setIsSubmitted(false)
      presentFeedback("Nombre de usuario ya existe", "Elige otro nombre de usuario o agrega caracteres adicionales.")
      return
    }
    const cloudFuncName = "newSchoolUserSignUp"
    const params = { username, nombre, apellidos, password: usrPswd, usertype, parentesco, escuela: authUserEscuela }
    const result = await ParseAPI.runCloudCodeFunction(cloudFuncName, params)

    // Handle new standardized response format
    const userIdRes = result?.success ? (result.data?.userId || result.data?.objectId) : result
    console.log("userIdRes:", userIdRes)

    if (!userIdRes) {
      setIsSubmitted(false)
      const errorMsg = result?.error?.message || "No fue posible crear el usuario"
      presentFeedback("Error", errorMsg)
      return
    }

    if (userPhoto != null) {
      guardarUserPhoto(userPhoto, userIdRes)
    } else {
      onUploadComplete()
    }
  }, [selectedIndex, username, nombre, apellidos, usrPswd, authUserEscuela, userPhoto, guardarUserPhoto, onUploadComplete, presentFeedback])

  const saveUser = useCallback(() => {
    setIsSubmitted(true)
    runCloudCodeFunction()
  }, [runCloudCodeFunction])

  const runChangePwdCloudCodeFunction = useCallback(async (userId: string) => {
    const cloudFuncName = "modifyUserPassword"
    const params = { objectID: userId, newPass: usrPswd }
    const result = await ParseAPI.runCloudCodeFunction(cloudFuncName, params)

    // Handle new standardized response format
    if (result?.success || result) {
      console.log("Password changed successfully")
      presentFeedback("Cambio de Contraseña", "La contraseña ha sido cambiada exitosamente.")
      navigation.goBack()
    } else {
      const errorMsg = result?.error?.message || "No fue posible cambiar la contraseña"
      presentFeedback("Error", errorMsg)
    }
  }, [usrPswd, presentFeedback, navigation])

  const guardarAction = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
    if (routeParams.userObj != null) {
      const userObj = routeParams.userObj
      if (usrPswd.length > 0) {
        runChangePwdCloudCodeFunction(userObj.id)
      }
    } else {
      if (nombre.length > 0 && username.length > 0) {
        saveUser()
      } else {
        presentFeedback("Campos Vacíos", "Ingresa información en todos los campos para guardar.")
      }
    }
  }, [routeParams, usrPswd, nombre, username, runChangePwdCloudCodeFunction, saveUser, presentFeedback])

  const segmentIndexChanged = useCallback((index: number) => {
    if (selectedIndex !== index) {
      setSelectedIndex(index)
    }
  }, [selectedIndex])

  const handleSegmentChange = useCallback((event: any) => {
    segmentIndexChanged(event.nativeEvent.selectedSegmentIndex)
  }, [segmentIndexChanged])

  const changePswdAction = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
    setShowPswrField(true)
    setShowPswrBtn(false)
  }, [])



  return (
    <Screen style={$root} preset="scroll">
      <View>
        {userPhoto === null ? <EmptyPhotoView /> : <PhotoView photoURL={userPhoto} />}
        <Button title="Adjuntar foto" onPress={adjuntarFotoAction} />

        <Text text="Tipo de usuario:" style={$userTypeLabel} />
        <SegmentedControl
          values={SEGMENT_CONTROL_VALUES}
          selectedIndex={selectedIndex}
          onChange={handleSegmentChange}
        />

        <View style={$spacerSmall} />

        <TextField
          value={username}
          onChangeText={setUsername}
          containerStyle={$textField}
          inputWrapperStyle={$inputContainer}
          autoCapitalize="words"
          autoComplete="name"
          autoCorrect={false}
          keyboardType="default"
          labelTx="crearUsuarioScreen.usuarioTF"
          placeholderTx="crearUsuarioScreen.usuarioPlaceholder"
        />

        <TextField
          value={nombre}
          onChangeText={setNombre}
          containerStyle={$textField}
          inputWrapperStyle={$inputContainer}
          autoCapitalize="words"
          autoComplete="name"
          autoCorrect={false}
          keyboardType="default"
          labelTx="crearUsuarioScreen.nombreTF"
          placeholderTx="crearUsuarioScreen.nombrePlaceholder"
        />

        <TextField
          value={apellidos}
          onChangeText={setApellidos}
          containerStyle={$textField}
          inputWrapperStyle={$inputContainer}
          autoCapitalize="words"
          autoComplete="name"
          autoCorrect={false}
          keyboardType="default"
          labelTx="crearUsuarioScreen.apellidosTF"
          placeholderTx="crearUsuarioScreen.apellidosPlaceholder"
        />

        {showPswdField && (
          <TextField
            value={usrPswd}
            onChangeText={setUsrPswd}
            containerStyle={$textField}
            inputWrapperStyle={$inputContainer}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="default"
            labelTx="crearUsuarioScreen.passwordTF"
          />
        )}

        {showPswdBtn && (
          <View style={$buttonContainerMedium}>
            <Button title="Cambiar Contraseña" onPress={changePswdAction} />
          </View>
        )}

        {isSubmitted ? (
          <View style={$loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
          </View>
        ) : (
          <View style={$buttonContainerMedium}>
            <Button title="Guardar" onPress={guardarAction} />
          </View>
        )}
      </View>
      <View style={$bottomSpacer} />
    </Screen>
  )
})

// Sub-components
const EmptyPhotoView = memo(function EmptyPhotoView() {
  return <View style={$emptyPhoto} />
})

interface PhotoViewProps {
  photoURL: string
}

const PhotoView = memo(function PhotoView({ photoURL }: PhotoViewProps) {
  return <Image source={{ uri: photoURL }} style={$photo} />
})

// Styles
const $root: ViewStyle = {
  flex: 1,
  backgroundColor: colors.background,
  paddingTop: spacing.stdPadding,
  paddingHorizontal: spacing.stdPadding,
  paddingBottom: 280,
}

const $inputContainer: ViewStyle = {
  height: 36,
  borderColor: colors.palette.neutral300,
  borderWidth: 1,
  margin: 4,
  borderRadius: 10,
  paddingLeft: 8,
  paddingTop: 4,
}

const $textField: ViewStyle = {
  marginBottom: spacing.small,
  borderColor: colors.palette.bluejeansDark,
}

const $emptyPhoto: ViewStyle = {
  width: 125,
  height: 156,
  alignSelf: 'center',
  marginTop: 6,
  marginBottom: 6,
  borderRadius: 8,
  backgroundColor: colors.palette.neutral300,
}

const $photo: ImageStyle = {
  width: 125,
  height: 156,
  borderRadius: 8,
  alignSelf: 'center',
  marginTop: 6,
  marginBottom: 6,
}

const $userTypeLabel: TextStyle = {
  marginTop: 16,
}

const $spacerSmall: ViewStyle = {
  marginTop: spacing.small,
}

const $buttonContainerMedium: ViewStyle = {
  marginTop: spacing.medium,
}

const $loadingContainer: ViewStyle = {
  marginTop: spacing.extraLarge,
}

const $bottomSpacer: ViewStyle = {
  height: 200,
}