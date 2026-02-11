import React, { FC, useEffect, useState, useCallback, memo } from "react"
import { useStores } from "../models"
import * as ParseAPI from "../services/parse/ParseAPI"
import * as AWSService from "../services/AWSService"
import { observer } from "mobx-react-lite"
import { ViewStyle, TextStyle, ImageStyle, TextInput, View, Button, ActivityIndicator, Image, Platform, Alert, TouchableOpacity, Modal } from "react-native"
import { AppStackScreenProps } from "app/navigators"
import { Screen, Text } from "app/components"
import * as Haptics from "expo-haptics"
import { colors, spacing } from "../theme"
import * as ImagePicker from "expo-image-picker"
import * as ImageManipulator from "expo-image-manipulator"
import { Picker } from "@react-native-picker/picker"
import * as SQLiteAPI from "../services/sqlite/SQLiteAPI"
import DateTimePicker from "@react-native-community/datetimepicker"
import SegmentedControl from "@react-native-segmented-control/segmented-control"
import PersonasAutorizadasTable from "../components/PersonasAutorizadasTable"

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

// #region Interfaces and Types
interface EditExpedienteScreenProps extends AppStackScreenProps<"EditExpediente"> {}

interface Grupo {
  id: string
  name: string
}

interface Horario {
  id: string
  name: string
  precio: string | number
}

interface ChangeTracker {
  estudiante: { [key: string]: boolean }
  mama: { [key: string]: boolean }
  papa: { [key: string]: boolean }
  personasAutorizadas: boolean
}

interface RouteParams {
  estudianteObj?: any
  estudiantePhoto?: string
  mamaPapaObj?: any[]
  mamaPhoto?: string
  papaPhoto?: string
  persAutArr?: any[]
  reloadTable?: () => void
  updateExpediente?: (data: any) => void
  updateEstudiantes?: () => void
}
// #endregion

