import React, { FC, useState, useEffect, useRef } from "react"
import { observer } from "mobx-react-lite"
import {
  ViewStyle,
  View,
  Alert,
  ActivityIndicator,
  TextStyle,
  TouchableOpacity,
  FlatList,
  Keyboard,
  Platform,
  ScrollView,
  Modal,
  Linking,
} from "react-native"
import { AppStackScreenProps } from "app/navigators"
import { Screen, Text, TextField, Button, Icon } from "app/components"
import { colors, spacing } from "app/theme"
import * as ParseAPI from "app/services/parse/ParseAPI"
import * as Haptics from "expo-haptics"
import { useStores } from "app/models"
import DateTimePicker from "@react-native-community/datetimepicker"
import * as FileSystem from "expo-file-system/legacy"
import * as Sharing from "expo-sharing"

interface CrearFacturaScreenProps extends AppStackScreenProps<"CrearFactura"> {}

// Types
interface EstudianteObject {
  get(key: string): any
  id: string
}

interface RFCObject {
  id: string
  get(key: string): any
}

interface ModelPago {
  nombre: string
  rfcReceptor: string
  facturaConcepto: string
  facturaFormaPago: string
  facturaUsoCFDI: string
  facturaEmail: string
  cantidad: number
  estudianteCURP: string
  ivaAplicado: boolean
  relacion04: boolean
  docRelacion04: string
  fechaExpedicion: string
  productoSKU: string
}

interface ModelRFC {
  rfcNuevoAlumno: string
  rfcNuevoRazonSocial: string
  rfcNuevoRFC: string
  rfcNuevocodigoPostal: string
  rfcNuevoEmail: string
  tax_system: string
}

interface ModelIEDU {
  ieduAdded: boolean
  version: string
  nombreAlumno: string
  CURP: string
  nivelEducativo: string
  rfcPago: string
  autRVOE: string
}

// Product/Service codes
const PRODUCT_SKUS = [
  { code: "KBH-0001", description: "Colegiaturas" },
  { code: "KBH-0002", description: "Uniformes" },
  { code: "KBH-0003", description: "Cursos" },
  { code: "KBH-0004", description: "Guarderías" },
  { code: "KBH-0005", description: "Inscripción Anual" },
  { code: "KBH-0006", description: "Reinscripción Anual" },
  { code: "KBH-0007", description: "Seguro por Accidentes" },
  { code: "KBH-0008", description: "Tiempo Extra" },
  { code: "KBH-0009", description: "Recargos Moratorios" },
  { code: "KBH-0010", description: "Credencial" },
  { code: "KBH-0011", description: "Libros y Cuadernos" },
  { code: "KBH-0012", description: "Candado de Estacionamiento" },
  { code: "KBH-0013", description: "Manteles" },
  { code: "KBH-0014", description: "Otros Servicios" },
  { code: "KBH-0015", description: "Libros Exentos" },
]

// Payment methods
const FORMAS_PAGO = [
  { code: "01", description: "Efectivo" },
  { code: "02", description: "Cheque nominativo" },
  { code: "03", description: "Transferencia electrónica" },
  { code: "04", description: "Tarjeta de crédito" },
  { code: "28", description: "Tarjeta de débito" },
  { code: "99", description: "Por definir" },
]

// CFDI usage codes
const USOS_CFDI = [
  { code: "D10", description: "Pagos por servicios educativos" },
  { code: "G01", description: "Adquisición de mercancías" },
  { code: "G03", description: "Gastos en general" },
  { code: "D08", description: "Gastos de transportación escolar" },
  { code: "S01", description: "Sin efectos fiscales" },
]

// Tax regimes
const TAX_SYSTEMS = [
  { code: "601", description: "General de Ley Personas Morales" },
  { code: "603", description: "Personas Morales con Fines no Lucrativos" },
  { code: "605", description: "Sueldos y Salarios" },
  { code: "606", description: "Arrendamiento" },
  { code: "612", description: "Personas Físicas con Actividades Empresariales" },
  { code: "621", description: "Incorporación Fiscal" },
  { code: "626", description: "Régimen Simplificado de Confianza (RESICO)" },
]

// Educational levels
const NIVELES_EDUCATIVOS = [
  "Preescolar",
  "Primaria",
  "Secundaria",
  "Profesional técnico",
  "Bachillerato",
]

