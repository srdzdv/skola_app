import React, { FC, useState, useCallback, memo } from "react"
import * as ParseAPI from "../services/parse/ParseAPI"
import * as AWSService from "../services/AWSService"
import * as ParseInit from "../services/parse/ParseInit"
import {
  ViewStyle,
  TextStyle,
  ImageStyle,
  View,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  Image,
  KeyboardAvoidingView,
} from "react-native"
import { NativeStackScreenProps } from "@react-navigation/native-stack"
import { AppStackScreenProps } from "app/navigators"
import { Screen, Text } from "app/components"
import { colors } from "../theme"
import * as Haptics from "expo-haptics"
import * as ImagePicker from "expo-image-picker"
import * as ImageManipulator from "expo-image-manipulator"
import DateTimePicker from "@react-native-community/datetimepicker"
import SegmentedControl from "@react-native-segmented-control/segmented-control"
import { Entypo } from "@expo/vector-icons"

const convertHeicToJpeg = async (uri: string, mimeType: string): Promise<string> => {
  const isHeic = mimeType?.toLowerCase().includes("heic") || mimeType?.toLowerCase().includes("heif")
  if (!isHeic) return uri
  const result = await ImageManipulator.manipulateAsync(uri, [], {
    compress: 0.9,
    format: ImageManipulator.SaveFormat.JPEG,
  })
  return result.uri
}

// Steps
const STEP_SCHOOL_CODE = 0
const STEP_STUDENT_INFO = 1
const STEP_PARENT_INFO = 2
const STEP_CONFIRM = 3

const STEP_TITLES = [
  "Código de Escuela",
  "Datos del Alumno",
  "Datos del Padre/Madre",
  "Confirmar Registro",
]

interface RegistroAlumnoScreenProps
  extends NativeStackScreenProps<AppStackScreenProps<"RegistroAlumno">> {}

const PhotoView = memo(function PhotoView({ photoURL }: { photoURL: string | null }) {
  if (photoURL) {
    return <Image source={{ uri: photoURL }} style={$photo} />
  }
  return <View style={$photoPlaceholder}><Entypo name="camera" size={32} color={colors.palette.neutral400} /></View>
})

