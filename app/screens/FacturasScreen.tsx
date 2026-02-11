import React, { FC, useState, useEffect, useCallback, useLayoutEffect, useRef } from "react"
import { useFocusEffect } from "@react-navigation/native"
import { observer } from "mobx-react-lite"
import {
  ViewStyle,
  View,
  Alert,
  ActivityIndicator,
  TextStyle,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  Modal,
} from "react-native"
import { AppStackScreenProps } from "app/navigators"
import { Screen, Text, TextField, Button } from "app/components"
import { colors, spacing } from "app/theme"
import { Entypo } from '@expo/vector-icons'
import * as ParseAPI from "app/services/parse/ParseAPI"
import * as Haptics from "expo-haptics"
import { useStores } from "app/models"
import * as FileSystem from "expo-file-system/legacy"
import * as Sharing from "expo-sharing"

interface FacturasScreenProps extends AppStackScreenProps<"Facturas"> {}

// Invoice item interface
interface FacturaItem {
  id: string
  folio_number: string
  status: "valid" | "canceled"
  created_at: string // Formatted date string
  originalDate: string // Original ISO date string for filtering
  total: number
  customer: {
    id: string
    legal_name: string
    tax_id: string
  }
  items: Array<{
    description: string
    quantity: number
    unit_price: number
  }>
}

