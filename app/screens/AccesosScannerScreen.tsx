import React, { FC, useState, useCallback, useRef } from "react"
import { CameraView, useCameraPermissions } from 'expo-camera'
import * as AWSService from '../services/AWSService'
import { useStores } from "../models"
import * as ParseAPI from "../services/parse/ParseAPI"
import * as Haptics from 'expo-haptics'
import { observer } from "mobx-react-lite"
import { ViewStyle, View, ActivityIndicator, Alert, TextStyle, ImageStyle, Dimensions } from "react-native"
import { NativeStackScreenProps } from "@react-navigation/native-stack"
import { AppStackScreenProps } from "app/navigators"
import { Text, Button } from "app/components"
import { colors, spacing } from "../theme"
import { publishMessage } from "../services/PubNubService"
import { Image } from "react-native"

// Hoisted constants
const SCREEN_WIDTH = Dimensions.get('window').width
const CAMERA_WIDTH = SCREEN_WIDTH - 40
const RESIZED_PREFIX = "resized-"

interface AccesosScannerScreenProps extends NativeStackScreenProps<AppStackScreenProps<"AccesosScanner">> {
  onScanComplete?: () => void;
}

interface RouteParams {
  onScanComplete?: () => void;
}

interface EstudianteData {
  get: (key: string) => any;
  relation: (key: string) => any;
}

interface UserData {
  id: string;
  get: (key: string) => any;
}

interface QRScanData {
  data: string;
}

