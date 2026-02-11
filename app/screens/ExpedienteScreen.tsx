import React, { FC, useEffect, useState, useCallback, useRef } from "react"
import * as ParseAPI from "../services/parse/ParseAPI"
import * as AWSService from "../services/AWSService"
import moment from 'moment';
import 'moment/locale/es';
moment.locale('es');
import { useStores } from "../models"
import { observer } from "mobx-react-lite"
import { ViewStyle, TextStyle, View, Alert, Image, FlatList, Dimensions, ActivityIndicator, TouchableOpacity } from "react-native"
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { NativeStackScreenProps } from "@react-navigation/native-stack"
import { AppStackScreenProps } from "app/navigators"
import { Screen, Text } from "app/components"
import { colors, spacing } from "../theme"
import * as Haptics from 'expo-haptics';
import * as Linking from "expo-linking"

interface ExpedienteScreenProps extends NativeStackScreenProps<AppStackScreenProps<"Expediente">> {}

const WINDOW_WIDTH = Dimensions.get('window').width
const MAMA_PAPA_ARR = ["Mamá", "Papá"]

interface CredentialData {
  qrCode: string
  nombres: string
  photoURL: string | null
}

interface ParentData {
  id: string
  parentesco: string
  nombre: string
  direccion: string
  tel1: string
  tel2: string
  email: string
  username: string
  status: number
}

interface PersonaAutorizada {
  id: string
  nombre: string
  apellidos: string
  domicilio: string
  telefonocasa: string
  telefonocelular: string
  parentesco: string
  photo: string | null
  status: number
}