export const RegistroAlumnoScreen: FC<RegistroAlumnoScreenProps> = function RegistroAlumnoScreen({
  navigation,
}) {
  const [currentStep, setCurrentStep] = useState(STEP_SCHOOL_CODE)
  const [isLoading, setIsLoading] = useState(false)
  const [saveProgress, setSaveProgress] = useState("")

  // School State
  const [schoolCode, setSchoolCode] = useState("")
  const [schoolName, setSchoolName] = useState("")
  const [escuelaId, setEscuelaId] = useState("")

  // Student State
  const [alumnoPhoto, setAlumnoPhoto] = useState<string | null>(null)
  const [nombre, setNombre] = useState("")
  const [apPaterno, setApPaterno] = useState("")
  const [apMaterno, setApMaterno] = useState("")
  const [curp, setCurp] = useState("")
  const [fechaNacimiento, setFechaNacimiento] = useState(new Date())
  const [generoIndex, setGeneroIndex] = useState(0)
  const [showNacimientoPicker, setShowNacimientoPicker] = useState(false)

  // Parent State
  const [parentPhoto, setParentPhoto] = useState<string | null>(null)
  const [parentNombre, setParentNombre] = useState("")
  const [parentApellidos, setParentApellidos] = useState("")
  const [parentEmail, setParentEmail] = useState("")
  const [parentTelefono, setParentTelefono] = useState("")
  const [parentDireccion, setParentDireccion] = useState("")
  const [parentesco, setParentesco] = useState("Mamá")
  const [parentescoIndex, setParentescoIndex] = useState(0)

  function presentFeedback(title: string, message: string) {
    Alert.alert(title, message, [{ text: "Ok" }])
  }

  // =====================
  // Step 1: School Code
  // =====================
  const validateSchoolCode = useCallback(async () => {
    if (!schoolCode.trim()) {
      presentFeedback("Campo Requerido", "Ingresa el código de tu escuela.")
      return
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    setIsLoading(true)

    // Ensure Parse is initialized
    ParseInit.initializeParseDetails("SKOLA_SERVER")

    try {
      const result = await ParseAPI.validateSchoolCode(schoolCode.trim())
      if (result.valid && result.nombre) {
        setSchoolName(result.nombre)
        setEscuelaId(result.escuelaId)
        setCurrentStep(STEP_STUDENT_INFO)
      } else {
        presentFeedback(
          "Código Inválido",
          "No se encontró una escuela con ese código. Verifica con tu escuela el código de registro.",
        )
      }
    } catch (error) {
      presentFeedback("Error", "No fue posible verificar el código. Intenta de nuevo.")
    } finally {
      setIsLoading(false)
    }
  }, [schoolCode])

  // =====================
  // Step 2: Student Info
  // =====================
  const validateStudentInfo = useCallback(() => {
    const errors: string[] = []
    if (!nombre.trim()) errors.push("Nombre del alumno")
    if (!apPaterno.trim()) errors.push("Apellido paterno")

    if (errors.length > 0) {
      presentFeedback("Campos Requeridos", "Faltan: " + errors.join(", "))
      return
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    setCurrentStep(STEP_PARENT_INFO)
  }, [nombre, apPaterno])

  // =====================
  // Step 3: Parent Info
  // =====================
  const validateParentInfo = useCallback(() => {
    const errors: string[] = []
    if (!parentNombre.trim()) errors.push("Nombre")
    if (!parentApellidos.trim()) errors.push("Apellidos")
    if (!parentEmail.trim()) errors.push("Email")

    if (errors.length > 0) {
      presentFeedback("Campos Requeridos", "Faltan: " + errors.join(", "))
      return
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(parentEmail)) {
      presentFeedback("Email Inválido", "Ingresa un email válido.")
      return
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    setCurrentStep(STEP_CONFIRM)
  }, [parentNombre, parentApellidos, parentEmail])

  // =====================
  // Step 4: Submit
  // =====================
  const submitRegistration = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
    setIsLoading(true)

    try {
      // 1. Create the student
      setSaveProgress("Registrando alumno...")
      const estudianteId = await ParseAPI.saveEstudiantePendiente(escuelaId, {
        nombre,
        apPaterno,
        apMaterno,
        curp,
        genero: generoIndex === 0 ? "F" : "M",
        fechaNacimiento,
      })

      if (!estudianteId) {
        throw new Error("No fue posible registrar al alumno.")
      }

      // 2. Upload student photo if provided
      if (alumnoPhoto) {
        setSaveProgress("Subiendo foto del alumno...")
        try {
          const photoId = await ParseAPI.saveStudentPhoto(estudianteId)
          if (photoId) {
            await AWSService.uploadImageDataToAWS(photoId, alumnoPhoto, "image/jpeg", true)
          }
        } catch (photoError) {
          console.error("Error uploading student photo:", photoError)
        }
      }

      // 3. Create parent account and link to student
      setSaveProgress("Creando cuenta de padre/madre...")
      const parentResult = await ParseAPI.registerParentPublic(escuelaId, estudianteId, {
        nombre: parentNombre,
        apellidos: parentApellidos,
        email: parentEmail,
        telefono: parentTelefono,
        direccion: parentDireccion,
        parentesco,
      })

      // 4. Upload parent photo if provided
      if (parentPhoto && parentResult.userId) {
        setSaveProgress("Subiendo foto del padre/madre...")
        try {
          const photoId = await ParseAPI.saveUserPhoto(parentResult.userId)
          if (photoId) {
            await AWSService.uploadImageDataToAWS(photoId, parentPhoto, "image/jpeg", true)
          }
        } catch (photoError) {
          console.error("Error uploading parent photo:", photoError)
        }
      }

      // 5. Send welcome email
      setSaveProgress("Enviando email de bienvenida...")
      const studentFullName = `${nombre} ${apPaterno} ${apMaterno}`.trim()
      await ParseAPI.sendRegistrationEmail({
        email: parentEmail,
        parentName: `${parentNombre} ${parentApellidos}`,
        studentName: studentFullName,
        schoolName,
        username: parentResult.username,
        escuelaId,
      })

      setIsLoading(false)
      setSaveProgress("")

      Alert.alert(
        "Registro Exitoso",
        `El alumno ${nombre} ha sido registrado correctamente.\n\nSe ha enviado un email a ${parentEmail} con los datos de acceso.\n\nLa escuela revisará tu registro y asignará grupo y horario.`,
        [{ text: "Aceptar", onPress: () => navigation.goBack() }],
      )
    } catch (error: any) {
      console.error("Error in registration:", error)
      setIsLoading(false)
      setSaveProgress("")
      presentFeedback(
        "Error de Registro",
        error.message || "Ocurrió un error durante el registro. Intenta de nuevo.",
      )
    }
  }, [
    escuelaId, nombre, apPaterno, apMaterno, curp, generoIndex, fechaNacimiento,
    alumnoPhoto, parentNombre, parentApellidos, parentEmail, parentTelefono,
    parentDireccion, parentesco, parentPhoto, schoolName, navigation,
  ])

  // =====================
  // Photo Picker
  // =====================
  const pickPhoto = useCallback(async (target: "alumno" | "parent") => {
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      quality: 0.8,
      aspect: [3, 4],
    })
    if (result.canceled) return

    const originalUri = result.assets[0].uri
    const mimeType = result.assets[0].mimeType ?? ""
    const assetURI = await convertHeicToJpeg(originalUri, mimeType)

    if (target === "alumno") {
      setAlumnoPhoto(assetURI)
    } else {
      setParentPhoto(assetURI)
    }
  }, [])

  const onFechaNacimientoChange = useCallback((_: any, selectedDate?: Date) => {
    setShowNacimientoPicker(false)
    if (selectedDate) {
      setFechaNacimiento(selectedDate)
    }
  }, [])

  // =====================
  // Navigation
  // =====================
  const goBack = useCallback(() => {
    if (currentStep === STEP_SCHOOL_CODE) {
      navigation.goBack()
    } else {
      setCurrentStep(currentStep - 1)
    }
  }, [currentStep, navigation])

  // =====================
  // Render Steps
  // =====================
  function renderStepIndicator() {
    return (
      <View style={$stepIndicator}>
        {STEP_TITLES.map((title, index) => (
          <View
            key={index}
            style={[
              $stepDot,
              index === currentStep ? $stepDotActive : null,
              index < currentStep ? $stepDotCompleted : null,
            ]}
          />
        ))}
      </View>
    )
  }

  function renderSchoolCodeStep() {
    return (
      <View style={$stepContainer}>
        <Text style={$stepTitle} text="Código de Escuela" weight="bold" />
        <Text style={$stepDescription}>
          Ingresa el código de registro que te proporcionó la escuela de tu hijo(a).
        </Text>

        <TextInput
          style={$codeInput}
          value={schoolCode}
          onChangeText={setSchoolCode}
          placeholder="Código de escuela"
          placeholderTextColor={colors.palette.neutral400}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="done"
          onSubmitEditing={validateSchoolCode}
        />

        <Pressable style={$primaryButton} onPress={validateSchoolCode}>
          <Text style={$primaryButtonText} weight="bold">Verificar</Text>
        </Pressable>
      </View>
    )
  }

  function renderStudentInfoStep() {
    return (
      <ScrollView style={$scrollView} keyboardShouldPersistTaps="handled">
        <View style={$stepContainer}>
          <Text style={$stepTitle} weight="bold">Datos del Alumno</Text>
          <Text style={$schoolBadge}>{schoolName}</Text>

          <View style={$photoSection}>
            <PhotoView photoURL={alumnoPhoto} />
            <Pressable style={$photoButton} onPress={() => pickPhoto("alumno")}>
              <Entypo name="camera" size={16} color={colors.palette.actionBlue} />
              <Text style={$photoButtonText}>
                {alumnoPhoto ? "Cambiar foto" : "Agregar foto"}
              </Text>
            </Pressable>
          </View>

          <Text style={$inputLabel}>Nombre *</Text>
          <TextInput
            style={$inputField}
            value={nombre}
            onChangeText={setNombre}
            placeholder="Nombre del alumno"
            placeholderTextColor={colors.palette.neutral400}
            autoCapitalize="words"
          />

          <Text style={$inputLabel}>Apellido Paterno *</Text>
          <TextInput
            style={$inputField}
            value={apPaterno}
            onChangeText={setApPaterno}
            placeholder="Apellido paterno"
            placeholderTextColor={colors.palette.neutral400}
            autoCapitalize="words"
          />

          <Text style={$inputLabel}>Apellido Materno</Text>
          <TextInput
            style={$inputField}
            value={apMaterno}
            onChangeText={setApMaterno}
            placeholder="Apellido materno"
            placeholderTextColor={colors.palette.neutral400}
            autoCapitalize="words"
          />

          <Text style={$inputLabel}>Fecha de Nacimiento</Text>
          <View style={$dateRow}>
            {Platform.OS === "ios" ? (
              <DateTimePicker
                value={fechaNacimiento}
                mode="date"
                display="default"
                onChange={onFechaNacimientoChange}
              />
            ) : (
              <Pressable
                onPress={() => setShowNacimientoPicker(true)}
                style={$dateButton}
              >
                <Text>{fechaNacimiento.toLocaleDateString()}</Text>
              </Pressable>
            )}
            {showNacimientoPicker && Platform.OS === "android" && (
              <DateTimePicker
                value={fechaNacimiento}
                mode="date"
                display="default"
                onChange={onFechaNacimientoChange}
              />
            )}
          </View>

          <Text style={$inputLabel}>Género</Text>
          <SegmentedControl
            values={["Femenino", "Masculino"]}
            selectedIndex={generoIndex}
            style={$segmentedControl}
            onChange={(e) => setGeneroIndex(e.nativeEvent.selectedSegmentIndex)}
          />

          <Text style={$inputLabel}>CURP</Text>
          <TextInput
            style={$inputField}
            value={curp}
            onChangeText={setCurp}
            placeholder="CURP (opcional)"
            placeholderTextColor={colors.palette.neutral400}
            autoCapitalize="characters"
          />

          <Pressable style={$primaryButton} onPress={validateStudentInfo}>
            <Text style={$primaryButtonText} weight="bold">Siguiente</Text>
          </Pressable>

          <View style={$bottomSpacer} />
        </View>
      </ScrollView>
    )
  }

  function renderParentInfoStep() {
    return (
      <ScrollView style={$scrollView} keyboardShouldPersistTaps="handled">
        <View style={$stepContainer}>
          <Text style={$stepTitle} weight="bold">Datos del Padre/Madre</Text>

          <View style={$photoSection}>
            <PhotoView photoURL={parentPhoto} />
            <Pressable style={$photoButton} onPress={() => pickPhoto("parent")}>
              <Entypo name="camera" size={16} color={colors.palette.actionBlue} />
              <Text style={$photoButtonText}>
                {parentPhoto ? "Cambiar foto" : "Agregar foto"}
              </Text>
            </Pressable>
          </View>

          <Text style={$inputLabel}>Parentesco *</Text>
          <SegmentedControl
            values={["Mamá", "Papá"]}
            selectedIndex={parentescoIndex}
            style={$segmentedControl}
            onChange={(e) => {
              const idx = e.nativeEvent.selectedSegmentIndex
              setParentescoIndex(idx)
              setParentesco(idx === 0 ? "Mamá" : "Papá")
            }}
          />

          <Text style={$inputLabel}>Nombre *</Text>
          <TextInput
            style={$inputField}
            value={parentNombre}
            onChangeText={setParentNombre}
            placeholder="Tu nombre"
            placeholderTextColor={colors.palette.neutral400}
            autoCapitalize="words"
          />

          <Text style={$inputLabel}>Apellidos *</Text>
          <TextInput
            style={$inputField}
            value={parentApellidos}
            onChangeText={setParentApellidos}
            placeholder="Tus apellidos"
            placeholderTextColor={colors.palette.neutral400}
            autoCapitalize="words"
          />

          <Text style={$inputLabel}>Email * (será tu usuario para iniciar sesión)</Text>
          <TextInput
            style={$inputField}
            value={parentEmail}
            onChangeText={setParentEmail}
            placeholder="tu@email.com"
            placeholderTextColor={colors.palette.neutral400}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
          />

          <Text style={$inputLabel}>Teléfono Celular</Text>
          <TextInput
            style={$inputField}
            value={parentTelefono}
            onChangeText={setParentTelefono}
            placeholder="Número de celular"
            placeholderTextColor={colors.palette.neutral400}
            keyboardType="phone-pad"
          />

          <Text style={$inputLabel}>Dirección</Text>
          <TextInput
            style={$inputField}
            value={parentDireccion}
            onChangeText={setParentDireccion}
            placeholder="Dirección (opcional)"
            placeholderTextColor={colors.palette.neutral400}
          />

          <Pressable style={$primaryButton} onPress={validateParentInfo}>
            <Text style={$primaryButtonText} weight="bold">Siguiente</Text>
          </Pressable>

          <View style={$bottomSpacer} />
        </View>
      </ScrollView>
    )
  }

  function renderConfirmStep() {
    const studentFullName = `${nombre} ${apPaterno} ${apMaterno}`.trim()
    const parentFullName = `${parentNombre} ${parentApellidos}`.trim()

    return (
      <ScrollView style={$scrollView}>
        <View style={$stepContainer}>
          <Text style={$stepTitle} weight="bold">Confirmar Registro</Text>
          <Text style={$stepDescription}>
            Revisa que los datos sean correctos antes de enviar.
          </Text>

          <View style={$confirmCard}>
            <Text style={$confirmSectionTitle}>Escuela</Text>
            <Text style={$confirmValue}>{schoolName}</Text>
          </View>

          <View style={$confirmCard}>
            <Text style={$confirmSectionTitle}>Alumno</Text>
            <Text style={$confirmValue}>{studentFullName}</Text>
            {curp ? <Text style={$confirmDetail}>CURP: {curp}</Text> : null}
            <Text style={$confirmDetail}>
              Nacimiento: {fechaNacimiento.toLocaleDateString()}
            </Text>
            <Text style={$confirmDetail}>
              Género: {generoIndex === 0 ? "Femenino" : "Masculino"}
            </Text>
            {alumnoPhoto ? (
              <Image source={{ uri: alumnoPhoto }} style={$confirmPhoto} />
            ) : null}
          </View>

          <View style={$confirmCard}>
            <Text style={$confirmSectionTitle}>{parentesco}</Text>
            <Text style={$confirmValue}>{parentFullName}</Text>
            <Text style={$confirmDetail}>Email: {parentEmail}</Text>
            {parentTelefono ? (
              <Text style={$confirmDetail}>Tel: {parentTelefono}</Text>
            ) : null}
            {parentDireccion ? (
              <Text style={$confirmDetail}>Dir: {parentDireccion}</Text>
            ) : null}
            {parentPhoto ? (
              <Image source={{ uri: parentPhoto }} style={$confirmPhoto} />
            ) : null}
          </View>

          <View style={$emailNotice}>
            <Entypo name="mail" size={18} color={colors.palette.bluejeansLight} />
            <Text style={$emailNoticeText}>
              Se enviará un email a {parentEmail} con tus datos de acceso.
            </Text>
          </View>

          <Pressable style={$submitButton} onPress={submitRegistration}>
            <Text style={$primaryButtonText} weight="bold">Enviar Registro</Text>
          </Pressable>

          <View style={$bottomSpacer} />
        </View>
      </ScrollView>
    )
  }

  return (
    <Screen style={$root} preset="fixed">
      <KeyboardAvoidingView
        style={$keyboardAvoid}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        {/* Header */}
        <View style={$header}>
          <Pressable onPress={goBack} style={$backButton}>
            <Entypo name="chevron-left" size={24} color={colors.palette.neutral100} />
            <Text style={$backText}>
              {currentStep === STEP_SCHOOL_CODE ? "Cancelar" : "Atrás"}
            </Text>
          </Pressable>
          <Text style={$headerTitle} weight="bold">
            {STEP_TITLES[currentStep]}
          </Text>
          <View style={$headerSpacer} />
        </View>

        {renderStepIndicator()}

        {isLoading ? (
          <View style={$loadingContainer}>
            <ActivityIndicator size="large" color={colors.palette.actionBlue} />
            {saveProgress ? (
              <Text style={$loadingText}>{saveProgress}</Text>
            ) : null}
          </View>
        ) : (
          <>
            {currentStep === STEP_SCHOOL_CODE && renderSchoolCodeStep()}
            {currentStep === STEP_STUDENT_INFO && renderStudentInfoStep()}
            {currentStep === STEP_PARENT_INFO && renderParentInfoStep()}
            {currentStep === STEP_CONFIRM && renderConfirmStep()}
          </>
        )}
      </KeyboardAvoidingView>
    </Screen>
  )
}