export const CrearFacturaScreen: FC<CrearFacturaScreenProps> = observer(function CrearFacturaScreen({
  navigation,
}) {
  // Current step (1-6)
  const [currentStep, setCurrentStep] = useState(1)

  // Loading states
  const [isLoading, setIsLoading] = useState(false)
  const [isSearching, setIsSearching] = useState(false)

  // Step 1: Student data
  const [searchText, setSearchText] = useState("")
  const [estudiantes, setEstudiantes] = useState<EstudianteObject[]>([])
  const [allEstudiantes, setAllEstudiantes] = useState<EstudianteObject[]>([])
  const [selectedEstudiante, setSelectedEstudiante] = useState<EstudianteObject | null>(null)
  const [showStudentResults, setShowStudentResults] = useState(false)

  // Step 2: Amount & Concept
  const [cantidad, setCantidad] = useState("")
  const [facturaConcepto, setFacturaConcepto] = useState("")
  const [productoSKU, setProductoSKU] = useState("KBH-0001")
  const [ivaAplicado, setIvaAplicado] = useState(true)
  const [showSKUPicker, setShowSKUPicker] = useState(false)

  // Step 3: Recipient (RFC)
  const [rfcList, setRfcList] = useState<RFCObject[]>([])
  const [selectedRFC, setSelectedRFC] = useState<RFCObject | null>(null)
  const [rfcReceptor, setRfcReceptor] = useState("")
  const [facturaEmail, setFacturaEmail] = useState("")
  const [selectedRFCName, setSelectedRFCName] = useState("")
  const [isPublicoGeneral, setIsPublicoGeneral] = useState(false)
  const [showRFCModal, setShowRFCModal] = useState(false)
  const [showNewRFCModal, setShowNewRFCModal] = useState(false)

  // New RFC form
  const [newRFC, setNewRFC] = useState<ModelRFC>({
    rfcNuevoAlumno: "",
    rfcNuevoRazonSocial: "",
    rfcNuevoRFC: "",
    rfcNuevocodigoPostal: "",
    rfcNuevoEmail: "",
    tax_system: "612",
  })

  // Step 4: Payment Details
  const [facturaFormaPago, setFacturaFormaPago] = useState("03")
  const [facturaUsoCFDI, setFacturaUsoCFDI] = useState("D10")
  const [fechaExpedicion, setFechaExpedicion] = useState(new Date())
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [relacion04, setRelacion04] = useState(false)
  const [docRelacion04, setDocRelacion04] = useState("")
  const [showFormaPagoPicker, setShowFormaPagoPicker] = useState(false)
  const [showUsoCFDIPicker, setShowUsoCFDIPicker] = useState(false)

  // IEDU complement
  const [modelIEDU, setModelIEDU] = useState<ModelIEDU>({
    ieduAdded: false,
    version: "1.0",
    nombreAlumno: "",
    CURP: "",
    nivelEducativo: "Preescolar",
    rfcPago: "",
    autRVOE: "",
  })
  const [showIEDUModal, setShowIEDUModal] = useState(false)

  // Step 6: Success
  const [invoiceResult, setInvoiceResult] = useState<any>(null)
  const [isDownloading, setIsDownloading] = useState(false)

  // School data
  const [facturapiOrgKey, setFacturapiOrgKey] = useState("")
  const [escuelaObj, setEscuelaObj] = useState<any>(null)

  const {
    authenticationStore: { authUserEscuela },
  } = useStores()

  const searchTimeout = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    setupComponents()
    initializeScreen()
  }, [])

  function setupComponents() {
    navigation.setOptions({
      headerShown: true,
      headerBackTitleVisible: false,
      headerStyle: {
        backgroundColor: colors.palette.lavanderDark
      },
      headerTintColor: colors.palette.neutral100,
    })
  }

  // Debounced student search
  useEffect(() => {
    if (searchText.length >= 2) {
      if (searchTimeout.current) {
        clearTimeout(searchTimeout.current)
      }
      searchTimeout.current = setTimeout(() => {
        filterEstudiantes(searchText)
      }, 300)
    } else {
      setShowStudentResults(false)
      setEstudiantes([])
    }

    return () => {
      if (searchTimeout.current) {
        clearTimeout(searchTimeout.current)
      }
    }
  }, [searchText])

  async function initializeScreen() {
    setIsLoading(true)
    try {
      // Fetch school and subscription data
      const escuela = await ParseAPI.fetchUserEscuela(authUserEscuela)
      setEscuelaObj(escuela)

      // Get Facturapi key from subscription
      const subscriptionData = await ParseAPI.fetchSubscription(authUserEscuela)
      if (subscriptionData && subscriptionData.get("facturapiOrgKey")) {
        setFacturapiOrgKey(subscriptionData.get("facturapiOrgKey"))
      } else {
        Alert.alert(
          "Facturación no disponible",
          "Tu escuela no tiene activada la función de facturación. Contacta al equipo de Skola App para activar esta función.",
          [{ text: "OK", onPress: () => navigation.goBack() }],
        )
        return
      }

      // Preload all students
      await preloadEstudiantes()
    } catch (error) {
      console.error("Error initializing screen:", error)
      Alert.alert("Error", "No fue posible cargar los datos necesarios.")
    } finally {
      setIsLoading(false)
    }
  }


  async function preloadEstudiantes() {
    try {
      const estudiantesRes = await ParseAPI.fetchEstudiantes(authUserEscuela)
      if (estudiantesRes) {
        setAllEstudiantes(estudiantesRes)
      }
    } catch (error) {
      console.error("Error preloading students:", error)
    }
  }

  function filterEstudiantes(searchString: string) {
    const searchLower = searchString.toLowerCase()
    const filtered = allEstudiantes
      .filter((student) => {
        const nombre = (student.get("NOMBRE") || "").toLowerCase()
        const apPaterno = (student.get("ApPATERNO") || "").toLowerCase()
        const apMaterno = (student.get("ApMATERNO") || "").toLowerCase()
        const fullName = `${nombre} ${apPaterno} ${apMaterno}`
        return nombre.startsWith(searchLower) || fullName.includes(searchLower)
      })
      .slice(0, 20)

    setEstudiantes(filtered)
    setShowStudentResults(filtered.length > 0)
  }

  function handleEstudianteSelect(item: EstudianteObject) {
    const nombreCompleto = `${item.get("NOMBRE")} ${item.get("ApPATERNO")} ${item.get("ApMATERNO") || ""}`.trim()
    setSearchText(nombreCompleto)
    setSelectedEstudiante(item)
    setShowStudentResults(false)
    Keyboard.dismiss()

    // Prefill IEDU data
    setModelIEDU((prev) => ({
      ...prev,
      nombreAlumno: nombreCompleto,
      CURP: item.get("CURP") || "",
    }))

    // Load RFC data for this student
    loadStudentRFCs(item.id)
  }

  async function loadStudentRFCs(estudianteId: string) {
    console.log("Loading RFCs for estudianteId:", estudianteId)
    try {
      const rfcs = await ParseAPI.fetchFacturapiRFCs(estudianteId)
      console.log("RFCs found:", rfcs?.length, rfcs)
      if (rfcs && Array.isArray(rfcs)) {
        setRfcList(rfcs)
      } else {
        setRfcList([])
      }
    } catch (error) {
      console.error("Error loading student RFCs:", error)
      setRfcList([])
    }
  }

  function handleRFCSelect(rfc: RFCObject | "publico" | "new") {
    if (rfc === "publico") {
      setIsPublicoGeneral(true)
      setRfcReceptor("XAXX010101000")
      setSelectedRFCName("Público General")
      setSelectedRFC(null)
    } else if (rfc === "new") {
      setShowNewRFCModal(true)
    } else {
      setIsPublicoGeneral(false)
      setRfcReceptor(rfc.get("rfc"))
      setFacturaEmail(rfc.get("emailReceptor") || "")
      setSelectedRFCName(rfc.get("razonSocial"))
      setSelectedRFC(rfc)
    }
    setShowRFCModal(false)
  }

  async function handleCreateNewRFC() {
    if (!newRFC.rfcNuevoRazonSocial || !newRFC.rfcNuevoRFC || !newRFC.rfcNuevocodigoPostal || !newRFC.rfcNuevoEmail) {
      Alert.alert("Campos requeridos", "Por favor completa todos los campos del RFC.")
      return
    }

    setIsLoading(true)
    try {
      const params = {
        estudianteObjectId: selectedEstudiante?.id,
        legalName: newRFC.rfcNuevoRazonSocial,
        email: newRFC.rfcNuevoEmail,
        taxId: newRFC.rfcNuevoRFC.toUpperCase(),
        zipcode: newRFC.rfcNuevocodigoPostal,
        facturapiOrgKey: facturapiOrgKey,
        tax_system: newRFC.tax_system,
      }

      const result = await ParseAPI.runCloudCodeFunction("registrarClienteFacturapi", params)

      // Handle new standardized response format
      if (result?.success || result) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
        Alert.alert("RFC Registrado", "El RFC se ha registrado exitosamente.")

        // Refresh RFC list
        if (selectedEstudiante) {
          await loadStudentRFCs(selectedEstudiante.id)
        }

        // Set the new RFC as selected
        setRfcReceptor(newRFC.rfcNuevoRFC.toUpperCase())
        setFacturaEmail(newRFC.rfcNuevoEmail)
        setSelectedRFCName(newRFC.rfcNuevoRazonSocial)
        setIsPublicoGeneral(false)

        setShowNewRFCModal(false)

        // Reset new RFC form
        setNewRFC({
          rfcNuevoAlumno: "",
          rfcNuevoRazonSocial: "",
          rfcNuevoRFC: "",
          rfcNuevocodigoPostal: "",
          rfcNuevoEmail: "",
          tax_system: "612",
        })
      } else if (result?.error) {
        throw new Error(result.error.message || "Error al registrar RFC")
      }
    } catch (error) {
      console.error("Error creating RFC:", error)
      const errorMsg = error instanceof Error ? error.message : "No fue posible registrar el RFC. Intenta de nuevo."
      Alert.alert("Error", errorMsg)
    } finally {
      setIsLoading(false)
    }
  }

  function validateStep(step: number): boolean {
    switch (step) {
      case 1:
        if (!selectedEstudiante) {
          Alert.alert("Selecciona un estudiante", "Por favor busca y selecciona un estudiante de la lista.")
          return false
        }
        return true

      case 2:
        if (!cantidad || parseFloat(cantidad) <= 0) {
          Alert.alert("Cantidad inválida", "Por favor ingresa una cantidad válida mayor a 0.")
          return false
        }
        if (!facturaConcepto.trim()) {
          Alert.alert("Concepto requerido", "Por favor ingresa el concepto de la factura.")
          return false
        }
        return true

      case 3:
        if (!rfcReceptor) {
          Alert.alert("RFC requerido", "Por favor selecciona un RFC para la factura.")
          return false
        }
        if (!facturaEmail && !isPublicoGeneral) {
          Alert.alert("Email requerido", "Por favor ingresa el email para enviar la factura.")
          return false
        }
        return true

      case 4:
        // Validate date is within 72 hours
        const now = new Date()
        const minDate = new Date(now.getTime() - 72 * 60 * 60 * 1000)
        if (fechaExpedicion < minDate || fechaExpedicion > now) {
          Alert.alert(
            "Fecha inválida",
            "La fecha de expedición debe estar dentro de las últimas 72 horas y no puede ser en el futuro.",
          )
          return false
        }
        return true

      default:
        return true
    }
  }

  function nextStep() {
    if (validateStep(currentStep)) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      setCurrentStep((prev) => Math.min(prev + 1, 6))
    }
  }

  function prevStep() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setCurrentStep((prev) => Math.max(prev - 1, 1))
  }

  async function emitirFactura() {
    if (!validateStep(4)) return

    setIsLoading(true)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)

    try {
      // Get Facturapi customer ID
      let customerId = ""
      if (isPublicoGeneral) {
        // Use school-specific public customer or default
        customerId = await getPublicoGeneralCustomerId()
      } else if (selectedRFC) {
        customerId = selectedRFC.get("facturapiCustomerId")
      }

      if (!customerId) {
        Alert.alert("Error", "No se encontró el cliente de Facturapi.")
        setIsLoading(false)
        return
      }

      const params = {
        customerId: customerId,
        concepto: facturaConcepto,
        multiconcepto: [],
        formaPago: facturaFormaPago,
        usoCFDI: facturaUsoCFDI,
        precio: parseFloat(cantidad),
        ivaAplicado: ivaAplicado,
        facturapiOrgKey: facturapiOrgKey,
        opCustomerId: "",
        opTokenId: "",
        sku: productoSKU,
        fechaExpedicion: fechaExpedicion.toISOString(),
        relacion04DocId: relacion04 ? docRelacion04 : "",
        IEDU: modelIEDU,
      }

      const result = await ParseAPI.runCloudCodeFunction("crearFactura", params)

      // Handle standardized response format
      if (result && result.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
        setInvoiceResult(result.data?.invoice || result.invoice)
        setCurrentStep(6)
      } else {
        const errorMsg = result?.error?.message || result?.error || "No fue posible crear la factura."
        Alert.alert("Error", errorMsg)
      }
    } catch (error: any) {
      console.error("Error creating invoice:", error)
      Alert.alert("Error", error.message || "Ocurrió un error al crear la factura.")
    } finally {
      setIsLoading(false)
    }
  }

  async function getPublicoGeneralCustomerId(): Promise<string> {
    // Get school-specific public customer ID or use default
    try {
      const result = await ParseAPI.runCloudCodeFunction("getPublicoGeneralCustomerId", {
        escuelaId: escuelaObj?.id,
        facturapiOrgKey: facturapiOrgKey,
      })
      // Handle new standardized response format
      if (result?.success) {
        return result.data?.customerId || result.data || ""
      }
      return result || ""
    } catch (error) {
      console.error("Error getting público general customer:", error)
      return ""
    }
  }

  async function downloadInvoiceZIP() {
    if (!invoiceResult?.id) return

    setIsDownloading(true)
    try {
      const fileUri = `${FileSystem.cacheDirectory}factura_${invoiceResult.folio_number}.zip`

      const downloadResult = await FileSystem.downloadAsync(
        `https://www.facturapi.io/v2/invoices/${invoiceResult.id}/zip`,
        fileUri,
        {
          headers: {
            Authorization: `Bearer ${facturapiOrgKey}`,
          },
        }
      )

      if (downloadResult.status !== 200) {
        throw new Error("Error downloading invoice")
      }

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(downloadResult.uri)
      } else {
        Alert.alert("Descargado", "La factura se ha guardado en el dispositivo.")
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    } catch (error) {
      console.error("Error downloading invoice:", error)
      Alert.alert("Error", "No fue posible descargar la factura.")
    } finally {
      setIsDownloading(false)
    }
  }

  function createNewInvoice() {
    // Reset all state
    setCurrentStep(1)
    setSearchText("")
    setSelectedEstudiante(null)
    setCantidad("")
    setFacturaConcepto("")
    setProductoSKU("KBH-0001")
    setIvaAplicado(true)
    setRfcReceptor("")
    setFacturaEmail("")
    setSelectedRFCName("")
    setSelectedRFC(null)
    setIsPublicoGeneral(false)
    setFacturaFormaPago("03")
    setFacturaUsoCFDI("D10")
    setFechaExpedicion(new Date())
    setRelacion04(false)
    setDocRelacion04("")
    setInvoiceResult(null)
    setModelIEDU({
      ieduAdded: false,
      version: "1.0",
      nombreAlumno: "",
      CURP: "",
      nivelEducativo: "Preescolar",
      rfcPago: "",
      autRVOE: "",
    })
  }

  function formatCurrency(value: number): string {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
    }).format(value)
  }

  function formatDate(date: Date): string {
    return date.toLocaleDateString("es-MX", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  // Render step indicator
  function renderStepIndicator() {
    const steps = [1, 2, 3, 4, 5]
    return (
      <View style={$stepIndicator}>
        {steps.map((step, index) => (
          <React.Fragment key={step}>
            <View
              style={[
                $stepCircle,
                currentStep >= step ? $stepCircleActive : $stepCircleInactive,
                currentStep === step && $stepCircleCurrent,
              ]}
            >
              {currentStep > step ? (
                <Icon icon="check" size={16} color={colors.palette.neutral100} />
              ) : (
                <Text style={$stepNumber}>{step}</Text>
              )}
            </View>
            {index < steps.length - 1 && (
              <View style={[
                $stepLine,
                currentStep > step ? $stepLineActive : $stepLineInactive
              ]} />
            )}
          </React.Fragment>
        ))}
      </View>
    )
  }

  // Render Step 1: Student Selection
  function renderStep1() {
    return (
      <View style={$stepContent}>
        <Text preset="subheading" style={$stepTitle}>
          Paso 1: Seleccionar Alumno
        </Text>

        <View style={$inputContainer}>
          <Text preset="formLabel" text="Buscar estudiante" />
          <TextField
            placeholder="Nombre del estudiante..."
            value={searchText}
            onChangeText={setSearchText}
            autoCapitalize="words"
            containerStyle={$textField}
            style={$textFieldInput}
          />
          {isSearching && (
            <ActivityIndicator style={$inlineSpinner} size="small" color={colors.palette.neutral800} />
          )}

          {showStudentResults && (
            <View style={$resultsContainer}>
              <FlatList
                data={estudiantes}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity style={$resultItem} onPress={() => handleEstudianteSelect(item)}>
                    <Text>
                      {item.get("NOMBRE")} {item.get("ApPATERNO")} {item.get("ApMATERNO")}
                    </Text>
                    <Text style={$resultItemGrupo}>
                      {item.get("grupo")?.get("name") || "Sin grupo"}
                    </Text>
                  </TouchableOpacity>
                )}
                style={$resultsList}
              />
            </View>
          )}
        </View>

        {selectedEstudiante && (
          <View style={$selectedCard}>
            <Text style={$selectedLabel}>Alumno seleccionado:</Text>
            <Text preset="bold" style={$selectedValue}>
              {selectedEstudiante.get("NOMBRE")} {selectedEstudiante.get("ApPATERNO")}{" "}
              {selectedEstudiante.get("ApMATERNO")}
            </Text>
            <Text style={$selectedDetail}>
              CURP: {selectedEstudiante.get("CURP") || "No registrado"}
            </Text>
            <Text style={$selectedDetail}>
              Grupo: {selectedEstudiante.get("grupo")?.get("name") || "Sin grupo"}
            </Text>
          </View>
        )}
      </View>
    )
  }

  // Render Step 2: Amount & Concept
  function renderStep2() {
    const selectedSKU = PRODUCT_SKUS.find((p) => p.code === productoSKU)

    return (
      <View style={$stepContent}>
        <Text preset="subheading" style={$stepTitle}>
          Paso 2: Monto y Concepto
        </Text>

        <View style={$inputContainer}>
          <Text preset="formLabel" text="Cantidad (MXN)" />
          <TextField
            placeholder="0.00"
            value={cantidad}
            onChangeText={setCantidad}
            keyboardType="decimal-pad"
            containerStyle={$textField}
            style={$textFieldInput}
          />
        </View>

        <View style={$inputContainer}>
          <Text preset="formLabel" text="Concepto de la factura" />
          <TextField
            placeholder="Ej: Colegiatura Enero 2026"
            value={facturaConcepto}
            onChangeText={setFacturaConcepto}
            containerStyle={$textField}
            style={$textFieldInput}
            multiline
          />
        </View>

        <View style={$inputContainer}>
          <Text preset="formLabel" text="Tipo de producto/servicio" />
          <TouchableOpacity style={$pickerButton} onPress={() => setShowSKUPicker(true)}>
            <Text>{selectedSKU?.description || "Seleccionar..."}</Text>
            <Icon icon="caretRight" size={16} color={colors.palette.neutral600} />
          </TouchableOpacity>
        </View>

        <View style={$checkboxContainer}>
          <TouchableOpacity
            style={[$checkbox, ivaAplicado && $checkboxChecked]}
            onPress={() => setIvaAplicado(!ivaAplicado)}
          >
            {ivaAplicado && <Icon icon="check" size={14} color={colors.palette.neutral100} />}
          </TouchableOpacity>
          <Text style={$checkboxLabel}>IVA incluido en el precio</Text>
        </View>

        {/* SKU Picker Modal */}
        <Modal visible={showSKUPicker} animationType="slide" transparent>
          <View style={$modalOverlay}>
            <View style={$modalContent}>
              <Text preset="subheading" style={$modalTitle}>
                Seleccionar Producto/Servicio
              </Text>
              <FlatList
                data={PRODUCT_SKUS}
                keyExtractor={(item) => item.code}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[$modalItem, productoSKU === item.code && $modalItemSelected]}
                    onPress={() => {
                      setProductoSKU(item.code)
                      setShowSKUPicker(false)
                    }}
                  >
                    <Text style={productoSKU === item.code ? $modalItemTextSelected : undefined}>
                      {item.description}
                    </Text>
                    <Text style={$modalItemCode}>{item.code}</Text>
                  </TouchableOpacity>
                )}
              />
              <Button
                text="Cancelar"
                preset="default"
                style={$modalCancelButton}
                onPress={() => setShowSKUPicker(false)}
              />
            </View>
          </View>
        </Modal>
      </View>
    )
  }

  // Render Step 3: Recipient (RFC)
  function renderStep3() {
    return (
      <View style={$stepContent}>
        <Text preset="subheading" style={$stepTitle}>
          Paso 3: Datos del Receptor
        </Text>

        <View style={$inputContainer}>
          <Text preset="formLabel" text="RFC del receptor" />
          <TouchableOpacity style={$pickerButton} onPress={() => setShowRFCModal(true)}>
            <View>
              <Text>{selectedRFCName || "Seleccionar RFC..."}</Text>
              {rfcReceptor && <Text style={$pickerSubtext}>{rfcReceptor}</Text>}
            </View>
            <Icon icon="caretRight" size={16} color={colors.palette.neutral600} />
          </TouchableOpacity>
        </View>

        {!isPublicoGeneral && (
          <View style={$inputContainer}>
            <Text preset="formLabel" text="Email para enviar la factura" />
            <TextField
              placeholder="correo@ejemplo.com"
              value={facturaEmail}
              onChangeText={setFacturaEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              containerStyle={$textField}
              style={$textFieldInput}
            />
          </View>
        )}

        {/* RFC Selection Modal */}
        <Modal visible={showRFCModal} animationType="slide" transparent>
          <View style={$modalOverlay}>
            <View style={$modalContent}>
              <Text preset="subheading" style={$modalTitle}>
                Seleccionar RFC
              </Text>

              {rfcList.length > 0 && (
                <>
                  <Text style={$modalSectionTitle}>RFCs Registrados</Text>
                  {rfcList.map((rfc) => (
                    <TouchableOpacity
                      key={rfc.id}
                      style={$modalItem}
                      onPress={() => handleRFCSelect(rfc)}
                    >
                      <Text preset="bold">{rfc.get("razonSocial")}</Text>
                      <Text style={$modalItemCode}>{rfc.get("rfc")}</Text>
                    </TouchableOpacity>
                  ))}
                </>
              )}

              <Text style={$modalSectionTitle}>Otras Opciones</Text>

              <TouchableOpacity style={$modalItem} onPress={() => handleRFCSelect("publico")}>
                <Text preset="bold">Público General</Text>
                <Text style={$modalItemCode}>XAXX010101000</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[$modalItem, $modalItemNew]}
                onPress={() => handleRFCSelect("new")}
              >
                <Text style={$modalItemNewText}>+ Registrar Nuevo RFC</Text>
              </TouchableOpacity>

              <Button
                text="Cancelar"
                preset="default"
                style={$modalCancelButton}
                onPress={() => setShowRFCModal(false)}
              />
            </View>
          </View>
        </Modal>

        {/* New RFC Modal */}
        <Modal visible={showNewRFCModal} animationType="slide" transparent>
          <View style={$modalOverlay}>
            <View style={$modalContent}>
              <Text preset="subheading" style={$modalTitle}>
                Registrar Nuevo RFC
              </Text>

              <ScrollView style={$modalScroll}>
                <View style={$inputContainer}>
                  <Text preset="formLabel" text="Razón Social / Nombre" />
                  <TextField
                    placeholder="Nombre completo o razón social"
                    value={newRFC.rfcNuevoRazonSocial}
                    onChangeText={(text) => setNewRFC({ ...newRFC, rfcNuevoRazonSocial: text })}
                    containerStyle={$textField}
                    style={$textFieldInput}
                  />
                </View>

                <View style={$inputContainer}>
                  <Text preset="formLabel" text="RFC" />
                  <TextField
                    placeholder="XXXX000000XXX"
                    value={newRFC.rfcNuevoRFC}
                    onChangeText={(text) => setNewRFC({ ...newRFC, rfcNuevoRFC: text.toUpperCase() })}
                    autoCapitalize="characters"
                    containerStyle={$textField}
                    style={$textFieldInput}
                  />
                </View>

                <View style={$inputContainer}>
                  <Text preset="formLabel" text="Código Postal" />
                  <TextField
                    placeholder="00000"
                    value={newRFC.rfcNuevocodigoPostal}
                    onChangeText={(text) => setNewRFC({ ...newRFC, rfcNuevocodigoPostal: text })}
                    keyboardType="number-pad"
                    maxLength={5}
                    containerStyle={$textField}
                    style={$textFieldInput}
                  />
                </View>

                <View style={$inputContainer}>
                  <Text preset="formLabel" text="Email" />
                  <TextField
                    placeholder="correo@ejemplo.com"
                    value={newRFC.rfcNuevoEmail}
                    onChangeText={(text) => setNewRFC({ ...newRFC, rfcNuevoEmail: text })}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    containerStyle={$textField}
                    style={$textFieldInput}
                  />
                </View>

                <View style={$inputContainer}>
                  <Text preset="formLabel" text="Régimen Fiscal" />
                  {TAX_SYSTEMS.map((tax) => (
                    <TouchableOpacity
                      key={tax.code}
                      style={[$radioItem, newRFC.tax_system === tax.code && $radioItemSelected]}
                      onPress={() => setNewRFC({ ...newRFC, tax_system: tax.code })}
                    >
                      <View style={[$radio, newRFC.tax_system === tax.code && $radioSelected]} />
                      <Text style={$radioLabel}>{tax.description}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              <View style={$modalButtons}>
                <Button
                  text="Cancelar"
                  preset="default"
                  style={$modalButtonHalf}
                  onPress={() => setShowNewRFCModal(false)}
                />
                <Button
                  text="Registrar"
                  preset="filled"
                  style={[$modalButtonHalf, $modalButtonPrimary]}
                  onPress={handleCreateNewRFC}
                />
              </View>
            </View>
          </View>
        </Modal>
      </View>
    )
  }

  // Render Step 4: Payment Details
  function renderStep4() {
    const selectedFormaPago = FORMAS_PAGO.find((f) => f.code === facturaFormaPago)
    const selectedUsoCFDI = USOS_CFDI.find((u) => u.code === facturaUsoCFDI)

    return (
      <View style={$stepContent}>
        <Text preset="subheading" style={$stepTitle}>
          Paso 4: Detalles de la Factura
        </Text>

        <View style={$inputContainer}>
          <Text preset="formLabel" text="Forma de Pago" />
          <TouchableOpacity style={$pickerButton} onPress={() => setShowFormaPagoPicker(true)}>
            <Text>{selectedFormaPago?.description || "Seleccionar..."}</Text>
            <Icon icon="caretRight" size={16} color={colors.palette.neutral600} />
          </TouchableOpacity>
        </View>

        <View style={$inputContainer}>
          <Text preset="formLabel" text="Uso del CFDI" />
          <TouchableOpacity style={$pickerButton} onPress={() => setShowUsoCFDIPicker(true)}>
            <Text>{selectedUsoCFDI?.description || "Seleccionar..."}</Text>
            <Icon icon="caretRight" size={16} color={colors.palette.neutral600} />
          </TouchableOpacity>
        </View>

        <View style={$inputContainer}>
          <Text preset="formLabel" text="Fecha de Expedición" />
          <TouchableOpacity style={$pickerButton} onPress={() => setShowDatePicker(true)}>
            <Text>{formatDate(fechaExpedicion)}</Text>
            <Icon icon="caretRight" size={16} color={colors.palette.neutral600} />
          </TouchableOpacity>
        </View>

        {showDatePicker && (
          <DateTimePicker
            value={fechaExpedicion}
            mode="date"
            display={Platform.OS === "ios" ? "spinner" : "default"}
            onChange={(event, date) => {
              setShowDatePicker(Platform.OS === "ios")
              if (date) setFechaExpedicion(date)
            }}
            maximumDate={new Date()}
            minimumDate={new Date(Date.now() - 72 * 60 * 60 * 1000)}
          />
        )}

        <View style={$checkboxContainer}>
          <TouchableOpacity
            style={[$checkbox, relacion04 && $checkboxChecked]}
            onPress={() => setRelacion04(!relacion04)}
          >
            {relacion04 && <Icon icon="check" size={14} color={colors.palette.neutral100} />}
          </TouchableOpacity>
          <Text style={$checkboxLabel}>Factura relacionada (Relación 04)</Text>
        </View>

        {relacion04 && (
          <View style={$inputContainer}>
            <Text preset="formLabel" text="UUID del documento relacionado" />
            <TextField
              placeholder="UUID de la factura original"
              value={docRelacion04}
              onChangeText={setDocRelacion04}
              containerStyle={$textField}
              style={$textFieldInput}
            />
          </View>
        )}

        <TouchableOpacity style={$ieduButton} onPress={() => setShowIEDUModal(true)}>
          <Text style={$ieduButtonText}>
            {modelIEDU.ieduAdded ? "Complemento IEDU Configurado ✓" : "Configurar Complemento IEDU (Opcional)"}
          </Text>
        </TouchableOpacity>

        {/* Forma de Pago Picker */}
        <Modal visible={showFormaPagoPicker} animationType="slide" transparent>
          <View style={$modalOverlay}>
            <View style={$modalContent}>
              <Text preset="subheading" style={$modalTitle}>
                Forma de Pago
              </Text>
              <FlatList
                data={FORMAS_PAGO}
                keyExtractor={(item) => item.code}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[$modalItem, facturaFormaPago === item.code && $modalItemSelected]}
                    onPress={() => {
                      setFacturaFormaPago(item.code)
                      setShowFormaPagoPicker(false)
                    }}
                  >
                    <Text style={facturaFormaPago === item.code ? $modalItemTextSelected : undefined}>
                      {item.description}
                    </Text>
                    <Text style={$modalItemCode}>{item.code}</Text>
                  </TouchableOpacity>
                )}
              />
              <Button
                text="Cancelar"
                preset="default"
                style={$modalCancelButton}
                onPress={() => setShowFormaPagoPicker(false)}
              />
            </View>
          </View>
        </Modal>

        {/* Uso CFDI Picker */}
        <Modal visible={showUsoCFDIPicker} animationType="slide" transparent>
          <View style={$modalOverlay}>
            <View style={$modalContent}>
              <Text preset="subheading" style={$modalTitle}>
                Uso del CFDI
              </Text>
              <FlatList
                data={USOS_CFDI}
                keyExtractor={(item) => item.code}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[$modalItem, facturaUsoCFDI === item.code && $modalItemSelected]}
                    onPress={() => {
                      setFacturaUsoCFDI(item.code)
                      setShowUsoCFDIPicker(false)
                    }}
                  >
                    <Text style={facturaUsoCFDI === item.code ? $modalItemTextSelected : undefined}>
                      {item.description}
                    </Text>
                    <Text style={$modalItemCode}>{item.code}</Text>
                  </TouchableOpacity>
                )}
              />
              <Button
                text="Cancelar"
                preset="default"
                style={$modalCancelButton}
                onPress={() => setShowUsoCFDIPicker(false)}
              />
            </View>
          </View>
        </Modal>

        {/* IEDU Modal */}
        <Modal visible={showIEDUModal} animationType="slide" transparent>
          <View style={$modalOverlay}>
            <View style={$modalContent}>
              <Text preset="subheading" style={$modalTitle}>
                Complemento IEDU
              </Text>

              <ScrollView style={$modalScroll}>
                <View style={$checkboxContainer}>
                  <TouchableOpacity
                    style={[$checkbox, modelIEDU.ieduAdded && $checkboxChecked]}
                    onPress={() => setModelIEDU({ ...modelIEDU, ieduAdded: !modelIEDU.ieduAdded })}
                  >
                    {modelIEDU.ieduAdded && <Icon icon="check" size={14} color={colors.palette.neutral100} />}
                  </TouchableOpacity>
                  <Text style={$checkboxLabel}>Incluir complemento IEDU</Text>
                </View>

                {modelIEDU.ieduAdded && (
                  <>
                    <View style={$inputContainer}>
                      <Text preset="formLabel" text="Nombre del Alumno" />
                      <TextField
                        value={modelIEDU.nombreAlumno}
                        onChangeText={(text) => setModelIEDU({ ...modelIEDU, nombreAlumno: text })}
                        containerStyle={$textField}
                        style={$textFieldInput}
                      />
                    </View>

                    <View style={$inputContainer}>
                      <Text preset="formLabel" text="CURP del Alumno" />
                      <TextField
                        value={modelIEDU.CURP}
                        onChangeText={(text) => setModelIEDU({ ...modelIEDU, CURP: text.toUpperCase() })}
                        autoCapitalize="characters"
                        containerStyle={$textField}
                        style={$textFieldInput}
                      />
                    </View>

                    <View style={$inputContainer}>
                      <Text preset="formLabel" text="Nivel Educativo" />
                      {NIVELES_EDUCATIVOS.map((nivel) => (
                        <TouchableOpacity
                          key={nivel}
                          style={[$radioItem, modelIEDU.nivelEducativo === nivel && $radioItemSelected]}
                          onPress={() => setModelIEDU({ ...modelIEDU, nivelEducativo: nivel })}
                        >
                          <View style={[$radio, modelIEDU.nivelEducativo === nivel && $radioSelected]} />
                          <Text style={$radioLabel}>{nivel}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    <View style={$inputContainer}>
                      <Text preset="formLabel" text="RFC del que paga" />
                      <TextField
                        value={modelIEDU.rfcPago}
                        onChangeText={(text) => setModelIEDU({ ...modelIEDU, rfcPago: text.toUpperCase() })}
                        autoCapitalize="characters"
                        containerStyle={$textField}
                        style={$textFieldInput}
                      />
                    </View>

                    <View style={$inputContainer}>
                      <Text preset="formLabel" text="Autorización RVOE" />
                      <TextField
                        value={modelIEDU.autRVOE}
                        onChangeText={(text) => setModelIEDU({ ...modelIEDU, autRVOE: text })}
                        containerStyle={$textField}
                        style={$textFieldInput}
                      />
                    </View>
                  </>
                )}
              </ScrollView>

              <Button
                text="Guardar"
                preset="filled"
                style={$modalSaveButton}
                onPress={() => setShowIEDUModal(false)}
              />
            </View>
          </View>
        </Modal>
      </View>
    )
  }

  // Render Step 5: Confirmation
  function renderStep5() {
    const selectedSKU = PRODUCT_SKUS.find((p) => p.code === productoSKU)
    const selectedFormaPago = FORMAS_PAGO.find((f) => f.code === facturaFormaPago)
    const selectedUsoCFDI = USOS_CFDI.find((u) => u.code === facturaUsoCFDI)

    return (
      <View style={$stepContent}>
        <Text preset="subheading" style={$stepTitle}>
          Paso 5: Confirmar Factura
        </Text>

        <View style={$confirmationCard}>
          <View style={$confirmationSection}>
            <Text style={$confirmationLabel}>Alumno</Text>
            <Text preset="bold" style={$confirmationValue}>
              {selectedEstudiante?.get("NOMBRE")} {selectedEstudiante?.get("ApPATERNO")}{" "}
              {selectedEstudiante?.get("ApMATERNO")}
            </Text>
          </View>

          <View style={$confirmationDivider} />

          <View style={$confirmationSection}>
            <Text style={$confirmationLabel}>Concepto</Text>
            <Text style={$confirmationValue}>{facturaConcepto}</Text>
          </View>

          <View style={$confirmationSection}>
            <Text style={$confirmationLabel}>Producto/Servicio</Text>
            <Text style={$confirmationValue}>{selectedSKU?.description}</Text>
          </View>

          <View style={$confirmationSection}>
            <Text style={$confirmationLabel}>Monto</Text>
            <Text preset="bold" style={$confirmationAmount}>
              {formatCurrency(parseFloat(cantidad) || 0)}
            </Text>
            <Text style={$confirmationDetail}>
              {ivaAplicado ? "IVA incluido" : "Sin IVA"}
            </Text>
          </View>

          <View style={$confirmationDivider} />

          <View style={$confirmationSection}>
            <Text style={$confirmationLabel}>Receptor</Text>
            <Text preset="bold" style={$confirmationValue}>{selectedRFCName}</Text>
            <Text style={$confirmationDetail}>{rfcReceptor}</Text>
            {facturaEmail && <Text style={$confirmationDetail}>{facturaEmail}</Text>}
          </View>

          <View style={$confirmationDivider} />

          <View style={$confirmationSection}>
            <Text style={$confirmationLabel}>Forma de Pago</Text>
            <Text style={$confirmationValue}>{selectedFormaPago?.description}</Text>
          </View>

          <View style={$confirmationSection}>
            <Text style={$confirmationLabel}>Uso del CFDI</Text>
            <Text style={$confirmationValue}>{selectedUsoCFDI?.description}</Text>
          </View>

          <View style={$confirmationSection}>
            <Text style={$confirmationLabel}>Fecha de Expedición</Text>
            <Text style={$confirmationValue}>{formatDate(fechaExpedicion)}</Text>
          </View>

          {modelIEDU.ieduAdded && (
            <>
              <View style={$confirmationDivider} />
              <View style={$confirmationSection}>
                <Text style={$confirmationLabel}>Complemento IEDU</Text>
                <Text style={$confirmationDetail}>Nivel: {modelIEDU.nivelEducativo}</Text>
                <Text style={$confirmationDetail}>CURP: {modelIEDU.CURP}</Text>
              </View>
            </>
          )}
        </View>

        <Button
          text="Emitir Factura"
          preset="filled"
          style={$emitButton}
          onPress={emitirFactura}
          disabled={isLoading}
        />
      </View>
    )
  }

  // Render Step 6: Success
  function renderStep6() {
    return (
      <View style={$stepContent}>
        <View style={$successContainer}>
          <View style={$successIcon}>
            <Icon icon="check" size={48} color={colors.palette.neutral100} />
          </View>

          <Text preset="heading" style={$successTitle}>
            ¡Factura Emitida!
          </Text>

          {invoiceResult && (
            <View style={$successCard}>
              <Text style={$successLabel}>Folio</Text>
              <Text preset="bold" style={$successFolio}>
                {invoiceResult.folio_number}
              </Text>

              {invoiceResult.uuid && (
                <>
                  <Text style={$successLabel}>UUID Fiscal</Text>
                  <Text style={$successUUID}>{invoiceResult.uuid}</Text>
                </>
              )}
            </View>
          )}

          <Button
            text={isDownloading ? "Descargando..." : "Descargar ZIP (XML + PDF)"}
            preset="filled"
            style={$downloadButton}
            onPress={downloadInvoiceZIP}
            disabled={isDownloading}
          />

          <Button
            text="Crear Nueva Factura"
            preset="default"
            style={$newInvoiceButton}
            onPress={createNewInvoice}
          />

          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={$backLink}>Volver a Facturación</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  // Main render
  if (isLoading && currentStep === 1 && !allEstudiantes.length) {
    return (
      <Screen style={$root} preset="fixed">
        <View style={$loadingContainer}>
          <ActivityIndicator size="large" color={colors.palette.bluejeansLight} />
          <Text style={$loadingText}>Cargando datos...</Text>
        </View>
      </Screen>
    )
  }

  return (
    <Screen style={$root} preset="scroll">
      {currentStep < 6 && renderStepIndicator()}

      <ScrollView style={$scrollContent} showsVerticalScrollIndicator={false}>
        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}
        {currentStep === 3 && renderStep3()}
        {currentStep === 4 && renderStep4()}
        {currentStep === 5 && renderStep5()}
        {currentStep === 6 && renderStep6()}

        {isLoading && currentStep !== 6 && (
          <View style={$loadingOverlay}>
            <ActivityIndicator size="large" color={colors.palette.bluejeansLight} />
          </View>
        )}
      </ScrollView>

      {currentStep < 5 && (
        <View style={$navigationButtons}>
          {currentStep > 1 && (
            <Button text="Anterior" preset="default" style={$navButton} onPress={prevStep} />
          )}
          <Button
            text="Siguiente"
            preset="filled"
            style={[$navButton, $navButtonPrimary]}
            onPress={nextStep}
          />
        </View>
      )}

      {currentStep === 5 && (
        <View style={$navigationButtons}>
          <Button text="Anterior" preset="default" style={$navButton} onPress={prevStep} />
        </View>
      )}
    </Screen>
  )
})