export const FacturasScreen: FC<FacturasScreenProps> = observer(function FacturasScreen({
  navigation,
}) {
  // State
  const [facturas, setFacturas] = useState<FacturaItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingMessage, setProcessingMessage] = useState("")
  const [facturapiOrgKey, setFacturapiOrgKey] = useState("")
  const [searchText, setSearchText] = useState("")

  // Email modal state
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [showChangeEmailModal, setShowChangeEmailModal] = useState(false)
  const [selectedFactura, setSelectedFactura] = useState<FacturaItem | null>(null)
  const [customerEmail, setCustomerEmail] = useState("")
  const [newEmail, setNewEmail] = useState("")

  // Cancel modal state
  const [showCancelModal, setShowCancelModal] = useState(false)

  const {
    authenticationStore: { authUserEscuela },
  } = useStores()

  const isFirstLoad = useRef(true)

  useEffect(() => {
    initializeScreen()
  }, [])

  // Reload facturas when screen comes into focus (after creating a new one)
  useFocusEffect(
    useCallback(() => {
      if (isFirstLoad.current) {
        isFirstLoad.current = false
        return
      }
      // Reload if we have the API key
      if (facturapiOrgKey) {
        fetchFacturas(facturapiOrgKey)
      }
    }, [facturapiOrgKey])
  )

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: true,
      headerBackTitleVisible: false,
      headerStyle: {
        backgroundColor: colors.palette.lavanderDark
      },
      headerTintColor: colors.palette.neutral100,
      headerRight: () => (
        <Entypo
          name="plus"
          size={26}
          color={colors.palette.neutral100}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
            navigation.navigate("CrearFactura")
          }}
        />
      ),
    })
  }, [navigation])

  // Filter facturas based on search text
  const filteredFacturas = facturas.filter((factura) => {
    if (!searchText.trim()) return true
    const search = searchText.toLowerCase()
    const customerName = (factura.customer?.legal_name || "").toLowerCase()
    const taxId = (factura.customer?.tax_id || "").toLowerCase()
    return customerName.includes(search) || taxId.includes(search)
  })

  async function initializeScreen() {
    setIsLoading(true)
    try {
      // Get Facturapi key from subscription
      const subscriptionData = await ParseAPI.fetchSubscription(authUserEscuela)
      if (subscriptionData && subscriptionData.get("facturapiOrgKey")) {
        const key = subscriptionData.get("facturapiOrgKey")
        setFacturapiOrgKey(key)
        await fetchFacturas(key)
      } else {
        Alert.alert(
          "Facturación no disponible",
          "Tu escuela no tiene activada la función de facturación. Contacta al equipo de Skola App para activar esta función.",
          [{ text: "OK", onPress: () => navigation.goBack() }],
        )
      }
    } catch (error) {
      console.error("Error initializing screen:", error)
      Alert.alert("Error", "No fue posible cargar los datos necesarios.")
    } finally {
      setIsLoading(false)
    }
  }

  async function fetchFacturas(apiKey: string) {
    try {
      const result = await ParseAPI.runCloudCodeFunction("fetchListaFacturas", {
        facturapiOrgKey: apiKey,
      })

      // Handle new standardized response format
      if (result && result.success && Array.isArray(result.data)) {
        // Process dates - store both formatted and original
        const processedFacturas = result.data.map((factura: FacturaItem) => ({
          ...factura,
          originalDate: factura.created_at, // Store original ISO date
          created_at: formatDate(factura.created_at),
        }))
        setFacturas(processedFacturas)
      } else if (result && !result.success) {
        const errorMsg = result.error?.message || "Error al obtener facturas"
        throw new Error(errorMsg)
      } else {
        setFacturas([])
      }
    } catch (error: any) {
      console.error("Error fetching facturas:", error)
      Alert.alert("Error", `Hubo un problema al buscar las facturas: ${error.message || error}`)
    }
  }

  const onRefresh = useCallback(async () => {
    if (!facturapiOrgKey) return
    setIsRefreshing(true)
    await fetchFacturas(facturapiOrgKey)
    setIsRefreshing(false)
  }, [facturapiOrgKey])

  function formatDate(dateString: string): string {
    const date = new Date(dateString)
    const months = [
      "Ene", "Feb", "Mar", "Abr", "May", "Jun",
      "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
    ]
    const day = date.getDate().toString().padStart(2, "0")
    const month = months[date.getMonth()]
    const year = date.getFullYear()
    return `${day} ${month} ${year}`
  }

  function formatCurrency(value: number): string {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
    }).format(value)
  }

  function getCurrentMonthCount(): number {
    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()

    return facturas.filter((factura) => {
      if (!factura.originalDate) return false
      const facturaDate = new Date(factura.originalDate)
      return (
        facturaDate.getMonth() === currentMonth &&
        facturaDate.getFullYear() === currentYear
      )
    }).length
  }

  // Download invoice ZIP
  async function handleDownload(factura: FacturaItem) {
    if (!factura.id) {
      Alert.alert("Error", "No se puede descargar la factura. ID no disponible.")
      return
    }
    if (!facturapiOrgKey) {
      Alert.alert("Error", "No se puede descargar la factura. Clave de API no disponible.")
      return
    }

    setProcessingMessage("Preparando descarga...")
    setIsProcessing(true)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)

    try {
      const fileName = `factura-${factura.folio_number || factura.id}.zip`
      const fileUri = `${FileSystem.cacheDirectory}${fileName}`

      const downloadResult = await FileSystem.downloadAsync(
        `https://www.facturapi.io/v2/invoices/${factura.id}/zip`,
        fileUri,
        {
          headers: {
            Authorization: `Bearer ${facturapiOrgKey}`,
          },
        }
      )

      if (downloadResult.status !== 200) {
        throw new Error(`HTTP error: ${downloadResult.status}`)
      }

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(downloadResult.uri)
      } else {
        Alert.alert("Descargado", "La factura se ha guardado en el dispositivo.")
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    } catch (error: any) {
      console.error("Error downloading invoice:", error)
      Alert.alert("Error", `Hubo un problema al descargar la factura: ${error.message || error}`)
    } finally {
      setIsProcessing(false)
    }
  }

  // Send email flow
  async function handleSendEmail(factura: FacturaItem) {
    setSelectedFactura(factura)
    setProcessingMessage("Obteniendo información del cliente...")
    setIsProcessing(true)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)

    try {
      const result = await ParseAPI.runCloudCodeFunction("getFacturapiCustomer", {
        facturapiOrgKey: facturapiOrgKey,
        customerId: factura.customer.id,
      })

      // Handle new standardized response format
      const email = result?.success ? result.data?.email : result

      if (email && email !== "no email available") {
        setCustomerEmail(email)
        setShowEmailModal(true)
      } else {
        Alert.alert(
          "Sin email",
          "Este cliente no tiene un email registrado. Por favor agregue uno primero.",
        )
      }
    } catch (error: any) {
      console.error("Error getting customer:", error)
      Alert.alert("Error", `Hubo un problema al obtener la información del cliente: ${error.message || error}`)
    } finally {
      setIsProcessing(false)
    }
  }

  async function sendEmailNow() {
    if (!selectedFactura) return

    setShowEmailModal(false)
    setProcessingMessage("Enviando factura por email...")
    setIsProcessing(true)

    try {
      const result = await ParseAPI.runCloudCodeFunction("sendFacturapiEmail", {
        facturapiOrgKey: facturapiOrgKey,
        invoiceID: selectedFactura.id,
      })

      // Handle new standardized response format
      if (result?.success || result === "Success") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
        Alert.alert("Enviado", "La factura se envió por email exitosamente.")
      } else {
        const errorMsg = result?.error?.message || "Failed to send email"
        throw new Error(errorMsg)
      }
    } catch (error: any) {
      console.error("Error sending email:", error)
      Alert.alert("Error", `Hubo un problema al enviar la factura por email: ${error.message || error}`)
    } finally {
      setIsProcessing(false)
      setSelectedFactura(null)
    }
  }

  function handleChangeEmail() {
    setNewEmail(customerEmail)
    setShowEmailModal(false)
    setShowChangeEmailModal(true)
  }

  function validateEmail(email: string): boolean {
    const emailRegex = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
    return emailRegex.test(email.toLowerCase())
  }

  async function saveNewEmail() {
    if (!newEmail.trim()) {
      Alert.alert("Campo vacío", "Ingresa una dirección de email para continuar.")
      return
    }

    if (!validateEmail(newEmail)) {
      Alert.alert("Email inválido", "Formato de email inválido. Ingresa una dirección de email con formato correcto.")
      return
    }

    if (!selectedFactura) return

    setShowChangeEmailModal(false)
    setProcessingMessage("Actualizando email...")
    setIsProcessing(true)

    try {
      const result = await ParseAPI.runCloudCodeFunction("updateFacturapiCustomerEmail", {
        facturapiOrgKey: facturapiOrgKey,
        customerId: selectedFactura.customer.id,
        newEmail: newEmail.toLowerCase(),
      })

      // Handle new standardized response format
      if (result?.success || result) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
        setCustomerEmail(newEmail.toLowerCase())
        Alert.alert("Email actualizado", "La dirección de email se cambió exitosamente.")
        setShowEmailModal(true) // Return to email confirmation
      } else {
        const errorMsg = result?.error?.message || "No fue posible actualizar el email"
        throw new Error(errorMsg)
      }
    } catch (error: any) {
      console.error("Error updating email:", error)
      Alert.alert("Error", `Hubo un problema al cambiar el email: ${error.message || error}`)
    } finally {
      setIsProcessing(false)
    }
  }

  // Cancel invoice flow
  function handleCancelInvoice(factura: FacturaItem) {
    setSelectedFactura(factura)
    setShowCancelModal(true)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
  }

  async function confirmCancelInvoice() {
    if (!selectedFactura) return

    setShowCancelModal(false)
    setProcessingMessage("Cancelando factura...")
    setIsProcessing(true)

    try {
      const result = await ParseAPI.runCloudCodeFunction("cancelarFactura", {
        facturapiOrgKey: facturapiOrgKey,
        facturaId: selectedFactura.id,
      })

      // Handle new standardized response format
      if (result?.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
        const status = result.data?.status || "cancelada"
        Alert.alert("Factura cancelada", `La factura se canceló exitosamente con status: ${status}`)
      } else if (result?.error) {
        throw new Error(result.error.message || "Error al cancelar factura")
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
        Alert.alert("Factura cancelada", `La factura se canceló exitosamente con status: ${result}`)
      }

      // Refresh the list
      await fetchFacturas(facturapiOrgKey)
    } catch (error: any) {
      console.error("Error canceling invoice:", error)
      Alert.alert("Error", `Hubo un problema al cancelar la factura: ${error.message || error}`)
    } finally {
      setIsProcessing(false)
      setSelectedFactura(null)
    }
  }

  function navigateToCreateInvoice() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    navigation.navigate("CrearFactura")
  }

  // Render invoice card (compact)
  function renderFacturaCard({ item }: { item: FacturaItem }) {
    const isValid = item.status === "valid"

    return (
      <View style={$card}>
        {/* Row 1: Folio, Date, Status */}
        <View style={$cardRow}>
          <Text style={$cardFolio}>#{item.folio_number}</Text>
          <Text style={$cardDate}>{item.created_at}</Text>
          <View style={[
            $statusBadge,
            isValid ? $statusValid : $statusCanceled,
          ]}>
            <Text style={[
              $statusText,
              isValid ? $statusTextValid : $statusTextCanceled,
            ]}>
              {isValid ? "VIGENTE" : "CANCELADA"}
            </Text>
          </View>
        </View>

        {/* Row 2: Customer and Total */}
        <View style={$cardRow}>
          <Text style={$cardCustomerName} numberOfLines={1}>
            {item.customer?.legal_name || "Sin nombre"}
          </Text>
          <Text style={$cardTotal}>{formatCurrency(item.total)}</Text>
        </View>

        {/* Row 3: Actions */}
        <View style={$cardActions}>
          <TouchableOpacity
            style={[$actionButton, $actionDownload]}
            onPress={() => handleDownload(item)}
          >
            <Entypo name="download" size={14} color={colors.palette.bluejeansDark} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[$actionButton, $actionEmail]}
            onPress={() => handleSendEmail(item)}
          >
            <Entypo name="mail" size={14} color={colors.palette.grassDark} />
          </TouchableOpacity>

          {isValid && (
            <TouchableOpacity
              style={[$actionButton, $actionCancel]}
              onPress={() => handleCancelInvoice(item)}
            >
              <Entypo name="cross" size={14} color={colors.palette.angry500} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    )
  }

  // Render empty state
  function renderEmptyState() {
    return (
      <View style={$emptyContainer}>
        <Text style={$emptyIcon}>📄</Text>
        <Text preset="subheading" style={$emptyTitle}>
          Sin facturas
        </Text>
        <Text style={$emptyDescription}>
          Aún no has emitido ninguna factura. Crea tu primera factura para comenzar.
        </Text>
        <Button
          text="+ Crear Primera Factura"
          preset="filled"
          style={$emptyButton}
          onPress={navigateToCreateInvoice}
        />
      </View>
    )
  }

  // Show loading screen centered
  if (isLoading) {
    return (
      <Screen style={$root} preset="fixed">
        <View style={$centeredScreen}>
          <ActivityIndicator size="large" color={colors.palette.lavanderLight} />
          <Text style={$loadingText}>Cargando facturas...</Text>
        </View>
      </Screen>
    )
  }

  return (
    <Screen style={$root} preset="fixed">
      {/* Search and count row */}
      <View style={$searchContainer}>
        <TextField
          placeholder="Buscar por nombre o RFC..."
          value={searchText}
          onChangeText={setSearchText}
          containerStyle={$searchField}
          style={$searchInput}
        />
        <View style={$monthCountBadge}>
          <Text style={$monthCountText}>{getCurrentMonthCount()} este mes</Text>
        </View>
      </View>

      {/* Invoice list */}
      {facturas.length === 0 ? (
        renderEmptyState()
      ) : filteredFacturas.length === 0 ? (
        <View style={$noResultsContainer}>
          <Text style={$noResultsText}>No se encontraron facturas</Text>
        </View>
      ) : (
        <FlatList
          data={filteredFacturas}
          keyExtractor={(item) => item.id}
          renderItem={renderFacturaCard}
          contentContainerStyle={$listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              colors={[colors.palette.lavanderLight]}
              tintColor={colors.palette.lavanderLight}
            />
          }
        />
      )}

      {/* Processing overlay */}
      {isProcessing && (
        <View style={$processingOverlay}>
          <View style={$processingCard}>
            <ActivityIndicator size="large" color={colors.palette.lavanderLight} />
            <Text style={$processingText}>{processingMessage}</Text>
          </View>
        </View>
      )}

      {/* Email Modal */}
      <Modal visible={showEmailModal} animationType="fade" transparent>
        <View style={$modalOverlay}>
          <View style={$modalContent}>
            <Text style={$modalIcon}>✉️</Text>
            <Text preset="subheading" style={$modalTitle}>
              Enviar Factura por Email
            </Text>
            <Text style={$modalDescription}>
              La factura {selectedFactura?.folio_number} se enviará a:
            </Text>
            <Text style={$modalEmail}>{customerEmail}</Text>

            <View style={$modalButtons}>
              <Button
                text="Cambiar Email"
                preset="default"
                style={$modalButtonSecondary}
                onPress={handleChangeEmail}
              />
              <Button
                text="Enviar Ahora"
                preset="filled"
                style={$modalButtonPrimary}
                onPress={sendEmailNow}
              />
            </View>

            <TouchableOpacity onPress={() => setShowEmailModal(false)}>
              <Text style={$modalCancelLink}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Change Email Modal */}
      <Modal visible={showChangeEmailModal} animationType="fade" transparent>
        <View style={$modalOverlay}>
          <View style={$modalContent}>
            <Text style={$modalIcon}>✏️</Text>
            <Text preset="subheading" style={$modalTitle}>
              Cambiar Email del Receptor
            </Text>
            <Text style={$modalDescription}>
              Ingresa la nueva dirección de correo electrónico:
            </Text>

            <TextField
              placeholder="correo@ejemplo.com"
              value={newEmail}
              onChangeText={setNewEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              containerStyle={$modalInput}
            />

            <View style={$modalButtons}>
              <Button
                text="Cancelar"
                preset="default"
                style={$modalButtonSecondary}
                onPress={() => {
                  setShowChangeEmailModal(false)
                  setShowEmailModal(true)
                }}
              />
              <Button
                text="Guardar"
                preset="filled"
                style={$modalButtonPrimary}
                onPress={saveNewEmail}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Cancel Confirmation Modal */}
      <Modal visible={showCancelModal} animationType="fade" transparent>
        <View style={$modalOverlay}>
          <View style={$modalContent}>
            <Text style={$modalIconWarning}>⚠️</Text>
            <Text preset="subheading" style={$modalTitle}>
              Cancelar Factura
            </Text>
            <Text style={$modalDescription}>
              ¿Estás seguro de que deseas cancelar la factura {selectedFactura?.folio_number}?
            </Text>
            <View style={$warningBox}>
              <Text style={$warningText}>
                ⚠️ Esta acción no se puede deshacer. La factura será cancelada ante el SAT.
              </Text>
            </View>

            <View style={$modalButtons}>
              <Button
                text="No, Mantener"
                preset="default"
                style={$modalButtonSecondary}
                onPress={() => setShowCancelModal(false)}
              />
              <Button
                text="Sí, Cancelar"
                preset="filled"
                style={$modalButtonDanger}
                onPress={confirmCancelInvoice}
              />
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  )
})

