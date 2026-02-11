# Download Factura Feature

This document explains how the invoice (factura) download feature works in the Admin app, so the Parents app team can implement a similar feature.

## Overview

The download feature allows users to download a ZIP file containing both the XML and PDF versions of a CFDI invoice (factura) from Facturapi.

## Prerequisites

### Dependencies

```bash
npx expo install expo-file-system expo-sharing expo-haptics
```

### Imports

```typescript
import * as FileSystem from "expo-file-system/legacy"
import * as Sharing from "expo-sharing"
import * as Haptics from "expo-haptics" // Optional, for tactile feedback
```

> **Note:** As of Expo SDK 54, use `"expo-file-system/legacy"` instead of `"expo-file-system"` to avoid deprecation warnings.

## Required Data

To download an invoice, you need:

| Field | Description | Example |
|-------|-------------|---------|
| `facturapiOrgKey` | The Facturapi organization API key | `"sk_live_xxx..."` |
| `invoiceId` | The Facturapi invoice ID | `"6789abc123..."` |
| `folioNumber` | Invoice folio (for filename) | `"123"` |

## API Endpoint

```
GET https://www.facturapi.io/v2/invoices/{invoiceId}/zip
```

### Headers

```
Authorization: Bearer {facturapiOrgKey}
```

### Response

Returns a ZIP file containing:
- `factura.xml` - The CFDI XML file
- `factura.pdf` - The PDF representation

## Implementation

### Complete Download Function

```typescript
import * as FileSystem from "expo-file-system/legacy"
import * as Sharing from "expo-sharing"
import * as Haptics from "expo-haptics"
import { Alert } from "react-native"

interface DownloadFacturaParams {
  invoiceId: string
  folioNumber: string
  facturapiOrgKey: string
  onStart?: () => void
  onComplete?: () => void
  onError?: (error: Error) => void
}

async function downloadFactura({
  invoiceId,
  folioNumber,
  facturapiOrgKey,
  onStart,
  onComplete,
  onError,
}: DownloadFacturaParams): Promise<void> {
  // Validate required parameters
  if (!invoiceId) {
    Alert.alert("Error", "No se puede descargar la factura. ID no disponible.")
    return
  }

  if (!facturapiOrgKey) {
    Alert.alert("Error", "No se puede descargar la factura. Clave de API no disponible.")
    return
  }

  // Optional: Haptic feedback on start
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)

  // Notify start
  onStart?.()

  try {
    // Generate filename and local path
    const fileName = `factura-${folioNumber || invoiceId}.zip`
    const fileUri = `${FileSystem.cacheDirectory}${fileName}`

    // Download the ZIP file from Facturapi
    const downloadResult = await FileSystem.downloadAsync(
      `https://www.facturapi.io/v2/invoices/${invoiceId}/zip`,
      fileUri,
      {
        headers: {
          Authorization: `Bearer ${facturapiOrgKey}`,
        },
      }
    )

    // Check for HTTP errors
    if (downloadResult.status !== 200) {
      throw new Error(`HTTP error: ${downloadResult.status}`)
    }

    // Share the downloaded file
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(downloadResult.uri)
    } else {
      Alert.alert("Descargado", "La factura se ha guardado en el dispositivo.")
    }

    // Success haptic feedback
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)

  } catch (error: any) {
    console.error("Error downloading invoice:", error)
    onError?.(error)
    Alert.alert(
      "Error",
      `Hubo un problema al descargar la factura: ${error.message || error}`
    )
  } finally {
    onComplete?.()
  }
}
```

### Usage Example in a Component

```typescript
import React, { useState } from "react"
import { TouchableOpacity, ActivityIndicator, View, Text } from "react-native"

function FacturaCard({ factura, facturapiOrgKey }) {
  const [isDownloading, setIsDownloading] = useState(false)

  const handleDownload = () => {
    downloadFactura({
      invoiceId: factura.id,
      folioNumber: factura.folio_number,
      facturapiOrgKey: facturapiOrgKey,
      onStart: () => setIsDownloading(true),
      onComplete: () => setIsDownloading(false),
    })
  }

  return (
    <View>
      <Text>Factura #{factura.folio_number}</Text>

      <TouchableOpacity
        onPress={handleDownload}
        disabled={isDownloading}
      >
        {isDownloading ? (
          <ActivityIndicator size="small" />
        ) : (
          <Text>Descargar ZIP</Text>
        )}
      </TouchableOpacity>
    </View>
  )
}
```

## UI/UX Recommendations

### Loading State

Show a loading indicator while downloading:

```typescript
const [isProcessing, setIsProcessing] = useState(false)
const [processingMessage, setProcessingMessage] = useState("")

// Before download
setProcessingMessage("Preparando descarga...")
setIsProcessing(true)

// After download
setIsProcessing(false)
```

### Processing Overlay Component

```typescript
{isProcessing && (
  <View style={styles.processingOverlay}>
    <View style={styles.processingCard}>
      <ActivityIndicator size="large" color="#7C3AED" />
      <Text style={styles.processingText}>{processingMessage}</Text>
    </View>
  </View>
)}

const styles = {
  processingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  processingCard: {
    backgroundColor: "#FFFFFF",
    padding: 24,
    borderRadius: 12,
    alignItems: "center",
    minWidth: 200,
  },
  processingText: {
    marginTop: 16,
    color: "#374151",
    textAlign: "center",
  },
}
```

## Error Handling

### Common Errors

| HTTP Status | Cause | User Message |
|-------------|-------|--------------|
| 401 | Invalid API key | "Clave de API inválida" |
| 404 | Invoice not found | "Factura no encontrada" |
| 500 | Facturapi server error | "Error del servidor, intenta más tarde" |

### Network Error Handling

```typescript
try {
  // ... download logic
} catch (error: any) {
  if (error.message?.includes("Network")) {
    Alert.alert("Sin conexión", "Verifica tu conexión a internet e intenta de nuevo.")
  } else {
    Alert.alert("Error", `Hubo un problema al descargar: ${error.message}`)
  }
}
```

## Security Considerations

1. **Never expose the API key in client-side code for production**
   - For the Parents app, consider creating a backend endpoint that proxies the download request
   - The backend should validate the user has permission to access that invoice

2. **Validate user permissions**
   - Ensure the parent can only download invoices associated with their children

## Alternative: Backend Proxy Approach (Recommended for Parents App)

Instead of exposing the Facturapi key to the client, create a Cloud Function:

```typescript
// Cloud Function: downloadFacturaForParent
Parse.Cloud.define("downloadFacturaForParent", async (request) => {
  const { invoiceId, parentId } = request.params

  // 1. Validate parent owns this invoice
  // 2. Get facturapiOrgKey from Subscription
  // 3. Fetch ZIP from Facturapi
  // 4. Return base64 encoded ZIP or a signed URL
})
```

Then in the app:

```typescript
const result = await Parse.Cloud.run("downloadFacturaForParent", {
  invoiceId: factura.id,
  parentId: currentUser.id,
})
// Handle the returned file data
```

## Related Facturapi Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /v2/invoices/{id}/zip` | Download ZIP (XML + PDF) |
| `GET /v2/invoices/{id}/xml` | Download only XML |
| `GET /v2/invoices/{id}/pdf` | Download only PDF |

## Questions?

Contact the Admin app team for clarification on:
- How to obtain the `facturapiOrgKey` for parent users
- Invoice data structure and required fields
- Permission/authorization logic for parent-invoice relationships