export const EditExpedienteScreen: FC<EditExpedienteScreenProps> = observer(function EditExpedienteScreen({ route, navigation }) {
  const expedienteParams = (route.params || {}) as RouteParams
  const {
    authenticationStore: { authUserEscuela },
  } = useStores()

  // #region State
  const [isLoading, setIsLoading] = useState(false)
  const [isExisting, setIsExisting] = useState(false)
  const [isRelationFound, setIsRelationFound] = useState(false)
  const [saveProgress, setSaveProgress] = useState({ step: 0, total: 0, message: "" })

  const [changeTracker, setChangeTracker] = useState<ChangeTracker>({
    estudiante: {},
    mama: {},
    papa: {},
    personasAutorizadas: false,
  })

  // Alumno State
  const [estudianteObjectId, setEstudianteObjectId] = useState("")
  const [alumnoPhoto, setAlumnoPhoto] = useState<string | null>(null)
  const [fechaIngreso, setFechaIngreso] = useState(new Date())
  const [nombre, setNombre] = useState("")
  const [apPaterno, setApPaterno] = useState("")
  const [apMaterno, setApMaterno] = useState("")
  const [curp, setCurp] = useState("")
  const [fechaNacimiento, setFechaNacimiento] = useState(new Date())
  const [genero, setGenero] = useState("F")
  const [colegiatura, setColegiatura] = useState("$0.0")

  // Parent State (Mamá & Papá)
  const [mamaObjectId, setMamaObjectId] = useState("")
  const [papaObjectId, setPapaObjectId] = useState("")
  const [mamaPhoto, setMamaPhoto] = useState<string | null>(null)
  const [papaPhoto, setPapaPhoto] = useState<string | null>(null)
  const [mamaStatus, setMamaStatus] = useState(0)
  const [papaStatus, setPapaStatus] = useState(0)
  const [mamaNombre, setMamaNombre] = useState("")
  const [mamaApellidos, setMamaApellidos] = useState("")
  const [mamaDireccion, setMamaDireccion] = useState("")
  const [mamaTelCasa, setMamaTelCasa] = useState("")
  const [mamaTelCel, setMamaTelCel] = useState("")
  const [mamaEmail, setMamaEmail] = useState("")
  const [papaNombre, setPapaNombre] = useState("")
  const [papaApellidos, setPapaApellidos] = useState("")
  const [papaDireccion, setPapaDireccion] = useState("")
  const [papaTelCasa, setPapaTelCasa] = useState("")
  const [papaTelCel, setPapaTelCel] = useState("")
  const [papaEmail, setPapaEmail] = useState("")

  // Grupo, Horario, Paquete State
  const [gruposArr, setGruposArr] = useState<Grupo[]>([])
  const [horariosArr, setHorariosArr] = useState<Horario[]>([])
  const [grupo, setGrupo] = useState<Grupo>({ name: "", id: "" })
  const [horario, setHorario] = useState<{ name: string; id: string; precio: string | number }>({ name: "", id: "", precio: "" })
  const [grupoParse, setGrupoParse] = useState(null)
  const [paqueteParse, setPaqueteParse] = useState(null)

  // Personas Autorizadas State
  const [personasAutArr, setPersonasAutArr] = useState<any[]>([])
  const [changedPersonasAut, setChangedPersonasAut] = useState<any>({})

  // UI State
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [showNacimientoPicker, setShowNacimientoPicker] = useState(false)
  const [grupoPickerVisible, setGrupoPickerVisible] = useState(false)
  const [horarioPickerVisible, setHorarioPickerVisible] = useState(false)
  // #endregion

  // #region Utility and Helper Functions
  const updateChangeTracker = useCallback((category: keyof ChangeTracker, field: string, value = true) => {
    setChangeTracker(prev => ({
      ...prev,
      [category]: typeof prev[category] === "object" ? { ...(prev[category] as object), [field]: value } : value,
    }))
  }, [])

  function isValidEmail(email: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  }

  function presentFeedback(title: string, message: string) {
    Alert.alert(title, message, [{ text: "Ok" }])
  }

  async function activateUser(userId: string, userType: "mama" | "papa") {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    try {
      const params = { objectID: userId, status: 0 }
      const result = await ParseAPI.runCloudCodeFunction("modifyUserStatus", params)

      // Handle new standardized response format
      if (result && result.success) {
        // Update local state
        if (userType === "mama") {
          setMamaStatus(0)
        } else {
          setPapaStatus(0)
        }
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
        presentFeedback("Usuario Activado", "El usuario ha sido activado correctamente.")
      } else {
        const errorMsg = result?.error?.message || "No fue posible activar el usuario. Intente de nuevo."
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
        presentFeedback("Error", errorMsg)
      }
    } catch (error) {
      console.error("Error activating user:", error)
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      presentFeedback("Error", "Ocurrió un error al activar el usuario.")
    }
  }
  // #endregion

  // #region Initial Setup
  useEffect(() => {
    navigation.setOptions({
      title: "Editar Expediente",
      headerBackTitleVisible: false,
    })

    if (expedienteParams?.estudianteObj) {
      setIsExisting(true)
      processExistingExpedienteData()
    }

    fetchDBGrupos()
    fetchHorarios()
  }, [])

  function processExistingExpedienteData() {
    if (!expedienteParams) return

    const { estudianteObj, estudiantePhoto, mamaPapaObj, mamaPhoto, papaPhoto, persAutArr } = expedienteParams

    // ESTUDIANTE
    setEstudianteObjectId(estudianteObj.id)
    setAlumnoPhoto(estudiantePhoto || null)
    setFechaIngreso(estudianteObj.get("fechaIngreso") || new Date())
    setFechaNacimiento(estudianteObj.get("fechaNacimiento") || new Date())
    setNombre(estudianteObj.get("NOMBRE"))
    setApPaterno(estudianteObj.get("ApPATERNO"))
    setApMaterno(estudianteObj.get("ApMATERNO"))
    setCurp(estudianteObj.get("CURP"))
    setGenero(estudianteObj.get("GENERO"))
    setSelectedIndex(estudianteObj.get("GENERO") === "F" ? 0 : 1)

    // Grupo
    const grupoData = { name: estudianteObj.get("grupo").get("name"), id: estudianteObj.get("grupo").id }
    setGrupo(grupoData)
    fetchGrupoFromServer(grupoData.id).then(setGrupoParse)

    // Paquete/Horario
    const paqueteObj = estudianteObj.get("paquete")
    if (paqueteObj) {
      const paquetePrecio = paqueteObj.get("precio")
      if (paquetePrecio !== undefined && paquetePrecio !== null) {
        const horarioData = { name: estudianteObj.get("HORARIO") || "", id: paqueteObj.id, precio: paquetePrecio }
        setHorario(horarioData)
        setColegiatura(paquetePrecio.toString())
      }
      fetchPaqueteFromServer(paqueteObj.id).then(setPaqueteParse)
    }
    const estudianteColegiatura = estudianteObj.get("COLEGIATURA")
    if (estudianteColegiatura > 0) {
      setColegiatura("$" + estudianteColegiatura)
    }

    // MAMA
    const mamaObject = mamaPapaObj?.find(item => item.get("parentesco") === "Mamá")
    if (mamaObject) {
      setMamaObjectId(mamaObject.id)
      setMamaPhoto(mamaPhoto || null)
      setMamaStatus(mamaObject.get("status") || 0)
      setMamaNombre(mamaObject.get("nombre"))
      setMamaApellidos(mamaObject.get("apellidos"))
      setMamaDireccion(mamaObject.get("domicilio"))
      setMamaTelCasa(mamaObject.get("telefonocasa"))
      setMamaTelCel(mamaObject.get("telefonocelular"))
      const mamaEmailStr = mamaObject.get("username")
      setMamaEmail(isValidEmail(mamaEmailStr) ? mamaEmailStr : "")
    }

    // PAPA
    const papaObject = mamaPapaObj?.find(item => item.get("parentesco") === "Papá")
    if (papaObject) {
      setPapaObjectId(papaObject.id)
      setPapaPhoto(papaPhoto || null)
      setPapaStatus(papaObject.get("status") || 0)
      setPapaNombre(papaObject.get("nombre"))
      setPapaApellidos(papaObject.get("apellidos"))
      setPapaDireccion(papaObject.get("domicilio"))
      setPapaTelCasa(papaObject.get("telefonocasa"))
      setPapaTelCel(papaObject.get("telefonocelular"))
      const papaEmailStr = papaObject.get("username")
      setPapaEmail(isValidEmail(papaEmailStr) ? papaEmailStr : "")
    }

    // PERSONAS AUTORIZADAS
    if (persAutArr && persAutArr.length > 0) {
      console.log("persAutArr", persAutArr.length)
      console.log("persAutArr data:", JSON.stringify(persAutArr, null, 2))
      // Check if photos are already included
      const hasPhotos = persAutArr.some(persona => persona.photo)
      console.log("Has photos:", hasPhotos)
      
      if (hasPhotos) {
        // Photos are already fetched, use them directly
        setPersonasAutArr(persAutArr)
      } else {
        // Fetch photos for personas autorizadas
        fetchPersonasAutorizadasPhotos(persAutArr)
      }
    }
  }

  async function fetchPersonasAutorizadasPhotos(persAutArr: any[]) {
    try {
      const updatedPersonasAut = await Promise.all(
        persAutArr.map(async (persona) => {
          try {
            if (persona.id) {
              const photoURL = await fetchPersonaAutorizadaPhoto(persona)
              return {
                ...persona,
                photo: photoURL
              }
            }
            return persona
          } catch (error) {
            console.error("Error fetching photo for persona:", persona.id, error)
            return persona // Return without photo if fetch fails
          }
        })
      )
      setPersonasAutArr(updatedPersonasAut)
    } catch (error) {
      console.error("Error fetching personas autorizadas photos:", error)
      // Set the personas without photos if there's an error
      setPersonasAutArr(persAutArr)
    }
  }

  async function fetchPersonaAutorizadaPhoto(persona: any): Promise<string | null> {
    try {
      const userPhotoId = await ParseAPI.fetchUserPhotoId(persona)
      if (userPhotoId != null) {
        let s3URLRes = null
        if (userPhotoId.isNewBucket) {
          s3URLRes = await AWSService.getSignedObjectUrl(userPhotoId.id)
        } else {
          s3URLRes = await AWSService.getS3FileSignedURL(userPhotoId.id)
        }
        return s3URLRes
      }
      return null
    } catch (error) {
      console.error("Error fetching persona autorizada photo:", error)
      return null
    }
  }

  async function fetchDBGrupos() {
    try {
      const dbResults: any[] = await SQLiteAPI.readDBPromise("Grupo", "WHERE TRUE", [])
      if (dbResults.length > 0) {
        const tempGruposArr = dbResults.map(grupo => ({ id: grupo.objectId, name: grupo.name }))
        setGruposArr(tempGruposArr)
      } else {
        console.warn("No groups found in database")
        presentFeedback("Sin Grupos", "No se encontraron grupos disponibles. Contacte al administrador.")
      }
    } catch (error) {
      console.error("Error fetching groups from database:", error)
      presentFeedback("Error", "No fue posible cargar los grupos. Intente de nuevo.")
    }
  }

  async function fetchHorarios() {
    try {
      const res = await ParseAPI.fetchPaquetes(authUserEscuela)
      if (res) {
        const tempArr = res.map((paquete: any) => ({
          id: paquete.id,
          name: `${paquete.get("horario")} - ${paquete.get("nombre")}`,
          precio: paquete.get("precio"),
        }))
        setHorariosArr(tempArr)
      }
    } catch (error) {
      console.error("Error fetching horarios:", error)
      presentFeedback("Error", "No fue posible cargar los horarios. Intente de nuevo.")
    }
  }
  // #endregion

  // #region Main Save Action
  async function guardarAction() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
    
    // Validate required fields
    const validationErrors = validateRequiredFields()
    if (validationErrors.length > 0) {
      presentFeedback("Campos Requeridos", validationErrors.join("\n"))
      return
    }

    setIsLoading(true)

    try {
      if (isExisting) {
        await handleUpdateExistingExpediente()
      } else {
        await handleCreateNewExpediente()
      }
    } catch (error) {
      console.error("Error in guardarAction:", error)
      presentFeedback("Error Inesperado", "Ocurrió un error inesperado. Por favor, intente nuevamente.")
    } finally {
      setIsLoading(false)
    }
  }

  function validateRequiredFields(): string[] {
    const errors: string[] = []
    
    if (!nombre?.trim()) errors.push("• Nombre del alumno es requerido")
    if (!apPaterno?.trim()) errors.push("• Apellido paterno del alumno es requerido")
    
    if (!isExisting) {
      if (!grupo.id) errors.push("• Grupo es requerido")
      if (!horario.id) errors.push("• Horario es requerido")
      
      // Check if at least one parent has basic info
      const mamaHasInfo = mamaNombre?.trim() && mamaApellidos?.trim()
      const papaHasInfo = papaNombre?.trim() && papaApellidos?.trim()
      
      if (!mamaHasInfo && !papaHasInfo) {
        errors.push("• Al menos un padre debe tener nombre y apellidos")
      }
    }
    
    return errors
  }
  // #endregion

  // #region Update Logic for Existing Expediente
  async function handleUpdateExistingExpediente() {
    try {
      const updatePromises = []
      const operationNames: string[] = []

      if (Object.keys(changeTracker.estudiante).length > 0) {
        updatePromises.push(updateEstudianteObject())
        operationNames.push("Estudiante")
      }
      if (Object.keys(changeTracker.mama).length > 0) {
        updatePromises.push(updateParentObject("mama"))
        operationNames.push("Mamá")
      }
      if (Object.keys(changeTracker.papa).length > 0) {
        updatePromises.push(updateParentObject("papa"))
        operationNames.push("Papá")
      }
      if (changeTracker.personasAutorizadas) {
        updatePromises.push(guardarPersonasAutorizadas())
        operationNames.push("Personas Autorizadas")
      }

      if (updatePromises.length === 0) {
        presentFeedback("Sin cambios", "No se detectaron cambios en ningún campo.")
        return
      }

      const results = await Promise.allSettled(updatePromises)
      const failedOperations = results.filter(r => r.status === "rejected")
      const successfulOperations = results.filter(r => r.status === "fulfilled")

      if (failedOperations.length > 0) {
        console.error("Some operations failed:", failedOperations)
        const failedNames = failedOperations.map((_, index) => operationNames[results.findIndex(r => r.status === "rejected")])
        
        if (successfulOperations.length > 0) {
          presentFeedback(
            "Actualización Parcial", 
            `Se actualizaron algunos campos correctamente, pero fallaron: ${failedNames.join(", ")}. Por favor, revise los datos y vuelva a intentarlo.`
          )
        } else {
          presentFeedback(
            "Error de Actualización", 
            "No se pudo actualizar ningún campo. Por favor, revise su conexión e intente nuevamente."
          )
        }
      } else {
        presentFeedback("Éxito", "Todos los cambios se guardaron correctamente.")
        expedienteParams?.updateEstudiantes?.()
        navigation.navigate("Estudiantes")
      }
    } catch (error) {
      console.error("Unexpected error in handleUpdateExistingExpediente:", error)
      presentFeedback("Error Inesperado", "Ocurrió un error inesperado. Por favor, intente nuevamente.")
    }
  }

  function updateEstudianteObject(): Promise<any> {
    return new Promise(async (resolve, reject) => {
      try {
        const estudianteId = expedienteParams?.estudianteObj?.id
        if (!estudianteId) {
          reject(new Error("No student ID found"))
          return
        }

        const colegiaturaInt = parseInt(colegiatura.replace("$", ""))
        const estudianteData: { [key: string]: any } = {}

        if (changeTracker.estudiante.nombre) estudianteData.nombre = nombre
        if (changeTracker.estudiante.apPaterno) estudianteData.apPaterno = apPaterno
        if (changeTracker.estudiante.apMaterno) estudianteData.apMaterno = apMaterno
        if (changeTracker.estudiante.apellido) estudianteData.apellido = `${apPaterno} ${apMaterno}`
        if (changeTracker.estudiante.grupoObj) {
          if (!grupoParse) {
            reject(new Error("Grupo object not found"))
            return
          }
          estudianteData.grupoObj = grupoParse
        }
        if (changeTracker.estudiante.paqueteObj) {
          if (!paqueteParse) {
            reject(new Error("Paquete object not found"))
            return
          }
          estudianteData.paqueteObj = paqueteParse
        }
        if (changeTracker.estudiante.horario) estudianteData.horario = horario.name
        if (changeTracker.estudiante.curp) estudianteData.curp = curp
        if (changeTracker.estudiante.genero) estudianteData.genero = genero
        if (changeTracker.estudiante.colegiatura) estudianteData.colegiatura = colegiaturaInt
        if (changeTracker.estudiante.fechaIngreso) estudianteData.fechaIngreso = fechaIngreso
        if (changeTracker.estudiante.fechaNacimiento) estudianteData.fechaNacimiento = fechaNacimiento

        if (Object.keys(estudianteData).length === 0) {
          resolve(null)
          return
        }

        const result = await ParseAPI.updateEstudiante(estudianteId, estudianteData)
        resolve(result)
      } catch (error) {
        console.error("Error updating student:", error)
        reject(new Error(`Failed to update student: ${error instanceof Error ? error.message : String(error)}`))
      }
    })
  }

  function updateParentObject(parentType: "mama" | "papa"): Promise<any> {
    const parentState = {
      mama: { id: mamaObjectId, changes: changeTracker.mama, data: { nombre: mamaNombre, apellidos: mamaApellidos, domicilio: mamaDireccion, telefonocasa: mamaTelCasa, telefonocelular: mamaTelCel, email: mamaEmail } },
      papa: { id: papaObjectId, changes: changeTracker.papa, data: { nombre: papaNombre, apellidos: papaApellidos, domicilio: papaDireccion, telefonocasa: papaTelCasa, telefonocelular: papaTelCel, email: papaEmail } },
    }

    const { id, changes, data } = parentState[parentType]
    if (!id || !changes || Object.keys(changes).length === 0) return Promise.resolve()

    const fieldToCloudFunction = {
      nombre: "modifyUserNombre",
      apellidos: "modifyUserApellidos",
      domicilio: "modifyUserDomicilio",
      telefonocasa: "modifyUserTelefonoCasa",
      telefonocelular: "modifyUserTelefonoCelular",
      email: "modifyUserEmail",
    }

    const updatePromises = Object.keys(changes)
      .filter(field => changes[field])
      .map(field => {
        const funcName = fieldToCloudFunction[field as keyof typeof fieldToCloudFunction]
        const value = data[field as keyof typeof data]
        if (funcName && value !== undefined) {
          const params = { objectID: id, [field]: value }
          return ParseAPI.runCloudCodeFunction(funcName, params).catch(error => {
            console.error(`Error updating ${field}:`, error)
            throw error
          })
        }
        return Promise.resolve()
      })

    return Promise.all(updatePromises)
  }
  // #endregion

  // #region Create Logic for New Expediente
  async function handleCreateNewExpediente() {
    // Calculate total steps for progress
    const hasMama = mamaNombre && mamaApellidos
    const hasPapa = papaNombre && papaApellidos
    const validPersonasAut = personasAutArr.filter(persona =>
      persona?.nombre?.trim() && persona?.apellidos?.trim()
    )

    let totalSteps = 2 // Student + Presencia always
    if (alumnoPhoto) totalSteps++
    if (hasMama) totalSteps++
    if (hasMama && mamaPhoto) totalSteps++
    if (hasPapa) totalSteps++
    if (hasPapa && papaPhoto) totalSteps++
    totalSteps += validPersonasAut.length
    totalSteps++ // Relations step

    let currentStep = 0

    const updateProgress = (message: string) => {
      currentStep++
      setSaveProgress({ step: currentStep, total: totalSteps, message })
    }

    try {
      // Validate required fields before starting
      if (!grupoParse) {
        presentFeedback("Campo Requerido", "Favor de seleccionar un grupo antes de guardar.")
        return
      }
      if (!paqueteParse) {
        presentFeedback("Campo Requerido", "Favor de seleccionar un horario antes de guardar.")
        return
      }

      // 1. Save student
      updateProgress("Guardando datos del alumno...")
      const newEstudianteId = await guardarEstudianteObject()
      if (!newEstudianteId) throw new Error("Failed to save student.")

      updateProgress("Creando registro de presencia...")
      await ParseAPI.createPresencia(newEstudianteId)

      // 2. Upload student photo if exists
      if (alumnoPhoto) {
        updateProgress("Subiendo foto del alumno...")
        try {
          await guardarPhoto(newEstudianteId, alumnoPhoto, "student")
        } catch (photoError) {
          console.error("Error uploading student photo:", photoError)
        }
      }

      // 3. Create parents sequentially with progress updates
      const userIds: string[] = []

      let createdMamaId: string | null = null
      let createdPapaId: string | null = null

      if (hasMama) {
        updateProgress("Registrando a Mamá...")
        try {
          createdMamaId = await guardarParent("Mamá")
          if (createdMamaId) userIds.push(createdMamaId)
        } catch (mamaError) {
          console.error("Error creating Mamá:", mamaError)
        }
      }

      if (hasMama && mamaPhoto && createdMamaId) {
        updateProgress("Subiendo foto de Mamá...")
        try {
          await guardarPhoto(createdMamaId, mamaPhoto, "user")
        } catch (photoError) {
          console.error("Error uploading Mamá photo:", photoError)
        }
      }

      if (hasPapa) {
        updateProgress("Registrando a Papá...")
        try {
          createdPapaId = await guardarParent("Papá")
          if (createdPapaId) userIds.push(createdPapaId)
        } catch (papaError) {
          console.error("Error creating Papá:", papaError)
        }
      }

      if (hasPapa && papaPhoto && createdPapaId) {
        updateProgress("Subiendo foto de Papá...")
        try {
          await guardarPhoto(createdPapaId, papaPhoto, "user")
        } catch (photoError) {
          console.error("Error uploading Papá photo:", photoError)
        }
      }

      // 4. Create personas autorizadas sequentially
      if (validPersonasAut.length > 0 && !isRelationFound) {
        for (let i = 0; i < validPersonasAut.length; i++) {
          const persona = validPersonasAut[i]
          updateProgress(`Registrando persona autorizada (${i + 1}/${validPersonasAut.length})...`)
          try {
            const personaId = await createSinglePersonaAutorizada(persona)
            if (personaId) userIds.push(personaId)
          } catch (personaError) {
            console.error("Error creating persona autorizada:", personaError)
          }
        }
      }

      // 5. Set relations
      updateProgress("Vinculando familia con el expediente...")
      try {
        if (isRelationFound) {
          const existingFamilyIDs = personasAutArr.map(p => p.id).filter(id => id)
          console.log("Using existing family IDs:", existingFamilyIDs)
          if (existingFamilyIDs.length > 0) {
            await ParseAPI.updateEstudiantePersonasAutRelation(newEstudianteId, existingFamilyIDs)
          }
        } else {
          console.log("Using new user IDs:", userIds)
          if (userIds.length > 0) {
            await ParseAPI.updateEstudiantePersonasAutRelation(newEstudianteId, userIds)
          }
        }
      } catch (relationError) {
        console.error("Error setting family relations:", relationError)
      }

      setSaveProgress({ step: 0, total: 0, message: "" })
      presentFeedback("Éxito", "Expediente creado correctamente.")
      expedienteParams?.reloadTable?.()
      navigation.navigate("Estudiantes")
    } catch (error) {
      console.error("Error creating new expediente:", error)
      setSaveProgress({ step: 0, total: 0, message: "" })
      presentFeedback("Error", "No fue posible crear el expediente. Intente de nuevo.")
    }
  }

  async function guardarEstudianteObject(): Promise<string | null> {
    try {
      const colegiaturaInt = parseInt(colegiatura.replace("$", ""))
      const estudianteData = {
        nombre,
        apPaterno,
        apMaterno,
        apellido: `${apPaterno} ${apMaterno}`,
        grupoObj: grupoParse,
        paqueteObj: paqueteParse,
        horario: horario.name,
        curp,
        genero,
        colegiatura: colegiaturaInt,
        fechaIngreso,
        fechaNacimiento,
      }
      const result = await ParseAPI.saveEstudiante(authUserEscuela, estudianteData)
      if (!result) {
        throw new Error("Parse API returned null for student creation")
      }
      return result
    } catch (error) {
      console.error("Error saving student:", error)
      throw new Error(`Failed to save student: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  async function guardarParent(parentesco: "Mamá" | "Papá"): Promise<string | null> {
    try {
      const isMama = parentesco === "Mamá"
      const nombre = isMama ? mamaNombre : papaNombre
      const apellidos = isMama ? mamaApellidos : papaApellidos
      const email = isMama ? mamaEmail : papaEmail

      if (!nombre || !apellidos) {
        console.warn(`Skipping ${parentesco} creation - missing required fields`)
        return null
      }

      const userParams = {
        username: email || `${nombre}_${apellidos}`,
        nombre,
        apellidos,
        domicilio: isMama ? mamaDireccion : papaDireccion,
        telCasa: isMama ? mamaTelCasa : papaTelCasa,
        telCel: isMama ? mamaTelCel : papaTelCel,
        email,
        parentesco,
        escuela: authUserEscuela,
      }

      const result = await ParseAPI.runCloudCodeFunction("newUserSignUp", userParams)
      console.log(`${parentesco} creation result:`, JSON.stringify(result))

      // Handle both old and new response formats
      let objectId: string | null = null

      if (result) {
        if (result.success && result.data) {
          // New standardized format: { success: true, data: { userId: "..." } }
          objectId = result.data.userId || result.data.objectId || result.data.id
        } else if (result.success === false) {
          // New standardized error format
          const errorMsg = result.error?.message || `Failed to create ${parentesco} user`
          throw new Error(errorMsg)
        } else if (typeof result === 'string') {
          // Old format: direct string ID
          objectId = result
        } else if (result.objectId || result.id || result.userId) {
          // Old format: { objectId: "..." } or { id: "..." }
          objectId = result.objectId || result.id || result.userId
        }
      }

      if (!objectId) {
        throw new Error(`Failed to create ${parentesco} user - no ID returned`)
      }

      return objectId
    } catch (error) {
      console.error(`Error creating ${parentesco}:`, error)
      throw new Error(`Failed to create ${parentesco}: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  async function createSinglePersonaAutorizada(persona: any): Promise<string | null> {
    try {
      if (!persona.nombre || !persona.apellidos) {
        console.warn("Skipping persona autorizada creation - missing required fields")
        return null
      }

      const userParams = {
        username: `${persona.nombre}_${persona.apellidos}`,
        nombre: persona.nombre,
        apellidos: persona.apellidos,
        domicilio: persona.domicilio || "",
        telCasa: persona.telefonocasa || "",
        telCel: persona.telefonocelular || "",
        email: "", // personas autorizadas don't typically have email
        parentesco: persona.parentesco || "Familiar",
        escuela: authUserEscuela,
      }
      
      const result = await ParseAPI.runCloudCodeFunction("newUserSignUp", userParams)
      console.log("Persona autorizada creation result:", JSON.stringify(result))

      // Handle both old and new response formats
      let personaObjId: string | null = null

      if (result) {
        if (result.success && result.data) {
          // New standardized format: { success: true, data: { userId: "..." } }
          personaObjId = result.data.userId || result.data.objectId || result.data.id
        } else if (result.success === false) {
          // New standardized error format
          const errorMsg = result.error?.message || "Failed to create persona autorizada user"
          throw new Error(errorMsg)
        } else if (typeof result === 'string') {
          // Old format: direct string ID
          personaObjId = result
        } else if (result.objectId || result.id || result.userId) {
          // Old format: { objectId: "..." } or { id: "..." }
          personaObjId = result.objectId || result.id || result.userId
        }
      }

      if (!personaObjId) {
        throw new Error("Failed to create persona autorizada user - no ID returned")
      }

      if (persona.photo) {
        try {
          await guardarPhoto(personaObjId, persona.photo, "user")
        } catch (photoError) {
          console.error("Error uploading persona autorizada photo:", photoError)
          // Don't fail the entire operation for photo errors
          throw photoError
        }
      }
      return personaObjId
    } catch (error) {
      console.error("Error creating persona autorizada:", error)
      console.error("Persona data:", persona)
      throw new Error(`Failed to create persona autorizada: ${error instanceof Error ? error.message : String(error)}`)
    }
  }
  // #endregion

  // #region Photo Handling
  const adjuntarFotoAction = useCallback(async (persona: "Alumno" | "Mamá" | "Papá") => {
    const result = await ImagePicker.launchImageLibraryAsync({ allowsEditing: false, quality: 1 })
    if (result.canceled) return

    // Convert HEIC to JPEG if needed
    const originalUri = result.assets[0].uri
    const mimeType = result.assets[0].mimeType ?? ''
    const assetURI = await convertHeicToJpeg(originalUri, mimeType)

    switch (persona) {
      case "Alumno":
        setAlumnoPhoto(assetURI)
        if (isExisting) guardarPhoto(estudianteObjectId, assetURI, "student", true)
        break
      case "Mamá":
        setMamaPhoto(assetURI)
        if (isExisting) guardarPhoto(mamaObjectId, assetURI, "user", true)
        break
      case "Papá":
        setPapaPhoto(assetURI)
        if (isExisting) guardarPhoto(papaObjectId, assetURI, "user", true)
        break
    }
  }, [isExisting, estudianteObjectId, mamaObjectId, papaObjectId])

  async function guardarPhoto(objectId: string, assetURL: string, type: "student" | "user", destroyOld = false) {
    try {
      if (destroyOld) {
        if (type === "student") await ParseAPI.destroyStudentPhoto(objectId)
        else await ParseAPI.destroyUserPhoto(objectId)
      }

      const resId = type === "student" ? await ParseAPI.saveStudentPhoto(objectId) : await ParseAPI.saveUserPhoto(objectId)
      if (resId) {
        await AWSService.uploadImageDataToAWS(resId, assetURL, "image/jpeg", true)

        // Generate banana sticker for new students after photo upload
        if (type === "student" && !destroyOld) {
          try {
            const stickerResult = await ParseAPI.runCloudCodeFunction("generateBananaStickerForStudent", { estudianteId: objectId })
            if (stickerResult?.success) {
              console.log("Banana sticker generated successfully:", stickerResult.data)
            } else {
              console.warn("Banana sticker generation failed:", stickerResult?.error?.message || "Unknown error")
            }
          } catch (stickerError) {
            console.error("Error generating banana sticker:", stickerError)
            // Don't fail the photo upload if sticker generation fails
          }
        }

        if (destroyOld) presentFeedback("Foto Guardada", "La foto se ha actualizado correctamente.")
      } else {
        throw new Error("Failed to create photo record in Parse.")
      }
    } catch (error) {
      console.error(`Error saving ${type} photo:`, error)
      presentFeedback("Error de Foto", "No fue posible guardar la foto. Favor de intentar de nuevo.")
      throw error
    }
  }
  // #endregion

  // #region Personas Autorizadas and Family Linking
  function guardarPersonasAutorizadas(): Promise<any> {
    return new Promise(async (resolve, reject) => {
      try {
        const newUserIds: string[] = []
        const promises = Object.entries(changedPersonasAut).map(([index, personaChanges]) => {
          const person = personasAutArr[parseInt(index, 10)]
          const changedFields = (personaChanges as any)?.changedFields || {}

          if (!person) return Promise.resolve()
          
          if (person.id) { // Update existing person
            return modifyUserObject(person.id, changedFields)
          } else if (person.nombre?.trim() && person.apellidos?.trim()) { // Create new person
            // This handles creating new personas in an existing expediente
            const userParams = {
              username: `${person.nombre}_${person.apellidos}`,
              nombre: person.nombre,
              apellidos: person.apellidos,
              domicilio: person.domicilio || "",
              telCasa: person.telefonocasa || "",
              telCel: person.telefonocelular || "",
              email: "", // personas autorizadas don't typically have email
              parentesco: person.parentesco || "Familiar",
              escuela: authUserEscuela,
            }
            return ParseAPI.runCloudCodeFunction("newUserSignUp", userParams).then(result => {
              console.log("Persona autorizada (existing expediente) creation result:", JSON.stringify(result))

              // Handle both old and new response formats
              let objId: string | null = null

              if (result) {
                if (result.success && result.data) {
                  objId = result.data.userId || result.data.objectId || result.data.id
                } else if (result.success === false) {
                  throw new Error(result.error?.message || "Failed to create persona autorizada")
                } else if (typeof result === 'string') {
                  objId = result
                } else if (result.objectId || result.id || result.userId) {
                  objId = result.objectId || result.id || result.userId
                }
              }

              if (!objId) {
                throw new Error("Failed to create persona autorizada - no ID returned")
              }

              // Collect the new user ID for relationship update
              newUserIds.push(objId)

              if (person.photo) {
                return guardarPhoto(objId, person.photo, "user").catch(photoError => {
                  console.error("Error uploading persona photo:", photoError)
                  // Don't fail the entire operation for photo errors
                  return Promise.resolve()
                })
              }
              return Promise.resolve()
            })
          }
          return Promise.resolve()
        })
        
        const results = await Promise.allSettled(promises)
        const failures = results.filter(r => r.status === 'rejected')
        if (failures.length > 0) {
          console.error("Some persona autorizada operations failed:", failures)
          // Don't reject entirely - partial success is acceptable
        }
        
        // Update the relationship with the student for new users
        if (newUserIds.length > 0 && estudianteObjectId) {
          try {
            await ParseAPI.updateEstudiantePersonasAutRelation(estudianteObjectId, newUserIds)
            console.log("Successfully updated relationship with new personas autorizadas:", newUserIds)
          } catch (relationError) {
            console.error("Error updating relationship with new personas autorizadas:", relationError)
            // Don't fail the entire operation for relationship errors
          }
        }
        
        resolve(results)
      } catch (error) {
        console.error("Error in guardarPersonasAutorizadas:", error)
        reject(new Error(`Failed to save personas autorizadas: ${error instanceof Error ? error.message : String(error)}`))
      }
    })
  }

  async function modifyUserObject(userObjId: string, changedFields: any): Promise<any> {
    // This is inefficient. Ideally, the backend would accept one call with all changes.
    // For now, we replicate the multiple-call logic but with promises.
    const fieldToCloudFunction = {
      nombre: "modifyUserNombre",
      apellidos: "modifyUserApellidos",
      domicilio: "modifyUserDomicilio",
      telefonocasa: "modifyUserTelefonoCasa",
      telefonocelular: "modifyUserTelefonoCelular",
      parentesco: "modifyUserParentesco",
    }
    
    const promises = Object.keys(changedFields).map(field => {
      const funcName = fieldToCloudFunction[field as keyof typeof fieldToCloudFunction]
      if (funcName) {
        const params = { objectID: userObjId, [field]: changedFields[field] }
        return ParseAPI.runCloudCodeFunction(funcName, params).catch(error => {
          console.error(`Error updating user ${field}:`, error)
          throw error
        })
      }
      return Promise.resolve()
    })
    return Promise.all(promises)
  }

  async function findHermanos() {
    if (!apPaterno || !apMaterno) {
      presentFeedback("Error", "Favor de ingresar los apellidos del alumno en este expediente.")
      return
    }
    
    try {
      const apellidos = `${apPaterno} ${apMaterno}`
      const hermanos = await ParseAPI.findHermanos(apellidos)
      if (hermanos.length > 0) {
        confirmAsociarHermano(hermanos)
      } else {
        presentFeedback("Sin Resultados", "No se encontraron hermanos con los apellidos ingresados.")
      }
    } catch (error) {
      console.error("Error searching for siblings:", error)
      presentFeedback("Error", "No fue posible buscar hermanos. Verifique su conexión e intente nuevamente.")
    }
  }

  function confirmAsociarHermano(hermanos: any) {
    const firstHermano = hermanos[0]
    const hermanoName = `${firstHermano.get("NOMBRE")} ${firstHermano.get("ApPATERNO")} ${firstHermano.get("ApMATERNO")}`
    Alert.alert(
      "Hermano existente",
      `¿Deseas asociar la familia de este hermano?\n${hermanoName}`,
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Asociar", onPress: () => asociarHermano(firstHermano.get("PersonasAutorizadas")) },
      ],
    )
  }

  async function asociarHermano(persAutRelation: any) {
    try {
      const relation = await ParseAPI.fetchEstudiantePersonasAutorizadasRelation(persAutRelation)
      if (relation && relation.length > 0) {
        setPersonasAutArr(relation)
        setIsRelationFound(true)
        Alert.alert(
          "Familia asociada",
          "La familia se ha asociado. Guarda el expediente para finalizar. La familia se mostrará después de guardar.",
          [
            { text: "Seguir editando", style: "cancel" },
            { text: "Guardar expediente", onPress: guardarAction },
          ],
        )
      } else {
        presentFeedback("Error", "No se pudo obtener la información de la familia. Intente nuevamente.")
      }
    } catch (error) {
      console.error("Error associating sibling family:", error)
      presentFeedback("Error", "No fue posible asociar la familia. Verifique su conexión e intente nuevamente.")
    }
  }
  // #endregion

  // #region Component Handlers
  const handlePersAutUpdate = useCallback((updatedPeople: any[], changedPeople: any) => {
    setPersonasAutArr(updatedPeople)
    setChangedPersonasAut(changedPeople)
    if (isExisting && Object.keys(changedPeople).length > 0) {
      updateChangeTracker("personasAutorizadas", "personasAutorizadas", true)
    }
  }, [isExisting, updateChangeTracker])

  async function fetchGrupoFromServer(grupoId: string) {
    try {
      return await ParseAPI.fetchGrupo(grupoId)
    } catch (error) {
      console.error("Error fetching grupo:", error)
      presentFeedback("Error", "Ocurrió un error al obtener el grupo.")
      return null
    }
  }

  async function fetchPaqueteFromServer(paqueteId: string) {
    try {
      return await ParseAPI.fetchPaquete(paqueteId)
    } catch (error) {
      console.error("Error fetching paquete:", error)
      presentFeedback("Error", "Ocurrió un error al obtener el paquete.")
      return null
    }
  }

  const handleGrupoSelection = useCallback((itemId: string) => {
    console.log("handleGrupoSelection", itemId)
    const selectedGrupo = gruposArr.find(item => item.id === itemId)
    if (selectedGrupo) {
      setGrupo(selectedGrupo)
      updateChangeTracker("estudiante", "grupoObj", true)
      fetchGrupoFromServer(itemId).then(setGrupoParse)
    }
  }, [gruposArr, updateChangeTracker])

  const handleHorarioSelection = useCallback((itemId: string) => {
    const selectedHorario = horariosArr.find(item => item.id === itemId)
          if (selectedHorario) {
        const horarioWithStringPrecio = {
          ...selectedHorario,
          precio: String(selectedHorario.precio)
        }
        setHorario(horarioWithStringPrecio)
        setColegiatura(`$${selectedHorario.precio}`)
        updateChangeTracker("estudiante", "horario", true)
        updateChangeTracker("estudiante", "paqueteObj", true)
        fetchPaqueteFromServer(itemId).then(setPaqueteParse)
      }
  }, [horariosArr, updateChangeTracker])

  const onFechaIngresoChange = useCallback((_: any, selectedDate?: Date) => {
    setShowDatePicker(false)
    if (selectedDate) {
      setFechaIngreso(selectedDate)
      updateChangeTracker("estudiante", "fechaIngreso", true)
    }
  }, [updateChangeTracker])

  const onFechaNacimientoChange = useCallback((_: any, selectedDate?: Date) => {
    setShowNacimientoPicker(false)
    if (selectedDate) {
      setFechaNacimiento(selectedDate)
      updateChangeTracker("estudiante", "fechaNacimiento", true)
    }
  }, [updateChangeTracker])

  const handleFieldChange = useCallback((setter: (value: any) => void, category: keyof ChangeTracker, field: string) => (text: string) => {
    setter(text)
    updateChangeTracker(category, field)
  }, [updateChangeTracker])

  const handleGeneroChange = useCallback((event: any) => {
    const newIndex = event.nativeEvent.selectedSegmentIndex
    setSelectedIndex(newIndex)
    setGenero(newIndex === 0 ? "F" : "M")
    updateChangeTracker("estudiante", "genero")
  }, [updateChangeTracker])

  const handleAdjuntarAlumnoPhoto = useCallback(() => adjuntarFotoAction("Alumno"), [adjuntarFotoAction])
  const handleAdjuntarMamaPhoto = useCallback(() => adjuntarFotoAction("Mamá"), [adjuntarFotoAction])
  const handleAdjuntarPapaPhoto = useCallback(() => adjuntarFotoAction("Papá"), [adjuntarFotoAction])

  const handleActivateMama = useCallback(() => activateUser(mamaObjectId, "mama"), [mamaObjectId])
  const handleActivatePapa = useCallback(() => activateUser(papaObjectId, "papa"), [papaObjectId])

  const openGrupoPicker = useCallback(() => setGrupoPickerVisible(true), [])
  const closeGrupoPicker = useCallback(() => setGrupoPickerVisible(false), [])
  const openHorarioPicker = useCallback(() => setHorarioPickerVisible(true), [])
  const closeHorarioPicker = useCallback(() => setHorarioPickerVisible(false), [])

  const openDatePicker = useCallback(() => setShowDatePicker(true), [])
  const openNacimientoPicker = useCallback(() => setShowNacimientoPicker(true), [])
  // #endregion

  return (
    <>
      <View style={$header}>
        <TouchableOpacity onPress={guardarAction} style={$saveButton}>
          <Text text="Guardar" weight="bold" style={$saveButtonText} />
        </TouchableOpacity>
      </View>
      <Screen style={$root} preset="scroll">
        {isLoading ? (
          <View style={$loadingContainer}>
            <Text text="Guardando expediente" size="xl" weight="bold" style={$loadingTitle} />
            {saveProgress.total > 0 && (
              <>
                <Text text={saveProgress.message} style={$loadingStepText} />
                <View style={$progressBarContainer}>
                  <View style={[$progressBarFill, { width: `${(saveProgress.step / saveProgress.total) * 100}%` }]} />
                </View>
                <Text text={`Paso ${saveProgress.step} de ${saveProgress.total}`} style={$loadingProgressText} />
              </>
            )}
            <ActivityIndicator size="large" color={colors.palette.actionBlue} style={$loadingSpinner} />
          </View>
        ) : (
          <View>
            {/* Alumno Section */}
            <PhotoView photoURL={alumnoPhoto} />
            <View style={$adjuntarBtn}>
              <Button title="Adjuntar foto" onPress={handleAdjuntarAlumnoPhoto} />
            </View>

            <View style={$dateRow}>
              <Text text="Fecha de ingreso:" style={$dateLabel} />
              {fechaIngreso && (
                <>
                  {Platform.OS === "ios" ? (
                    <DateTimePicker value={fechaIngreso} mode="date" display="default" onChange={onFechaIngresoChange} />
                  ) : (
                    <TouchableOpacity onPress={openDatePicker} style={$inputFieldAndroid}>
                      <Text>{fechaIngreso.toLocaleDateString()}</Text>
                    </TouchableOpacity>
                  )}
                  {showDatePicker && Platform.OS === "android" && (
                    <DateTimePicker value={fechaIngreso} mode="date" display="default" onChange={onFechaIngresoChange} />
                  )}
                </>
              )}
            </View>

            <Text text="Nombre:" style={$inputLabel} />
            <TextInput style={$inputField} placeholder="Nombre..." value={nombre} onChangeText={handleFieldChange(setNombre, 'estudiante', 'nombre')} />

            <Text text="Apellido paterno:" style={$inputLabel} />
            <TextInput style={$inputField} placeholder="Apellido paterno..." value={apPaterno} onChangeText={handleFieldChange(setApPaterno, 'estudiante', 'apPaterno')} />

            <Text text="Apellido materno:" style={$inputLabel} />
            <TextInput style={$inputField} placeholder="Apellido materno..." value={apMaterno} onChangeText={handleFieldChange(setApMaterno, 'estudiante', 'apMaterno')} />

            <View style={$dateRow}>
              <Text text="Fecha de nacimiento:" style={$inputLabel} />
              {fechaNacimiento && (
                <>
                  {Platform.OS === "ios" ? (
                    <DateTimePicker value={fechaNacimiento} mode="date" display="default" onChange={onFechaNacimientoChange} />
                  ) : (
                    <TouchableOpacity onPress={openNacimientoPicker} style={$inputFieldAndroid}>
                      <Text>{fechaNacimiento.toLocaleDateString()}</Text>
                    </TouchableOpacity>
                  )}
                  {showNacimientoPicker && Platform.OS === "android" && (
                    <DateTimePicker value={fechaNacimiento} mode="date" display="default" onChange={onFechaNacimientoChange} />
                  )}
                </>
              )}
            </View>

            <Text text="Género:" style={$inputLabel} />
            <SegmentedControl
              values={["Femenino", "Masculino"]}
              selectedIndex={selectedIndex}
              style={$segmentedControl}
              onChange={handleGeneroChange}
            />

            <Text text="CURP:" style={$inputLabel} />
            <TextInput style={$inputField} placeholder="CURP..." value={curp} onChangeText={handleFieldChange(setCurp, 'estudiante', 'curp')} />

            {/* Grupo Picker */}
            <Text text="Grupo:" style={$inputLabel} />
            <TouchableOpacity style={$inputField} onPress={openGrupoPicker}>
              <Text style={grupo.name ? $pickerSelectedText : $pickerPlaceholderText}>{grupo.name || "Grupo..."}</Text>
            </TouchableOpacity>
            <PickerModal visible={grupoPickerVisible} onClose={closeGrupoPicker} onValueChange={handleGrupoSelection} items={gruposArr} selectedValue={grupo.id} />

            {/* Horario Picker */}
            <Text text="Horario:" style={$inputLabel} />
            <TouchableOpacity style={$inputField} onPress={openHorarioPicker}>
              <Text style={horario.name ? $pickerSelectedText : $pickerPlaceholderText}>{horario.name || "Horario..."}</Text>
            </TouchableOpacity>
            <PickerModal visible={horarioPickerVisible} onClose={closeHorarioPicker} onValueChange={handleHorarioSelection} items={horariosArr} selectedValue={horario.id} />

            <Text text="Colegiatura:" style={$inputLabel} />
            <TextInput style={$inputField} placeholder="Colegiatura..." value={colegiatura} onChangeText={handleFieldChange(setColegiatura, 'estudiante', 'colegiatura')} />

            {/* Mamá Section */}
            <View style={$sectionHeader}>
              <Text text="Mamá" style={$h2Label} />
              <TouchableOpacity onPress={findHermanos} style={$asociarFamiliaBtn}>
                <Text text="Asociar Familia" style={$asociarFamiliaText} />
              </TouchableOpacity>
            </View>
            {mamaStatus !== 0 && (
              <View>
                <Text text="Persona Desactivada" style={$deactivatedWarning} />
                <TouchableOpacity
                  style={$activateButton}
                  onPress={handleActivateMama}
                >
                  <Text text="Activar" weight="bold" style={$activateButtonText} />
                </TouchableOpacity>
              </View>
            )}
            <View style={$infoCard}>
              <PhotoView photoURL={mamaPhoto} />
              <View style={$adjuntarBtn}><Button title="Adjuntar foto" onPress={handleAdjuntarMamaPhoto} /></View>
              <Text text="Nombre:" style={mamaStatus !== 0 ? $inputLabelGrayed : $inputLabel} /><TextInput style={$inputField} value={mamaNombre} onChangeText={handleFieldChange(setMamaNombre, 'mama', 'nombre')} />
              <Text text="Apellidos:" style={mamaStatus !== 0 ? $inputLabelGrayed : $inputLabel} /><TextInput style={$inputField} value={mamaApellidos} onChangeText={handleFieldChange(setMamaApellidos, 'mama', 'apellidos')} />
              <Text text="Dirección:" style={mamaStatus !== 0 ? $inputLabelGrayed : $inputLabel} /><TextInput style={$inputField} value={mamaDireccion} onChangeText={handleFieldChange(setMamaDireccion, 'mama', 'domicilio')} />
              <Text text="Teléfono Casa:" style={mamaStatus !== 0 ? $inputLabelGrayed : $inputLabel} /><TextInput style={$inputField} value={mamaTelCasa} onChangeText={handleFieldChange(setMamaTelCasa, 'mama', 'telefonocasa')} />
              <Text text="Teléfono Celular:" style={mamaStatus !== 0 ? $inputLabelGrayed : $inputLabel} /><TextInput style={$inputField} value={mamaTelCel} onChangeText={handleFieldChange(setMamaTelCel, 'mama', 'telefonocelular')} />
              <Text text="Email:" style={mamaStatus !== 0 ? $inputLabelGrayed : $inputLabel} /><TextInput style={$inputField} value={mamaEmail} autoCapitalize="none" onChangeText={handleFieldChange(setMamaEmail, 'mama', 'email')} />
            </View>

            {/* Papá Section */}
            <Text text="Papá" style={$h2Label} />
            {papaStatus !== 0 && (
              <View>
                <Text text="Persona Desactivada" style={$deactivatedWarning} />
                <TouchableOpacity
                  style={$activateButton}
                  onPress={handleActivatePapa}
                >
                  <Text text="Activar" weight="bold" style={$activateButtonText} />
                </TouchableOpacity>
              </View>
            )}
            <View style={$infoCard}>
              <PhotoView photoURL={papaPhoto} />
              <View style={$adjuntarBtn}><Button title="Adjuntar foto" onPress={handleAdjuntarPapaPhoto} /></View>
              <Text text="Nombre:" style={papaStatus !== 0 ? $inputLabelGrayed : $inputLabel} /><TextInput style={$inputField} value={papaNombre} onChangeText={handleFieldChange(setPapaNombre, 'papa', 'nombre')} />
              <Text text="Apellidos:" style={papaStatus !== 0 ? $inputLabelGrayed : $inputLabel} /><TextInput style={$inputField} value={papaApellidos} onChangeText={handleFieldChange(setPapaApellidos, 'papa', 'apellidos')} />
              <Text text="Dirección:" style={papaStatus !== 0 ? $inputLabelGrayed : $inputLabel} /><TextInput style={$inputField} value={papaDireccion} onChangeText={handleFieldChange(setPapaDireccion, 'papa', 'domicilio')} />
              <Text text="Teléfono Casa:" style={papaStatus !== 0 ? $inputLabelGrayed : $inputLabel} /><TextInput style={$inputField} value={papaTelCasa} onChangeText={handleFieldChange(setPapaTelCasa, 'papa', 'telefonocasa')} />
              <Text text="Teléfono Celular:" style={papaStatus !== 0 ? $inputLabelGrayed : $inputLabel} /><TextInput style={$inputField} value={papaTelCel} onChangeText={handleFieldChange(setPapaTelCel, 'papa', 'telefonocelular')} />
              <Text text="Email:" style={papaStatus !== 0 ? $inputLabelGrayed : $inputLabel} /><TextInput style={$inputField} value={papaEmail} autoCapitalize="none" onChangeText={handleFieldChange(setPapaEmail, 'papa', 'email')} />
            </View>

            {/* Personas Autorizadas Section */}
            <Text text="Personas Autorizadas" style={$h2Label} />
            <PersonasAutorizadasTable onPeopleUpdate={handlePersAutUpdate} existingPeople={personasAutArr} />

            <View style={$bottomSpacer} />
          </View>
        )}
      </Screen>
    </>
  )
})

// #region Sub-components
interface PhotoViewProps {
  photoURL: string | null
}

const PhotoView = memo(function PhotoView({ photoURL }: PhotoViewProps) {
  if (photoURL) {
    return <Image source={{ uri: photoURL }} style={$photo} />
  }
  return <View style={$photoPlaceholder} />
})

interface PickerModalProps {
  visible: boolean
  onClose: () => void
  onValueChange: (value: string) => void
  items: Array<{ id: string; name: string }>
  selectedValue: string
  label?: string
}

const PickerModal = memo(function PickerModal({ visible, onClose, onValueChange, items, selectedValue, label = "Seleccione" }: PickerModalProps) {
  return (
    <Modal transparent={true} visible={visible} onRequestClose={onClose}>
      <View style={$modalOverlay}>
        <View style={$pickerContainer}>
          <View style={$pickerHeader}>
            <TouchableOpacity onPress={onClose} style={$doneButton}>
              <Text weight="bold" style={$doneButtonText}>Listo</Text>
            </TouchableOpacity>
          </View>
          <Picker selectedValue={selectedValue} onValueChange={onValueChange}>
            <Picker.Item label={label} value="" />
            {items.map((item: { id: string; name: string }) => (
              <Picker.Item label={item.name} value={item.id} key={item.id} />
            ))}
          </Picker>
        </View>
      </View>
    </Modal>
  )
})
// #endregion



// #region Styles
const $root: ViewStyle = {
  flex: 1,
  backgroundColor: colors.background,
  paddingTop: spacing.tiny,
  paddingHorizontal: spacing.stdPadding,
  paddingBottom: spacing.large,
  marginBottom: 2
}
const $header: ViewStyle = {
  height: 42,
  width: "100%",
  backgroundColor: colors.palette.lavanderClear,
  justifyContent: "center",
  alignItems: "flex-end",
}
const $saveButton: ViewStyle = {
  paddingHorizontal: spacing.medium,
  paddingVertical: spacing.small,
}
const $loadingContainer: ViewStyle = {
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
  marginTop: 80,
  paddingHorizontal: spacing.large,
}
const $loadingTitle: TextStyle = {
  marginBottom: spacing.medium,
  color: colors.palette.neutral700,
}
const $loadingStepText: TextStyle = {
  marginBottom: spacing.small,
  color: colors.palette.neutral600,
  textAlign: "center",
  fontSize: 16,
}
const $loadingProgressText: TextStyle = {
  marginTop: spacing.small,
  color: colors.palette.neutral500,
  fontSize: 14,
}
const $progressBarContainer: ViewStyle = {
  width: "100%",
  height: 8,
  backgroundColor: colors.palette.neutral200,
  borderRadius: 4,
  overflow: "hidden",
}
const $progressBarFill: ViewStyle = {
  height: "100%",
  backgroundColor: colors.palette.actionBlue,
  borderRadius: 4,
}
const $loadingSpinner: ViewStyle = {
  marginTop: spacing.large,
}
const $photo: ImageStyle = {
  width: 125,
  height: 156,
  borderRadius: 8,
  alignSelf: "center",
  marginVertical: spacing.small,
}
const $adjuntarBtn: ViewStyle = {
  alignItems: 'center', 
  justifyContent: 'center', 
  width: '100%' 
}
const $inputField: ViewStyle = {
  height: 36,
  borderColor: colors.palette.neutral300,
  borderWidth: 1,
  paddingLeft: 8,
  margin: 4,
  borderRadius: 10,
}
const $inputFieldAndroid: ViewStyle = {
  height: 36,
  borderColor: colors.palette.neutral300,
  borderWidth: 1,
  padding: 4,
  marginLeft: 4,
  borderRadius: 10,
}
const $inputLabel: TextStyle = {
  marginTop: 6
}
const $h2Label: TextStyle = {
  height: 30,
  fontSize: 24,
  fontWeight: "700",
  marginTop: 28
}
const $infoCard: ViewStyle = {
  backgroundColor: colors.palette.neutral100, 
  borderRadius: 12, 
  padding: 8
}
const $modalOverlay: ViewStyle = {
  flex: 1,
  justifyContent: 'center',
  alignItems: 'center',
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
}
const $pickerContainer: ViewStyle = {
  backgroundColor: 'white',
  width: '80%',
  borderRadius: 4,
}
const $dateRow: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  marginTop: spacing.small,
  marginBottom: spacing.small,
}
const $sectionHeader: ViewStyle = {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
}
const $pickerHeader: ViewStyle = {
  flexDirection: "row",
  justifyContent: "flex-end",
  alignItems: "center",
  paddingHorizontal: 16,
  paddingVertical: 12,
  borderBottomWidth: 1,
  borderBottomColor: colors.palette.neutral300,
}
const $doneButton: ViewStyle = {
  paddingHorizontal: 8,
  paddingVertical: 4,
  backgroundColor: colors.palette.bluejeansDark,
  borderRadius: 8,
}
const $doneButtonText: TextStyle = {
  color: colors.palette.neutral100,
  fontWeight: "bold",
  fontSize: 14,
}