// Styles
const $root: ViewStyle = {
  flex: 1,
  backgroundColor: colors.background,
}

const $stepIndicator: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  paddingVertical: spacing.medium,
  paddingHorizontal: spacing.large,
}

const $stepCircle: ViewStyle = {
  width: 32,
  height: 32,
  borderRadius: 16,
  alignItems: "center",
  justifyContent: "center",
}

const $stepCircleActive: ViewStyle = {
  backgroundColor: colors.palette.grassLight,
}

const $stepCircleInactive: ViewStyle = {
  backgroundColor: colors.palette.neutral400,
}

const $stepCircleCurrent: ViewStyle = {
  borderWidth: 3,
  borderColor: colors.palette.grassDark,
}

const $stepNumber: TextStyle = {
  color: colors.palette.neutral100,
  fontWeight: "bold",
  fontSize: 14,
}

const $stepLine: ViewStyle = {
  height: 3,
  flex: 1,
  marginHorizontal: 4,
}

const $stepLineActive: ViewStyle = {
  backgroundColor: colors.palette.grassLight,
}

const $stepLineInactive: ViewStyle = {
  backgroundColor: colors.palette.neutral400,
}

const $scrollContent: ViewStyle = {
  flex: 1,
}

const $stepContent: ViewStyle = {
  padding: spacing.medium,
}