// =====================
// Styles
// =====================
const $root: ViewStyle = {
  flex: 1,
  backgroundColor: colors.background,
}

const $keyboardAvoid: ViewStyle = {
  flex: 1,
}

const $header: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  backgroundColor: colors.palette.bluejeansLight,
  paddingHorizontal: 12,
  paddingVertical: 14,
}

const $backButton: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  minWidth: 80,
}

const $backText: TextStyle = {
  color: colors.palette.neutral100,
  fontSize: 16,
}

const $headerTitle: TextStyle = {
  color: colors.palette.neutral100,
  fontSize: 17,
  textAlign: "center",
}

const $headerSpacer: ViewStyle = {
  minWidth: 80,
}

const $stepIndicator: ViewStyle = {
  flexDirection: "row",
  justifyContent: "center",
  alignItems: "center",
  paddingVertical: 12,
  backgroundColor: colors.palette.bluejeansClear,
}

const $stepDot: ViewStyle = {
  width: 10,
  height: 10,
  borderRadius: 5,
  backgroundColor: colors.palette.neutral300,
  marginHorizontal: 6,
}

const $stepDotActive: ViewStyle = {
  backgroundColor: colors.palette.bluejeansLight,
  width: 14,
  height: 14,
  borderRadius: 7,
}

const $stepDotCompleted: ViewStyle = {
  backgroundColor: colors.palette.grassLight,
}