export const ExpedienteScreen: FC<ExpedienteScreenProps> = observer(function ExpedienteScreen({ route, navigation }) {
  const estudianteObj = route.params as any

  const [nombre, setNombre] = useState("")
  const [grupo, setGrupo] = useState("")
  const [birthday, setBirthday] = useState("")
  const [horario, setHorario] = useState("Horario")
  const [colegiatura, setColegiatura] = useState("")
  const [edad, setEdad] = useState("")
  const [fechaIngreso, setFechaIngreso] = useState("")
  const [alumnoPhotoURL, setAlumnoPhotoURL] = useState<string | null>(null)
  const [mamaPhotoURL, setMamaPhotoURL] = useState<string | null>(null)
  const [papaPhotoURL, setPapaPhotoURL] = useState<string | null>(null)
  const [mamaData, setMamaData] = useState<ParentData | null>(null)
  const [papaData, setPapaData] = useState<ParentData | null>(null)
  const [mamaPapaObjects, setMamaPapaObjects] = useState<any[] | null>(null)
  const [persAutData, setPersAutData] = useState<PersonaAutorizada[] | null>(null)
  const [flatListHeight, setFlatListHeight] = useState(8)
  const [isCredDataDone, setIsCredDataDone] = useState(false)
  const [credencialesDataArr, setCredencialesDataArr] = useState<CredentialData[]>([])
  // const [stickerURL, setStickerURL] = useState<string | null>(null)
  // const [isGeneratingSticker, setIsGeneratingSticker] = useState(false)

  // Use refs for mutable values that persist across async calls
  const relationCountRef = useRef(0)
  const credDataArrRef = useRef<CredentialData[]>([])


  const {
    authenticationStore: {
      authUserEscuela
    },
  } = useStores()

  // Initial useEffect
  useEffect(() => {
    setupComponents()
  }, [])
  // UseEffect for updating data from Edit screen
  useEffect(() => {
    if (route.params?.updatedData) {
      updateExpedienteData(route.params.updatedData)
    }
  }, [route.params?.updatedData])

  function setupComponents() {
    navigation.setOptions({
      headerBackTitleVisible: false,
    });
    // Alumno
    fetchAlumnoPhoto()
    setAlumnoData()
    // Personas Autorizadas
    fetchPersonasAutorizadasRelation()
  }

  async function fetchAlumnoPhoto() {
    const studentPhoto = await ParseAPI.fetchStudentPhotoObjId(estudianteObj)
    if (studentPhoto != null) {
      fetchPhotoURL(studentPhoto)
    }
  }

  async function fetchPhotoURL(studentPhoto: any) {
    let signedURL = null
    if (studentPhoto.isNewBucket) {
      const resizedObjectId = "resized-" + studentPhoto.id
      signedURL = await AWSService.getSignedObjectUrl(resizedObjectId)
    } else {
      signedURL = await AWSService.getS3FileSignedURL(studentPhoto.id)
    }
    setAlumnoPhotoURL(signedURL)
  }

  function setAlumnoData() {
    const alumnoNombre = estudianteObj.get('NOMBRE') + " " + estudianteObj.get('ApPATERNO') + " " + estudianteObj.get('ApMATERNO')
    setNombre(alumnoNombre)
    const fechaNac = estudianteObj.get('fechaNacimiento')
    const fechaNacStr = moment(fechaNac).format("l")
    setBirthday(fechaNacStr)
    setHorario(estudianteObj.get('HORARIO'))
    const grupoObj = estudianteObj.get('grupo')
    setGrupo(grupoObj.get("name"))
    setColegiatura(estudianteObj.get('COLEGIATURA'))
    const years = moment().diff(fechaNac, 'years', true)
    const str = years.toString()
    const numarray = str.split('.')
    const mesesStr = "0." + numarray[1]
    const mesesFloat = parseFloat(mesesStr)
    const mesesCount = Math.floor(12 * mesesFloat)
    const edadStr = numarray[0] + " años " + mesesCount + " meses."
    setEdad(edadStr)
    const fechaIngresoVal = estudianteObj.get('fechaIngreso')
    const fechaIngresoStr = moment(fechaIngresoVal).format("l")
    setFechaIngreso(fechaIngresoStr)
  }

  // async function fetchGrupoFromServer(grupoId) {
  //   let grupoObjRes = await ParseAPI.fetchGrupo(grupoId)
  //   setGrupoParse(grupoObjRes)
  // }

  async function fetchPersonasAutorizadasRelation() {
    const persAutRelation = estudianteObj.get('PersonasAutorizadas')
    const relation = await ParseAPI.fetchEstudiantePersonasAutorizadasRelation(persAutRelation)
    relationCountRef.current = relation.length
    credDataArrRef.current = []
    const filteredMamaPapaArr = relation.filter(isMamaPapa)
    processMamaPapa(filteredMamaPapaArr)
    const filteredPersAutArr = relation.filter(checkNotMamaPapa)
    const relationLenMinusMomDad = 200 * filteredPersAutArr.length
    setFlatListHeight(relationLenMinusMomDad)
    processPersonaAutorizada(filteredPersAutArr)
  }

  function checkNotMamaPapa(user: any) {
    return !MAMA_PAPA_ARR.includes(user.get('parentesco'))
  }

  function isMamaPapa(user: any) {
    return MAMA_PAPA_ARR.includes(user.get('parentesco'))
  }

  function processDataForCredenciales(user: any, photoURL: string | null) {
    const alumnoId = estudianteObj.id
    const alumnoNombre = estudianteObj.get('NOMBRE') + " " + estudianteObj.get('ApPATERNO') + " " + estudianteObj.get('ApMATERNO')
    const personaId = user.id
    const personaNombreStr = user.get('nombre') + " " + user.get('apellidos')
    const qrCodeStr = personaId + "-" + alumnoId
    const nombresStr = personaNombreStr + " - " + alumnoNombre

    const credData: CredentialData = {
      qrCode: qrCodeStr,
      nombres: nombresStr,
      photoURL: photoURL
    }
    credDataArrRef.current.push(credData)
    const credDataLen = credDataArrRef.current.length
    if (credDataLen === relationCountRef.current) {
      setIsCredDataDone(true)
      setCredencialesDataArr([...credDataArrRef.current])
    }
  }

  function processMamaPapa(users: any[]) {
    setMamaPapaObjects(users)
    users.forEach((user) => {
      const parentesco = user.get('parentesco')
      fetchUserPhotoFromServer(parentesco, user)
      setUIForMamaPapa(parentesco, user)
    })
  }

  function setUIForMamaPapa(parentesco: string, user: any) {
    const nombreStr = user.get('nombre') + " " + user.get('apellidos')
    let email = user.get('email')
    const username = user.get('username')
    if (username && username.includes('@')) {
      email = username
    }

    const userData: ParentData = {
      id: user.id,
      parentesco: parentesco,
      nombre: nombreStr,
      direccion: user.get('domicilio'),
      tel1: user.get('telefonocasa'),
      tel2: user.get('telefonocelular'),
      email: email,
      username: username,
      status: user.get('status')
    }
    if (parentesco === "Mamá") {
      setMamaData(userData)
    } else {
      setPapaData(userData)
    }
  }

  async function fetchUserPhotoFromServer(parentesco: string, userObj: any) {
    const userPhotoId = await ParseAPI.fetchUserPhotoId(userObj)
    if (userPhotoId != null) {
      getFileSignedURL(parentesco, userPhotoId.id, userPhotoId.isNewBucket, userObj)
    }
  }

  async function getFileSignedURL(parentesco: string, objectId: string, isNewBucket: boolean, userObj: any) {
    let s3URLRes = null
    if (isNewBucket) {
      const resizedObjectId = "resized-" + objectId
      s3URLRes = await AWSService.getSignedObjectUrl(resizedObjectId)
    } else {
      s3URLRes = await AWSService.getS3FileSignedURL(objectId)
    }
    processDataForCredenciales(userObj, s3URLRes)
    if (s3URLRes != null) {
      switch (parentesco) {
        case "Mamá":
          setMamaPhotoURL(s3URLRes)
          break
        case "Papá":
          setPapaPhotoURL(s3URLRes)
          break
        default:
          break
      }
    }
  }

  async function fetchPerAutPhotoURL(user: any): Promise<string | null> {
    const userPhotoId = await ParseAPI.fetchUserPhotoId(user)
    if (userPhotoId != null) {
      let s3URLRes = null
      if (userPhotoId.isNewBucket) {
        s3URLRes = await AWSService.getSignedObjectUrl(userPhotoId.id)
      } else {
        s3URLRes = await AWSService.getS3FileSignedURL(userPhotoId.id)
      }
      processDataForCredenciales(user, s3URLRes)
      return s3URLRes
    }
    return null
  }

  async function processPersonaAutorizada(users: any[]) {
    const tempArr: PersonaAutorizada[] = []
    for (let i = 0; i < users.length; i++) {
      const user = users[i]
      const photoURL = await fetchPerAutPhotoURL(user)
      const existingPerson: PersonaAutorizada = {
        id: user.id,
        nombre: user.get('nombre'),
        apellidos: user.get('apellidos'),
        domicilio: user.get('domicilio'),
        telefonocasa: user.get('telefonocasa') || '',
        telefonocelular: user.get('telefonocelular') || '',
        parentesco: user.get('parentesco'),
        photo: photoURL,
        status: user.get('status'),
      }
      tempArr.push(existingPerson)
    }
    setPersAutData(tempArr)
  }

  const updateExpedienteData = useCallback((updatedData: any) => {
    setNombre(updatedData.nombre + " " + updatedData.apPaterno + " " + updatedData.apMaterno)
    setBirthday(moment(updatedData.fechaNacimiento).format("ll"))
    setHorario(updatedData.horario)
    setGrupo(updatedData.grupoObj.get("name"))
    setColegiatura(updatedData.colegiatura)
  }, [])

  const editarMenuBtnPressed = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
    const navParams = {
      estudianteObj: estudianteObj,
      estudiantePhoto: alumnoPhotoURL,
      mamaPapaObj: mamaPapaObjects,
      mamaPhoto: mamaPhotoURL,
      papaPhoto: papaPhotoURL,
      persAutArr: persAutData,
      updateExpediente: updateExpedienteData,
      updateEstudiantes: (route.params as any).updateEstudiantes
    }
    navigation.navigate("EditExpediente", navParams)
  }, [estudianteObj, alumnoPhotoURL, mamaPapaObjects, mamaPhotoURL, papaPhotoURL, persAutData, updateExpedienteData, route.params, navigation])

  const credencialMenuBtnPressed = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
    navigation.navigate("Credenciales", { credInfo: credencialesDataArr })
  }, [navigation, credencialesDataArr])

  const bajaMenuBtnPressed = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
    const alertActionsArr: any[] = [
      { text: 'Dar de baja al Estudiante', onPress: () => darBajaExpediente() },
      { text: 'Cancelar', onPress: null, style: 'cancel' }
    ]
    if (mamaData != null) {
      alertActionsArr.push({ text: 'Baja a Mamá', onPress: () => darBajaPersona(mamaData.id) })
    }
    if (papaData != null) {
      alertActionsArr.push({ text: 'Baja a Papá', onPress: () => darBajaPersona(papaData.id) })
    }
    if (persAutData != null) {
      persAutData.forEach((user) => {
        const alertTitle = "Baja a " + user.parentesco + " " + user.nombre
        alertActionsArr.push({ text: alertTitle, onPress: () => darBajaPersona(user.id) })
      })
    }
    Alert.alert('Dar de Baja', 'Selecciona a la persona que deseas dar de baja:', alertActionsArr)
  }, [mamaData, papaData, persAutData])

  async function darBajaExpediente() {
    const res = await ParseAPI.updateStatusEstudiante(estudianteObj.id, 1)
    console.log("darBajaExpedienteRES: " + res)
    if (mamaData != null) { darBajaPersona(mamaData.id) }
    if (papaData != null) { darBajaPersona(papaData.id) }
    if (persAutData != null) {
      persAutData.forEach((user) => {
        darBajaPersona(user.id)
      })
    }
    presentFeedback("El estudiante ha sido dado de baja", "Todas las personas autorizadas en el expediente también han sido dadas de baja.")
  }

  async function darBajaPersona(personaId: string) {
    const cloudFuncName = "modifyUserStatus"
    const params = { objectID: personaId, status: 1 }
    const result = await ParseAPI.runCloudCodeFunction(cloudFuncName, params)

    // Handle new standardized response format
    if (result?.success || result) {
      console.log("BAJA cloudRes: success")
      let personaObject = mamaPapaObjects?.find(item => item.id === personaId)
      let alertTitle = "La persona se ha dado de baja"
      if (personaObject == null) {
        personaObject = persAutData?.find(item => item.id === personaId)
        if (personaObject) {
          alertTitle = personaObject.parentesco + " se ha dado de baja"
        }
      } else {
        alertTitle = personaObject.get("parentesco") + " se ha dado de baja"
      }
      presentFeedback(alertTitle, "")
    } else {
      const errorMsg = result?.error?.message || "No fue posible dar de baja a la persona"
      presentFeedback("Error", errorMsg)
    }
  }

  function presentFeedback(alertTitle: string, alertMessage: string) {
    Alert.alert(
      alertTitle,
      alertMessage,
      [
        {text: 'Ok', onPress: null, style: 'default'},
      ],
      {cancelable: false},
    );
  }

  // const generateStickerBtnPressed = useCallback(async () => {
  //   Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
  //   setIsGeneratingSticker(true)
  //   try {
  //     const result = await ParseAPI.runCloudCodeFunction("generateBananaStickerForStudent", { estudianteId: estudianteObj.id })
  //     if (result?.success) {
  //       console.log("Sticker generated:", result.data)
  //       presentFeedback("Sticker Generado", result.data?.message || "El sticker se generó correctamente.")
  //     } else {
  //       const errorMsg = result?.error?.message || "No se pudo generar el sticker"
  //       presentFeedback("Error", errorMsg)
  //     }
  //   } catch (error) {
  //     console.error("Error generating sticker:", error)
  //     presentFeedback("Error", "Ocurrió un error al generar el sticker.")
  //   } finally {
  //     setIsGeneratingSticker(false)
  //   }
  // }, [estudianteObj])

  // const showStickerBtnPressed = useCallback(async () => {
  //   Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
  //   try {
  //     // Fetch the student photo to get the photo ID for the banana key
  //     const studentPhoto = await ParseAPI.fetchStudentPhotoObjId(estudianteObj)
  //     if (!studentPhoto) {
  //       presentFeedback("Sin Foto", "El estudiante no tiene foto registrada.")
  //       return
  //     }

  //     const bananaKey = `banana-${studentPhoto.id}`
  //     console.log("Fetching sticker with key:", bananaKey)

  //     try {
  //       const signedUrl = await AWSService.getSignedObjectUrl(bananaKey)
  //       if (signedUrl) {
  //         setStickerURL(signedUrl)
  //       } else {
  //         presentFeedback("Sticker No Disponible", "El sticker aún no ha sido generado para este estudiante.")
  //       }
  //     } catch (s3Error) {
  //       console.error("Error fetching sticker from S3:", s3Error)
  //       presentFeedback("Sticker No Disponible", "El sticker aún no ha sido generado para este estudiante.")
  //     }
  //   } catch (error) {
  //     console.error("Error showing sticker:", error)
  //     presentFeedback("Error", "Ocurrió un error al obtener el sticker.")
  //   }
  // }, [estudianteObj])

  // const closeStickerModal = useCallback(() => {
  //   setStickerURL(null)
  // }, [])








  return (
    <Screen style={$root} preset="scroll">
      <View style={$menuBar}>
        <TouchableOpacity onPress={editarMenuBtnPressed}>
          <Text text="Editar" style={$menuButtonText} weight="medium" />
        </TouchableOpacity>
        {isCredDataDone &&
          <TouchableOpacity onPress={credencialMenuBtnPressed}>
            <Text text="Credenciales" style={$menuButtonText} weight="medium" />
          </TouchableOpacity>
        }
        {/* <TouchableOpacity onPress={generateStickerBtnPressed} disabled={isGeneratingSticker}>
          <Text text={isGeneratingSticker ? "..." : "Sticker"} style={$menuButtonText} weight="medium" />
        </TouchableOpacity>
        <TouchableOpacity onPress={showStickerBtnPressed}>
          <Text text="Ver Sticker" style={$menuButtonText} weight="medium" />
        </TouchableOpacity> */}
        <TouchableOpacity onPress={bajaMenuBtnPressed}>
          <Text text="Baja" style={$menuButtonText} weight="medium" />
        </TouchableOpacity>
      </View>

      <View style={$cardView}>
        <View style={$cardInfo}>
          {alumnoPhotoURL == null ? <EmptyPhotoView /> : <PhotoView photoURL={alumnoPhotoURL} />}
          <View style={$alumnoInfoContainer}>
            <Text text={nombre} weight="bold" style={$userInfoLabel} />
            <Text text={"Ingreso: " + fechaIngreso} style={$userInfoLabel} />
            <Text text={"Cumpleaños: " + birthday} style={$userInfoLabel} />
            <Text text={edad} style={$userInfoLabel} />
            <Text text={grupo} style={$userInfoLabel} />
            <Text text={horario} style={$userInfoLabel} />
            <Text text={"$" + colegiatura} style={$userInfoLabel} />
          </View>
        </View>
      </View>

      <Text text="Padres" weight="bold" />

      <View style={$cardView}>
        <View style={$cardInfo}>
          {mamaPhotoURL == null ? <EmptyPhotoView /> : <PhotoView photoURL={mamaPhotoURL} />}
          {mamaData && <MamaPapaInfo data={mamaData} />}
        </View>
      </View>

      <View style={$cardView}>
        <View style={$cardInfo}>
          {papaPhotoURL == null ? <EmptyPhotoView /> : <PhotoView photoURL={papaPhotoURL} />}
          {papaData && <MamaPapaInfo data={papaData} />}
        </View>
      </View>

      <Text text="Personas Autorizadas" weight="bold" />

      {persAutData ?
        <PersonaAutorizadaList personas={persAutData} listHeight={flatListHeight} />
        :
        <ActivityIndicator size="large" color={colors.palette.actionBlue} animating={true} style={$loadingIndicator} hidesWhenStopped={true} />
      }

      {/* Sticker Modal */}
      {/* <Modal
        visible={stickerURL !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={closeStickerModal}
      >
        <TouchableOpacity style={$stickerModalOverlay} onPress={closeStickerModal} activeOpacity={1}>
          <View style={$stickerModalContent}>
            <Text text="Banana Sticker" weight="bold" style={$stickerModalTitle} />
            {stickerURL && (
              <Image source={{ uri: stickerURL }} style={$stickerImage} resizeMode="contain" />
            )}
            <TouchableOpacity onPress={closeStickerModal} style={$stickerCloseButton}>
              <Text text="Cerrar" weight="bold" style={$stickerCloseButtonText} />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal> */}
    </Screen>
  )
})