const $stepTitle: TextStyle = {
  color: colors.palette.neutral700,
  marginBottom: spacing.medium,
  textAlign: "center",
}

const $inputContainer: ViewStyle = {
  marginBottom: spacing.medium,
}

const $textField: ViewStyle = {
  marginBottom: spacing.extraSmall,
}

const $textFieldInput: TextStyle = {
  paddingLeft: 8,
}

const $inlineSpinner: ViewStyle = {
  position: "absolute",
  right: 12,
  top: 35,
}

const $resultsContainer: ViewStyle = {
  maxHeight: 200,
  marginTop: -spacing.extraSmall,
  marginBottom: spacing.medium,
  borderWidth: 1,
  borderColor: colors.palette.neutral400,
  borderRadius: 4,
  backgroundColor: colors.palette.neutral100,
}

const $resultsList: ViewStyle = {
  maxHeight: 200,
}

const $resultItem: ViewStyle = {
  padding: spacing.small,
  borderBottomWidth: 1,
  borderBottomColor: colors.palette.neutral300,
}

const $resultItemGrupo: TextStyle = {
  fontSize: 12,
  color: colors.palette.neutral500,
  marginTop: 2,
}

const $selectedCard: ViewStyle = {
  backgroundColor: colors.palette.grassClear,
  padding: spacing.medium,
  borderRadius: 8,
  marginTop: spacing.small,
}