const $stepContainer: ViewStyle = {
  padding: 20,
}

const $scrollView: ViewStyle = {
  flex: 1,
}

const $stepTitle: TextStyle = {
  fontSize: 24,
  color: colors.palette.neutral700,
  marginBottom: 8,
}

const $stepDescription: TextStyle = {
  fontSize: 15,
  color: colors.palette.neutral500,
  marginBottom: 24,
  lineHeight: 22,
}

const $codeInput: ViewStyle = {
  height: 56,
  borderColor: colors.palette.neutral300,
  borderWidth: 2,
  borderRadius: 12,
  paddingHorizontal: 16,
  fontSize: 20,
  textAlign: "center",
  backgroundColor: "white",
  marginBottom: 24,
}

const $inputField: ViewStyle = {
  height: 42,
  borderColor: colors.palette.neutral300,
  borderWidth: 1,
  borderRadius: 10,
  paddingHorizontal: 12,
  backgroundColor: "white",
  marginBottom: 12,
  fontSize: 16,
}

const $inputLabel: TextStyle = {
  fontSize: 14,
  color: colors.palette.neutral600,
  marginBottom: 4,
  marginTop: 4,
}

const $primaryButton: ViewStyle = {
  backgroundColor: colors.palette.bluejeansLight,
  borderRadius: 12,
  paddingVertical: 14,
  alignItems: "center",
  marginTop: 16,
}