export const AccesosScannerScreen: FC<AccesosScannerScreenProps> = observer(function AccesosScannerScreen({ route }) {
  const [permission, requestPermission] = useCameraPermissions()

  const [isLoading, setIsLoading] = useState(false);
  const [isScanning, setIsScanning] = useState(true);
  const [isUserAuthorized, setIsUserAuthorized] = useState(false);
  const [isAccessDenied, setIsAccessDenied] = useState(false);

  const [userNombre, setUserNombre] = useState<string | null>(null)
  const [userParentesco, setUserParentesco] = useState<string | null>(null)
  const [userPhotoURL, setUserPhotoURL] = useState<string | null>(null)
  const [deniedReason, setDeniedReason] = useState("")

  const {
    authenticationStore: {
      authUserEscuela,
    },
  } = useStores()

  const isDataScannedRef = useRef(false)
  const scannedUserObjIdRef = useRef("")
  const estudianteObjectRef = useRef<EstudianteData | null>(null)


  const setScanningState = useCallback(() => {
    isDataScannedRef.current = false
    setIsLoading(false)
    setIsAccessDenied(false)
    setIsUserAuthorized(false)
    setUserPhotoURL("")
    setIsScanning(true)
  }, [])

  const setLoadingState = useCallback(() => {
    isDataScannedRef.current = true
    setIsLoading(true)
    setIsScanning(false)
    setIsAccessDenied(false)
    setIsUserAuthorized(false)
  }, [])

  const setAuthorizedState = useCallback(() => {
    setIsLoading(false)
    setIsScanning(false)
    setIsAccessDenied(false)
    setIsUserAuthorized(true)
  }, [])

  const setDeniedAccessState = useCallback(() => {
    setIsLoading(false)
    setIsScanning(false)
    setIsUserAuthorized(false)
    setIsAccessDenied(true)
  }, [])

  const presentFeedback = useCallback((alertTitle: string, alertMessage: string) => {
    Alert.alert(
      alertTitle,
      alertMessage,
      [{ text: 'Ok', onPress: () => {}, style: 'default' }],
      { cancelable: false }
    )
  }, [])

  const presentError = useCallback((title: string, message: string) => {
    Alert.alert(
      title,
      message,
      [{ text: 'Ok', onPress: () => setScanningState(), style: 'default' }],
      { cancelable: false }
    )
  }, [setScanningState])

  const getFileSignedURL = useCallback(async (objectId: string, isNewBucket: boolean) => {
    try {
      let s3URLRes = null
      if (isNewBucket) {
        const resizedObjectId = RESIZED_PREFIX + objectId
        s3URLRes = await AWSService.getSignedObjectUrl(resizedObjectId)
      } else {
        s3URLRes = await AWSService.getS3FileSignedURL(objectId)
      }
      if (s3URLRes != null) {
        setUserPhotoURL(s3URLRes)
      } else {
        console.warn('No se pudo cargar la foto del usuario')
      }
    } catch (error) {
      console.warn('Error al cargar la foto del usuario:', error)
    }
  }, [])

  const fetchUserPhotoFromServer = useCallback(async (userObj: UserData) => {
    const userPhotoId = await ParseAPI.fetchUserPhotoId(userObj)
    if (userPhotoId != null) {
      getFileSignedURL(userPhotoId.id, userPhotoId.isNewBucket)
    }
    setAuthorizedState()
  }, [getFileSignedURL, setAuthorizedState])

  const publishPubNubMessage = useCallback(() => {
    publishMessage("newAcceso")
  }, [])

  const runCloudCodeFunction = useCallback((accesoId: string) => {
    try {
      const cloudFuncName = "accesos"
      const params = { accesoObjectId: accesoId, escuelaObjId: authUserEscuela }
      ParseAPI.runCloudCodeFunction(cloudFuncName, params).catch(error => {
        console.warn('Error en función de nube:', error)
      })

      const routeParams = route.params as RouteParams
      if (routeParams?.onScanComplete) {
        setTimeout(() => {
          routeParams.onScanComplete?.()
        }, 1500)
      }
    } catch (error) {
      console.warn('Error al ejecutar función de nube:', error)
      presentError('Error al ejecutar notificación', 'Hubo un error al tratar de enviar la notificación de acceso. Por favor, intente nuevamente.')
      setScanningState()
    }
  }, [authUserEscuela, route.params, presentError, setScanningState])

  const storeAcceso = useCallback(async (userObj: UserData) => {
    try {
      const accesoRes = await ParseAPI.registrarAcceso(userObj, estudianteObjectRef.current, authUserEscuela)
      if (accesoRes?.id) {
        runCloudCodeFunction(accesoRes.id)
        publishPubNubMessage()
      } else {
        presentError('Error de Registro', 'No se pudo registrar el acceso. Por favor, intente nuevamente.')
        setScanningState()
      }
    } catch (error) {
      presentError('Error de Registro', 'Hubo un error al registrar el acceso. Por favor, intente nuevamente.')
      setScanningState()
    }
  }, [authUserEscuela, runCloudCodeFunction, publishPubNubMessage, presentError, setScanningState])

  const negarAcceso = useCallback((reason: number) => {
    let statusLabelString = ""
    switch (reason) {
      case 0:
        statusLabelString = "Usuario Activo. Puede pasar."
        break
      case 1:
        statusLabelString = "El Estudiante ha sido dado de Baja del Colegio"
        break
      case 2:
        statusLabelString = "El Estudiante ha sido Desactivado Temporalmente"
        break
      case 3:
        statusLabelString = "Esta Persona ha sido Desactivada Temporalmente"
        break
      case 4:
        statusLabelString = "Esta Persona ha sido Desactivada Permanentemente."
        break
      case 5:
        statusLabelString = "Código Inválido - Este Usuario no Existe en la base de Datos"
        break
      case 6:
        statusLabelString = "El Estudiante no está registrado en el Colegio."
        break
      default:
        statusLabelString = "NEGAR ACCESO USUARIO INEXISTENTE"
        break
    }
    setDeniedReason(statusLabelString)
    setDeniedAccessState()
    presentFeedback("¡Negar acceso!", statusLabelString)
  }, [setDeniedAccessState, presentFeedback])

  const processUserData = useCallback((userObj: UserData) => {
    const userStatus = userObj.get("status")
    if (userStatus === 0) {
      const userName = userObj.get('nombre') + " " + userObj.get('apellidos')
      const parentesco = userObj.get('parentesco')
      setUserNombre(userName)
      setUserParentesco(parentesco)
      storeAcceso(userObj)
      fetchUserPhotoFromServer(userObj)
    } else {
      negarAcceso(4)
    }
  }, [storeAcceso, fetchUserPhotoFromServer, negarAcceso])

  const validatePersonaAutorizada = useCallback(async (personasAutRelation: any) => {
    try {
      const relation = await ParseAPI.fetchEstudiantePersonasAutorizadasRelation(personasAutRelation)
      if (relation != null) {
        let userFound = null
        for (let i = 0; i < relation.length; i++) {
          const userObj = relation[i]
          const userId = userObj.id
          if (userId === scannedUserObjIdRef.current) {
            userFound = userObj
          }
        }
        if (userFound != null) {
          processUserData(userFound)
        } else {
          negarAcceso(5)
        }
      } else {
        presentError('Error de Autorización', 'No se pudo verificar la autorización del usuario.')
        setScanningState()
      }
    } catch (error) {
      presentError('Error de Conexión', 'No se pudo verificar la autorización. Verifique su conexión a internet.')
      setScanningState()
    }
  }, [processUserData, negarAcceso, presentError, setScanningState])

  const processEstudianteData = useCallback((estudianteObj: EstudianteData) => {
    const estudianteEscuela = estudianteObj.get("escuela")
    const estudianteStatus = estudianteObj.get("status")
    estudianteObjectRef.current = estudianteObj
    const personasAutorizadas = estudianteObj.relation("PersonasAutorizadas")
    if (authUserEscuela === estudianteEscuela.id) {
      if (estudianteStatus === 0) {
        validatePersonaAutorizada(personasAutorizadas)
      } else {
        negarAcceso(1)
      }
    } else {
      negarAcceso(6)
    }
  }, [authUserEscuela, validatePersonaAutorizada, negarAcceso])

  const fetchStudentFromServer = useCallback(async (estudianteObjId: string) => {
    try {
      const estudianteRes = await ParseAPI.fetchScannedEstudiante(estudianteObjId)
      if (estudianteRes != null) {
        processEstudianteData(estudianteRes)
      } else {
        negarAcceso(6)
      }
    } catch (error) {
      presentError('Error de Conexión', 'No se pudo obtener la información del estudiante. Verifique su conexión a internet.')
      setScanningState()
    }
  }, [processEstudianteData, negarAcceso, presentError, setScanningState])

  const processScannedData = useCallback((dataStr: string) => {
    try {
      const qrDataSplitArr = dataStr.split("-")
      if (qrDataSplitArr.length === 2) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
        const userObjId = qrDataSplitArr[0]
        scannedUserObjIdRef.current = userObjId
        const studentObjId = qrDataSplitArr[1]
        fetchStudentFromServer(studentObjId)
      } else {
        presentError('Código QR Inválido', 'El formato del código QR no es válido. Por favor, asegúrese de escanear un código QR válido.')
        setScanningState()
      }
    } catch (error) {
      presentError('Error de Procesamiento', 'Hubo un error al procesar los datos del código QR.')
      setScanningState()
    }
  }, [fetchStudentFromServer, presentError, setScanningState])

  const handleScannedData = useCallback((scannedObj: QRScanData) => {
    if (isDataScannedRef.current === false) {
      try {
        setLoadingState()
        processScannedData(scannedObj.data)
      } catch (error) {
        presentError('Error de Escaneo', 'Hubo un error al procesar el código QR. Por favor, intente nuevamente.')
        setScanningState()
      }
    }
  }, [setLoadingState, processScannedData, presentError, setScanningState])

  const resetToScanner = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
    setScanningState()
  }, [setScanningState])

  if (!permission) {
    return <View />
  }

  if (!permission.granted) {
    return (
      <View style={$grantContainer}>
        <Text style={$grantMessage}>Otorga permiso de acceso a la cámara para escanear los códigos QR de las credenciales de acceso.</Text>
        <Button onPress={requestPermission} tx="accesosScreen.otorgarBttn" preset="filled" style={$grantButton} />
      </View>
    )
  }


  return (
    <View style={$root}>
      {isLoading && (
        <ActivityIndicator
          size="large"
          color={colors.palette.actionBlue}
          animating={isLoading}
          style={$loadingIndicator}
          hidesWhenStopped={true}
        />
      )}

      {isScanning && (
        <>
          <Text text="Muestra el código QR de tu credencial a la cámara." preset="default" style={$scannerText} />
          <CameraView
            barcodeScannerSettings={{
              barcodeTypes: ["qr"],
            }}
            onBarcodeScanned={handleScannedData}
            style={$cameraView}
          />
        </>
      )}

      {isUserAuthorized && (
        <View style={$authorizedView}>
          <Text preset="heading" style={$authorizedHeading}>Acceso Autorizado</Text>
          <Text preset="subheading" style={$authorizedName}>{userNombre}</Text>
          <Text preset="default" style={$authorizedParentesco}>{userParentesco}</Text>
          {userPhotoURL != null && (
            <Image
              source={{ uri: userPhotoURL }}
              style={$userPhoto}
              resizeMode="cover"
            />
          )}
          <Button
            testID="accesos-scanner-reset"
            tx="accesosScreen.resetScanner"
            style={$tapButtonGreen}
            preset="default"
            onPress={resetToScanner}
          />
        </View>
      )}

      {isAccessDenied && (
        <View style={$deniedView}>
          <Text preset="heading" style={$deniedHeading}>¡Acceso Negado!</Text>
          <Text preset="subheading" style={$deniedReason}>{deniedReason}</Text>
          <Button
            testID="accesos-scanner-reset"
            tx="accesosScreen.resetScanner"
            style={$tapButton}
            preset="default"
            onPress={resetToScanner}
          />
        </View>
      )}
    </View>
  )
})