// Styles
const $root: ViewStyle = {
  flex: 1,
  backgroundColor: colors.background,
}

const $searchContainer: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  paddingHorizontal: spacing.small,
  paddingVertical: spacing.extraSmall,
  gap: spacing.small,
}

const $searchField: ViewStyle = {
  flex: 1,
  marginBottom: 0,
}

const $searchInput: TextStyle = {
  fontSize: 14,
  paddingVertical: 6,
  paddingHorizontal: spacing.small,
}

const $monthCountBadge: ViewStyle = {
  backgroundColor: colors.palette.lavanderClear,
  paddingHorizontal: spacing.small,
  paddingVertical: 6,
  borderRadius: 4,
}

const $monthCountText: TextStyle = {
  fontSize: 11,
  color: colors.palette.lavanderDarker,
  fontWeight: "600",
}

const $noResultsContainer: ViewStyle = {
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
  padding: spacing.large,
}

const $noResultsText: TextStyle = {
  color: colors.palette.neutral500,
  fontSize: 14,
}

const $listContent: ViewStyle = {
  padding: spacing.small,
  paddingBottom: spacing.large,
}

const $card: ViewStyle = {
  backgroundColor: colors.palette.neutral100,
  borderRadius: 8,
  padding: spacing.small,
  marginBottom: spacing.small,
  shadowColor: colors.palette.neutral800,
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.08,
  shadowRadius: 2,
  elevation: 2,
}