const $selectedLabel: TextStyle = {
  fontSize: 12,
  color: colors.palette.neutral600,
}

const $selectedValue: TextStyle = {
  fontSize: 16,
  color: colors.palette.neutral800,
  marginBottom: 4,
}

const $selectedDetail: TextStyle = {
  fontSize: 13,
  color: colors.palette.neutral600,
}

const $pickerButton: ViewStyle = {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  backgroundColor: colors.palette.neutral100,
  padding: spacing.small,
  borderRadius: 4,
  borderWidth: 1,
  borderColor: colors.palette.neutral400,
}

const $pickerSubtext: TextStyle = {
  fontSize: 12,
  color: colors.palette.neutral500,
  marginTop: 2,
}

const $checkboxContainer: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  marginVertical: spacing.small,
}

const $checkbox: ViewStyle = {
  width: 24,
  height: 24,
  borderRadius: 4,
  borderWidth: 2,
  borderColor: colors.palette.neutral400,
  alignItems: "center",
  justifyContent: "center",
  marginRight: spacing.small,
}

const $checkboxChecked: ViewStyle = {
  backgroundColor: colors.palette.bluejeansLight,
  borderColor: colors.palette.bluejeansDark,
}

const $checkboxLabel: TextStyle = {
  color: colors.palette.neutral700,
}