const $root: ViewStyle = {
  flex: 1,
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: colors.background,
}

const $loadingIndicator: ViewStyle = {
  marginTop: 56,
}

const $scannerText: TextStyle = {
  marginBottom: 16,
  width: 300,
}

const $cameraView: ViewStyle = {
  height: 500,
  width: CAMERA_WIDTH,
  borderRadius: 5,
}

const $authorizedView: ViewStyle = {
  alignItems: "center",
  backgroundColor: colors.palette.grassLight,
  borderRadius: 8,
  padding: 16,
}

const $authorizedHeading: TextStyle = {
  marginTop: 8,
  marginBottom: 16,
}

const $authorizedName: TextStyle = {
  marginBottom: 4,
}

const $authorizedParentesco: TextStyle = {
  marginBottom: 16,
}

const $userPhoto: ImageStyle = {
  height: 300,
  width: 300,
  borderRadius: 10,
  marginTop: 12,
}

const $deniedView: ViewStyle = {
  alignItems: "center",
  backgroundColor: colors.palette.bittersweetLight,
  borderRadius: 8,
  paddingVertical: 16,
  paddingHorizontal: 40,
}

const $deniedHeading: TextStyle = {
  marginTop: 8,
  marginBottom: 16,
}

const $deniedReason: TextStyle = {
  marginBottom: 80,
}

const $tapButtonGreen: ViewStyle = {
  marginTop: spacing.extraLarge,
  marginBottom: spacing.large,
  borderRadius: 80,
  borderColor: colors.palette.grassDark,
  borderBottomWidth: 4,
  width: 300,
}

const $tapButton: ViewStyle = {
  marginTop: spacing.extraLarge,
  marginBottom: spacing.large,
  borderRadius: 80,
  borderColor: colors.palette.bittersweetDark,
  borderBottomWidth: 4,
}

const $grantContainer: ViewStyle = {
  flex: 1,
  justifyContent: 'center',
  alignItems: 'center',
}

const $grantMessage: TextStyle = {
  textAlign: 'center',
  paddingBottom: 10,
}

const $grantButton: ViewStyle = {
  width: 200,
  backgroundColor: colors.palette.grassLight,
  borderRadius: 80,
  borderColor: colors.palette.grassDark,
  borderWidth: 1,
  borderBottomWidth: 4,
}