const $cardRow: ViewStyle = {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 4,
}

const $cardFolio: TextStyle = {
  fontSize: 15,
  fontWeight: "bold",
  color: colors.palette.neutral800,
}

const $cardDate: TextStyle = {
  fontSize: 12,
  color: colors.palette.neutral500,
}

const $statusBadge: ViewStyle = {
  paddingHorizontal: 6,
  paddingVertical: 2,
  borderRadius: 4,
}

const $statusValid: ViewStyle = {
  backgroundColor: colors.palette.grassClear,
}

const $statusCanceled: ViewStyle = {
  backgroundColor: colors.palette.angry100,
}

const $statusText: TextStyle = {
  fontSize: 9,
  fontWeight: "bold",
  letterSpacing: 0.3,
}

const $statusTextValid: TextStyle = {
  color: colors.palette.grassDark,
}

const $statusTextCanceled: TextStyle = {
  color: colors.palette.angry500,
}

const $cardCustomerName: TextStyle = {
  flex: 1,
  fontSize: 13,
  color: colors.palette.neutral700,
  marginRight: spacing.small,
}

const $cardTotal: TextStyle = {
  fontSize: 14,
  fontWeight: "bold",
  color: colors.palette.grassDark,
}

const $cardActions: ViewStyle = {
  flexDirection: "row",
  justifyContent: "flex-start",
  gap: spacing.extraSmall,
  marginTop: 4,
}