const $modalOverlay: ViewStyle = {
  flex: 1,
  backgroundColor: "rgba(0,0,0,0.5)",
  justifyContent: "flex-end",
}

const $modalContent: ViewStyle = {
  backgroundColor: colors.palette.neutral100,
  borderTopLeftRadius: 20,
  borderTopRightRadius: 20,
  padding: spacing.medium,
  maxHeight: "80%",
}

const $modalTitle: TextStyle = {
  textAlign: "center",
  marginBottom: spacing.medium,
  color: colors.palette.neutral700,
}

const $modalSectionTitle: TextStyle = {
  fontSize: 12,
  fontWeight: "bold",
  color: colors.palette.neutral500,
  marginTop: spacing.medium,
  marginBottom: spacing.small,
}

const $modalItem: ViewStyle = {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  padding: spacing.small,
  borderBottomWidth: 1,
  borderBottomColor: colors.palette.neutral300,
}

const $modalItemSelected: ViewStyle = {
  backgroundColor: colors.palette.bluejeansClear,
}

const $modalItemTextSelected: TextStyle = {
  color: colors.palette.bluejeansDark,
  fontWeight: "bold",
}

const $modalItemCode: TextStyle = {
  fontSize: 12,
  color: colors.palette.neutral500,
}

const $modalItemNew: ViewStyle = {
  justifyContent: "center",
  backgroundColor: colors.palette.neutral200,
}