const $deactivatedWarning: TextStyle = {
  color: 'red',
  fontSize: 12,
  fontWeight: 'bold',
  marginBottom: 4,
  marginTop: 1,
}

const $inputLabelGrayed: TextStyle = {
  marginTop: 6,
  color: colors.palette.neutral400
}

const $activateButton: ViewStyle = {
  backgroundColor: 'white',
  paddingHorizontal: 8,
  paddingVertical: 2,
  borderRadius: 8,
  marginTop: 2,
  marginBottom: 6,
  alignSelf: 'flex-start',
}

const $activateButtonText: TextStyle = {
  color: colors.palette.actionBlue,
  fontSize: 14,
  fontWeight: 'bold',
}

const $saveButtonText: TextStyle = {
  color: colors.palette.actionColor,
}

const $dateLabel: TextStyle = {
  marginTop: 4,
}

const $segmentedControl: ViewStyle = {
  marginBottom: 8,
}

const $pickerSelectedText: TextStyle = {
  paddingTop: 5,
  color: "black",
}

const $pickerPlaceholderText: TextStyle = {
  paddingTop: 5,
  color: "gray",
}

const $asociarFamiliaBtn: ViewStyle = {
  padding: 4,
}

const $asociarFamiliaText: TextStyle = {
  color: colors.palette.actionBlue,
}

const $bottomSpacer: ViewStyle = {
  height: 100,
}

const $photoPlaceholder: ViewStyle = {
  width: 125,
  height: 156,
  borderRadius: 8,
  alignSelf: "center",
  marginVertical: spacing.small,
  backgroundColor: colors.palette.neutral300,
}
// #endregion