const $actionButton: ViewStyle = {
  padding: 6,
  borderRadius: 4,
  borderWidth: 1,
}

const $actionDownload: ViewStyle = {
  backgroundColor: colors.palette.bluejeansClear,
  borderColor: colors.palette.bluejeansLight,
}

const $actionEmail: ViewStyle = {
  backgroundColor: colors.palette.grassClear,
  borderColor: colors.palette.grassLight,
}

const $actionCancel: ViewStyle = {
  backgroundColor: colors.palette.angry100,
  borderColor: colors.palette.angry500,
}

const $emptyContainer: ViewStyle = {
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
  padding: spacing.large,
}

const $emptyIcon: TextStyle = {
  fontSize: 64,
  marginBottom: spacing.medium,
}

const $emptyTitle: TextStyle = {
  color: colors.palette.neutral700,
  marginBottom: spacing.small,
}

const $emptyDescription: TextStyle = {
  color: colors.palette.neutral500,
  textAlign: "center",
  marginBottom: spacing.large,
  paddingHorizontal: spacing.large,
}

const $emptyButton: ViewStyle = {
  backgroundColor: colors.palette.lavanderLight,
}

const $centeredScreen: ViewStyle = {
  flex: 1,
  marginTop: 250,
  justifyContent: "center",
  alignItems: "center",
}