function MamaPapaInfo(props) {
  const isInactive = props.data.status !== 0;
  const textStyle = isInactive ? $userInfoLabelGrayed : $userInfoLabel;
  const telStyle = isInactive ? $userTelInfoLabelGrayed : $userTelInfoLabel;
  
  return <View>
          <Text text={props.data.parentesco} weight="bold" style={textStyle} />
          {isInactive && (
            <Text text="Persona Desactivada" style={$deactivatedWarning} />
          )}
          <Text text={props.data.nombre} style={textStyle} />
          <Text text={props.data.direccion} style={textStyle} />
          <Text text={"Casa: " + props.data.tel1} style={telStyle} onPress={()=>{Linking.openURL('tel:'+ props.data.tel1);}} />
          <Text text={"Cel: " + props.data.tel2} style={telStyle} onPress={()=>{Linking.openURL('tel:'+ props.data.tel2);}} />
          <Text text={props.data.email} style={telStyle} onPress={()=>{Linking.openURL('mailto:'+ props.data.email);}} />
          <Text text={"U: " + props.data.username} style={textStyle} />
        </View>;
}

function PhotoView(props) {
  return <Image source={{ uri: props.photoURL }} style={{ width: 125, height: 156, borderRadius: 8, }} />
}

function EmptyPhotoView() {
  return <View style={{ width: 125, height: 156, borderRadius: 8, backgroundColor: colors.palette.neutral200}}></View>
}