const $submitButton: ViewStyle = {
  backgroundColor: colors.palette.grassLight,
  borderRadius: 12,
  paddingVertical: 16,
  alignItems: "center",
  marginTop: 20,
}

const $primaryButtonText: TextStyle = {
  color: "white",
  fontSize: 18,
}

const $photoSection: ViewStyle = {
  alignItems: "center",
  marginBottom: 16,
}

const $photo: ImageStyle = {
  width: 100,
  height: 125,
  borderRadius: 10,
  marginBottom: 8,
}

const $photoPlaceholder: ViewStyle = {
  width: 100,
  height: 125,
  borderRadius: 10,
  backgroundColor: colors.palette.neutral200,
  justifyContent: "center",
  alignItems: "center",
  marginBottom: 8,
}

const $photoButton: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  padding: 6,
}

const $photoButtonText: TextStyle = {
  color: colors.palette.actionBlue,
  marginLeft: 6,
  fontSize: 14,
}

const $dateRow: ViewStyle = {
  marginBottom: 12,
}

const $dateButton: ViewStyle = {
  height: 42,
  borderColor: colors.palette.neutral300,
  borderWidth: 1,
  borderRadius: 10,
  paddingHorizontal: 12,
  justifyContent: "center",
  backgroundColor: "white",
}