const $modalItemNewText: TextStyle = {
  color: colors.palette.bluejeansLight,
  fontWeight: "bold",
}

const $modalCancelButton: ViewStyle = {
  marginTop: spacing.medium,
}

const $modalScroll: ViewStyle = {
  maxHeight: 400,
}

const $modalButtons: ViewStyle = {
  flexDirection: "row",
  justifyContent: "space-between",
  marginTop: spacing.medium,
}

const $modalButtonHalf: ViewStyle = {
  flex: 1,
  marginHorizontal: spacing.extraSmall,
}

const $modalButtonPrimary: ViewStyle = {
  backgroundColor: colors.palette.bluejeansLight,
}

const $modalSaveButton: ViewStyle = {
  marginTop: spacing.medium,
  backgroundColor: colors.palette.bluejeansLight,
}

const $radioItem: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  paddingVertical: spacing.extraSmall,
}

const $radioItemSelected: ViewStyle = {
  backgroundColor: colors.palette.bluejeansClear,
  borderRadius: 4,
  paddingHorizontal: spacing.extraSmall,
}

const $radio: ViewStyle = {
  width: 18,
  height: 18,
  borderRadius: 9,
  borderWidth: 2,
  borderColor: colors.palette.neutral400,
  marginRight: spacing.small,
}