const PersonaAutorizadaRow = ({ persona }) => {
  const isInactive = persona.status !== 0;
  const textStyle = isInactive ? $userInfoLabelGrayed : $userInfoLabel;
  const telStyle = isInactive ? $userTelInfoLabelGrayed : $userTelInfoLabel;
  
  return (
    <View style={$cardView}>
      <View style={$cardInfo}>
      {persona.photo ? <PhotoView photoURL={persona.photo} /> : <EmptyPhotoView />}
        <View>
          <Text weight="bold" style={textStyle}>{persona.parentesco}</Text>
          {isInactive && (
            <Text text="Persona Desactivada" style={$deactivatedWarning} />
          )}
          <Text style={textStyle}>{persona.nombre + " " + persona.apellidos}</Text>
          <Text style={textStyle}>{persona.domicilio}</Text>
          <Text style={telStyle} onPress={()=>{Linking.openURL('tel:'+ persona.telefonocasa);}}>{"Casa: " + persona.telefonocasa}</Text>
          <Text style={telStyle} onPress={()=>{Linking.openURL('tel:'+ persona.telefonocelular);}}>{"Cel: " + persona.telefonocelular}</Text>
        </View>
      </View>
    </View>
  );
}

const PersonaAutorizadaList = ({ personas, listHeight }) => {
  return (
    <FlatList
      data={personas}
      style={{height: listHeight}}
      renderItem={({ item }) => <PersonaAutorizadaRow persona={item} />}
      keyExtractor={item => item.id.toString()}
    />
  );
}