const $segmentedControl: ViewStyle = {
  marginBottom: 12,
}

const $confirmCard: ViewStyle = {
  backgroundColor: "white",
  borderRadius: 12,
  padding: 16,
  marginBottom: 12,
}

const $confirmSectionTitle: TextStyle = {
  fontSize: 13,
  color: colors.palette.bluejeansLight,
  fontWeight: "600",
  marginBottom: 4,
  textTransform: "uppercase",
}

const $confirmValue: TextStyle = {
  fontSize: 18,
  color: colors.palette.neutral700,
  fontWeight: "600",
  marginBottom: 4,
}

const $confirmDetail: TextStyle = {
  fontSize: 14,
  color: colors.palette.neutral500,
  marginTop: 2,
}

const $confirmPhoto: ImageStyle = {
  width: 60,
  height: 75,
  borderRadius: 8,
  marginTop: 8,
}

const $emailNotice: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  backgroundColor: colors.palette.bluejeansClear,
  borderRadius: 10,
  padding: 14,
  marginTop: 8,
}

const $emailNoticeText: TextStyle = {
  flex: 1,
  marginLeft: 10,
  fontSize: 14,
  color: colors.palette.bluejeansLight,
  lineHeight: 20,
}

const $loadingContainer: ViewStyle = {
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
}

const $loadingText: TextStyle = {
  marginTop: 16,
  fontSize: 16,
  color: colors.palette.neutral600,
}

const $bottomSpacer: ViewStyle = {
  height: 60,
}

const $schoolBadge: TextStyle = {
  alignSelf: "center",
  backgroundColor: colors.palette.bluejeansClear,
  color: colors.palette.bluejeansLight,
  paddingHorizontal: 14,
  paddingVertical: 6,
  borderRadius: 16,
  fontSize: 14,
  fontWeight: "600",
  marginBottom: 16,
  overflow: "hidden",
}