const $radioSelected: ViewStyle = {
  borderColor: colors.palette.bluejeansLight,
  backgroundColor: colors.palette.bluejeansLight,
}

const $radioLabel: TextStyle = {
  fontSize: 14,
  color: colors.palette.neutral700,
}

const $ieduButton: ViewStyle = {
  backgroundColor: colors.palette.lavanderClear,
  padding: spacing.small,
  borderRadius: 8,
  alignItems: "center",
  marginTop: spacing.medium,
}

const $ieduButtonText: TextStyle = {
  color: colors.palette.lavanderDarker,
  fontWeight: "600",
}

const $confirmationCard: ViewStyle = {
  backgroundColor: colors.palette.neutral100,
  padding: spacing.medium,
  borderRadius: 12,
  shadowColor: colors.palette.neutral800,
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.1,
  shadowRadius: 4,
  elevation: 3,
}

const $confirmationSection: ViewStyle = {
  marginVertical: spacing.extraSmall,
}

const $confirmationLabel: TextStyle = {
  fontSize: 12,
  color: colors.palette.neutral500,
  marginBottom: 2,
}

const $confirmationValue: TextStyle = {
  fontSize: 15,
  color: colors.palette.neutral800,
}

const $confirmationAmount: TextStyle = {
  fontSize: 24,
  color: colors.palette.grassDark,
}

const $confirmationDetail: TextStyle = {
  fontSize: 13,
  color: colors.palette.neutral600,
}

const $confirmationDivider: ViewStyle = {
  height: 1,
  backgroundColor: colors.palette.neutral300,
  marginVertical: spacing.small,
}

const $emitButton: ViewStyle = {
  marginTop: spacing.large,
  backgroundColor: colors.palette.grassLight,
  borderColor: colors.palette.grassDark,
  borderBottomWidth: Platform.OS === "ios" ? 4 : 0,
  borderRadius: 100,
}

const $navigationButtons: ViewStyle = {
  flexDirection: "row",
  justifyContent: "space-between",
  padding: spacing.medium,
  backgroundColor: colors.palette.neutral100,
  borderTopWidth: 1,
  borderTopColor: colors.palette.neutral300,
}

const $navButton: ViewStyle = {
  flex: 1,
  marginHorizontal: spacing.extraSmall,
}

const $navButtonPrimary: ViewStyle = {
  backgroundColor: colors.palette.bluejeansLight,
}

const $loadingContainer: ViewStyle = {
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
}

const $loadingText: TextStyle = {
  marginTop: spacing.medium,
  color: colors.palette.neutral600,
}

const $loadingOverlay: ViewStyle = {
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: "rgba(255,255,255,0.8)",
  justifyContent: "center",
  alignItems: "center",
}

const $successContainer: ViewStyle = {
  alignItems: "center",
  paddingVertical: spacing.extraLarge,
}

const $successIcon: ViewStyle = {
  width: 80,
  height: 80,
  borderRadius: 40,
  backgroundColor: colors.palette.grassLight,
  alignItems: "center",
  justifyContent: "center",
  marginBottom: spacing.large,
}

const $successTitle: TextStyle = {
  color: colors.palette.grassDark,
  marginBottom: spacing.large,
}

const $successCard: ViewStyle = {
  backgroundColor: colors.palette.neutral100,
  padding: spacing.large,
  borderRadius: 12,
  alignItems: "center",
  width: "100%",
  marginBottom: spacing.large,
}

const $successLabel: TextStyle = {
  fontSize: 12,
  color: colors.palette.neutral500,
  marginBottom: 4,
}

const $successFolio: TextStyle = {
  fontSize: 18,
  color: colors.palette.neutral800,
  marginBottom: spacing.medium,
}

const $successUUID: TextStyle = {
  fontSize: 11,
  color: colors.palette.neutral600,
  textAlign: "center",
}

const $downloadButton: ViewStyle = {
  width: "100%",
  backgroundColor: colors.palette.bluejeansLight,
  marginBottom: spacing.small,
}

const $newInvoiceButton: ViewStyle = {
  width: "100%",
  marginBottom: spacing.medium,
}

const $backLink: TextStyle = {
  color: colors.palette.bluejeansLight,
  textDecorationLine: "underline",
}