const $root: ViewStyle = {
  flex: 1,
  backgroundColor: colors.background,
  paddingTop: spacing.tiny,
  paddingHorizontal: spacing.stdPadding,
}

const $menuBar: ViewStyle = {
  flex: 1,
  flexDirection: "row",
  justifyContent: "space-between",
  height: 26,
  borderRadius: 8,
  width: WINDOW_WIDTH - 42,
  paddingHorizontal: 16,
  backgroundColor: colors.palette.lavanderClear,
}

const $menuButtonText: TextStyle = {
  color: colors.palette.actionColor,
}

const $cardView: ViewStyle = {
  marginTop: 8,
  marginBottom: 8,
  borderRadius: 10,
  backgroundColor: colors.palette.neutral100,
  paddingLeft: spacing.small,
  paddingRight: spacing.small,
  paddingTop: spacing.small,
  paddingBottom: spacing.micro,
}

const $cardInfo: ViewStyle = {
  flexDirection: "row",
  justifyContent: "flex-start",
  marginBottom: 8,
}

const $alumnoInfoContainer: ViewStyle = {
  marginTop: -6,
}

const $loadingIndicator: ViewStyle = {
  marginTop: 8,
}

const $userInfoLabel: TextStyle = {
  marginLeft: 10,
  width: 220,
  marginBottom: 2
}