const $loadingCard: ViewStyle = {
  backgroundColor: colors.palette.neutral100,
  padding: spacing.large,
  borderRadius: 12,
  alignItems: "center",
  minWidth: 200,
  shadowColor: colors.palette.neutral800,
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.2,
  shadowRadius: 4,
  elevation: 5,
}

const $loadingText: TextStyle = {
  marginTop: spacing.medium,
  color: colors.palette.lavanderDark,
}

const $processingOverlay: ViewStyle = {
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: "rgba(0,0,0,0.5)",
  justifyContent: "center",
  alignItems: "center",
}

const $processingCard: ViewStyle = {
  backgroundColor: colors.palette.neutral100,
  padding: spacing.large,
  borderRadius: 12,
  alignItems: "center",
  minWidth: 200,
}

const $processingText: TextStyle = {
  marginTop: spacing.medium,
  color: colors.palette.neutral700,
  textAlign: "center",
}

const $modalOverlay: ViewStyle = {
  flex: 1,
  backgroundColor: "rgba(0,0,0,0.5)",
  justifyContent: "center",
  alignItems: "center",
  padding: spacing.medium,
}

const $modalContent: ViewStyle = {
  backgroundColor: colors.palette.neutral100,
  borderRadius: 16,
  padding: spacing.large,
  width: "100%",
  maxWidth: 400,
  alignItems: "center",
}

const $modalIcon: TextStyle = {
  fontSize: 48,
  marginBottom: spacing.medium,
}

const $modalIconWarning: TextStyle = {
  fontSize: 48,
  marginBottom: spacing.medium,
}

const $modalTitle: TextStyle = {
  color: colors.palette.neutral800,
  marginBottom: spacing.small,
  textAlign: "center",
}

const $modalDescription: TextStyle = {
  color: colors.palette.neutral600,
  textAlign: "center",
  marginBottom: spacing.small,
}

const $modalEmail: TextStyle = {
  fontSize: 16,
  fontWeight: "bold",
  color: colors.palette.bluejeansLight,
  marginBottom: spacing.medium,
}

const $modalInput: ViewStyle = {
  width: "100%",
  marginBottom: spacing.medium,
}

const $modalButtons: ViewStyle = {
  flexDirection: "row",
  gap: spacing.small,
  marginTop: spacing.small,
}

const $modalButtonSecondary: ViewStyle = {
  flex: 1,
}

const $modalButtonPrimary: ViewStyle = {
  flex: 1,
  backgroundColor: colors.palette.lavanderLight,
}

const $modalButtonDanger: ViewStyle = {
  flex: 1,
  backgroundColor: colors.palette.angry500,
}

const $modalCancelLink: TextStyle = {
  color: colors.palette.neutral500,
  marginTop: spacing.medium,
  textDecorationLine: "underline",
}

const $warningBox: ViewStyle = {
  backgroundColor: colors.palette.sunflowerClear,
  padding: spacing.small,
  borderRadius: 8,
  marginTop: spacing.small,
  marginBottom: spacing.medium,
}

const $warningText: TextStyle = {
  color: colors.palette.sunflowerDark,
  fontSize: 13,
  textAlign: "center",
}