const $userTelInfoLabel: TextStyle = {
  marginLeft: 10,
  width: 220,
  color: colors.palette.actionBlue,
  textDecorationLine: 'underline'
}

const $deactivatedWarning: TextStyle = {
  marginLeft: 10,
  width: 220,
  color: 'red',
  fontSize: 12,
  fontWeight: 'bold',
  marginBottom: 2
}

const $userInfoLabelGrayed: TextStyle = {
  marginLeft: 10,
  width: 220,
  marginBottom: 2,
  color: colors.palette.neutral400
}

const $userTelInfoLabelGrayed: TextStyle = {
  marginLeft: 10,
  width: 220,
  color: colors.palette.neutral400,
  textDecorationLine: 'underline'
}

// const $stickerModalOverlay: ViewStyle = {
//   flex: 1,
//   backgroundColor: 'rgba(0, 0, 0, 0.7)',
//   justifyContent: 'center',
//   alignItems: 'center',
// }

// const $stickerModalContent: ViewStyle = {
//   backgroundColor: 'white',
//   borderRadius: 16,
//   padding: 20,
//   alignItems: 'center',
//   maxWidth: '90%',
// }

// const $stickerModalTitle: TextStyle = {
//   fontSize: 18,
//   marginBottom: 16,
// }

// const $stickerImage: ViewStyle = {
//   width: 250,
//   height: 250,
//   borderRadius: 8,
// }

// const $stickerCloseButton: ViewStyle = {
//   marginTop: 16,
//   backgroundColor: colors.palette.actionBlue,
//   paddingHorizontal: 24,
//   paddingVertical: 10,
//   borderRadius: 8,
// }

// const $stickerCloseButtonText: TextStyle = {
//   color: 'white',
//   fontSize: 16,
// }

