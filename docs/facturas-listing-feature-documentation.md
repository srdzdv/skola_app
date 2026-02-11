# Facturas Listing Feature Documentation

> Documentation for the Mobile App Team  
> Feature: Invoice List Management and Operations  
> Source: Web Application (`facturas.component.ts`)

---

## Table of Contents

1. [Overview](#overview)
2. [User Flow](#user-flow)
3. [Data Models](#data-models)
4. [API & Cloud Functions](#api--cloud-functions)
5. [Business Logic](#business-logic)
6. [UI/UX Requirements](#uiux-requirements)
7. [Operations](#operations)
8. [Error Handling](#error-handling)
9. [Implementation Notes](#implementation-notes)

---

## Overview

### Purpose
This feature provides a comprehensive invoice management interface where school administrators can:
- View all invoices issued by their school
- Download invoices as ZIP files (containing XML and PDF)
- Send invoices via email to recipients
- Update customer email addresses
- Cancel invoices (SAT-compliant cancellation)

### Key Features
- Grid-based invoice listing with card layout
- Real-time status indicators (Valid/Cancelled)
- Download functionality (ZIP format)
- Email sending with customer email management
- Invoice cancellation with confirmation
- Empty state handling
- Loading states with skeleton screens

### Prerequisites
- School must have an active subscription with `facturapiOrgKey` configured
- Invoices must have been created through the invoice creation flow

---

## User Flow

### Main Flow: Invoice List View

```
1. User navigates to Facturas screen
   ↓
2. Component fetches escuela's facturapiOrgKey
   ↓
3. Calls fetchListaFacturas cloud function
   ↓
4. Processes and displays invoice list
   ↓
5. User can perform actions:
   - Download ZIP
   - Send Email
   - Cancel Invoice (if valid)
```

### Download Flow

```
1. User clicks "Descargar" on invoice card
   ↓
2. Validates invoice ID and API key
   ↓
3. Makes direct HTTP request to Facturapi API
   ↓
4. Receives ZIP file blob
   ↓
5. Triggers browser download
```

### Email Flow

```
1. User clicks "Enviar" on invoice card
   ↓
2. Fetches customer email from Facturapi
   ↓
3. Shows email confirmation dialog
   ↓
4. User can:
   - Send with current email
   - Change email address
   ↓
5. Calls sendFacturapiEmail cloud function
   ↓
6. Shows success/error message
```

### Cancel Flow

```
1. User clicks "Cancelar" on valid invoice
   ↓
2. Shows warning confirmation dialog
   ↓
3. User confirms cancellation
   ↓
4. Calls cancelarFactura cloud function
   ↓
5. Refreshes invoice list
   ↓
6. Shows success message
```

---

## Data Models

### Invoice Object Structure (from Facturapi API)

```typescript
interface FacturaItem {
  id: string;                    // Facturapi invoice ID
  folio_number: string;          // Invoice folio number
  status: 'valid' | 'canceled';  // Invoice status
  created_at: string;            // ISO 8601 date string
  total: number;                 // Total amount
  customer: {
    id: string;                  // Facturapi customer ID
    legal_name: string;          // Customer legal name
    tax_id: string;              // RFC (Tax ID)
  };
  items: Array<{
    description: string;         // Line item description
    quantity: number;
    unit_price: number;
    // ... other line item fields
  }>;
  // ... other invoice fields
}
```

### Component State Model

```typescript
interface FacturasComponentState {
  facturasFetchedArray: FacturaItem[];  // List of invoices
  escuelaFacturapiOrgKey: string;        // School's Facturapi API key
  
  // Dialog states
  showEmailDialog: boolean;
  showChangeEmailDialog: boolean;
  showCancelDialog: boolean;
  
  // Loading states
  isLoading: boolean;
  isProcessing: boolean;
  processingMessage: string;
  
  // Selected items
  folioSelected: string;         // Selected invoice folio
  customerEmail: string;         // Customer email address
  selectedFacturaItem: FacturaItem | null;
  
  // Form models
  modelCustomer: {
    email: string;
  };
}
```

### Date Formatting

Invoices use **moment.js** for date formatting:

```typescript
// Input: ISO 8601 string from Facturapi
// Output: "DD MMM YYYY" format (e.g., "15 Ene 2024")
moment(createdAt).format('DD MMM YYYY')
```

**Locale:** Spanish (`moment.locale('es')`)

---

## API & Cloud Functions

### Parse Server Configuration
```
Server URL: https://skola-server.herokuapp.com/parse
App ID: skolaAppId
```

### Database Tables (Parse Classes)

#### `Subscripcion` (School Subscription)
```typescript
{
  escuela: Pointer<Escuela>;
  paid: boolean;
  facturapiOrgKey: string;     // Facturapi API key for the school
}
```

### Cloud Functions

#### 1. `fetchListaFacturas`
Fetches all invoices for a school from Facturapi.

**Parameters:**
```typescript
{
  facturapiOrgKey: string;      // School's Facturapi API key
}
```

**Returns:** `Array<FacturaItem>` - Array of invoice objects from Facturapi

**Note:** This function likely calls Facturapi's `/v2/invoices` endpoint internally.

#### 2. `getFacturapiCustomer`
Retrieves customer information including email address.

**Parameters:**
```typescript
{
  facturapiOrgKey: string;      // School's Facturapi API key
  customerId: string;           // Facturapi customer ID
}
```

**Returns:** 
- `string` - Customer email address
- `"no email available"` - If customer has no email registered

#### 3. `updateFacturapiCustomerEmail`
Updates a customer's email address in Facturapi.

**Parameters:**
```typescript
{
  facturapiOrgKey: string;      // School's Facturapi API key
  customerId: string;           // Facturapi customer ID
  newEmail: string;             // New email address
}
```

**Returns:** `string` - Updated email address

#### 4. `sendFacturapiEmail`
Sends an invoice via email through Facturapi.

**Parameters:**
```typescript
{
  facturapiOrgKey: string;      // School's Facturapi API key
  invoiceID: string;            // Facturapi invoice ID
}
```

**Returns:** 
- `"Success"` - Email sent successfully
- Error object if failed

#### 5. `cancelarFactura`
Cancels an invoice (SAT-compliant cancellation).

**Parameters:**
```typescript
{
  facturapiOrgKey: string;      // School's Facturapi API key
  facturaId: string;            // Facturapi invoice ID
}
```

**Returns:** `string` - Cancellation status/result

**Note:** Cancellation is permanent and cannot be undone. The invoice status changes to "canceled" in SAT records.

### Direct Facturapi API Calls

#### Download Invoice ZIP
```
GET https://www.facturapi.io/v2/invoices/{invoice_id}/zip
Headers:
  Authorization: Bearer {facturapiOrgKey}

Response: Binary ZIP file containing:
  - XML (CFDI) - Fiscal document
  - PDF (Visual representation) - Human-readable invoice
```

**File Naming Convention:**
```
factura-{folio_number}.zip
// Fallback: factura-{invoice_id}.zip
```

---

## Business Logic

### Initialization Flow

```typescript
ngOnInit() {
  fetchData();
}

async fetchData() {
  1. Get current user's escuela
  2. Query Subscripcion table for facturapiOrgKey
  3. If key exists:
     - Call fetchListaFacturas cloud function
     - Process response (format dates)
     - Display invoices
  4. If key missing:
     - Show error alert
     - Prevent further operations
}
```

### Date Processing

```typescript
processFetchedData(result: any) {
  for each invoice in result:
    if invoice.created_at exists:
      invoice.created_at = moment(created_at).format('DD MMM YYYY')
  
  // Example: "2024-01-15T10:30:00Z" → "15 Ene 2024"
}
```

### Status Display Logic

```typescript
// Status badge display
if (invoice.status === 'valid') {
  display: "VIGENTE" (green badge)
  show: Cancel button
} else if (invoice.status === 'canceled') {
  display: "CANCELADA" (red badge)
  hide: Cancel button
}
```

### Email Validation

```typescript
// Regex pattern for email validation
const emailRegex = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

// Validation steps:
1. Check if email is not empty
2. Check if email matches regex pattern
3. Convert to lowercase before validation
```

---

## UI/UX Requirements

### Layout Structure

#### Header
- Back button (navigates to pagos screen)
- Title: "Facturas Emitidas"
- Subtitle: "Gestiona y descarga tus facturas"
- Action button: "+ Nueva Factura" (navigates to crear-factura)

#### Main Content Area

**Grid Layout:**
- Desktop: 4 columns
- Tablet (≤1400px): 3 columns
- Tablet (≤1024px): 2 columns
- Mobile (≤768px): 1 column

**Card Structure:**
```
┌─────────────────────────┐
│ FECHA        [STATUS]   │
│ DD MMM YYYY             │
│                         │
│ FOLIO                   │
│ {folio_number}          │
├─────────────────────────┤
│ CLIENTE                 │
│ {legal_name}            │
│ {tax_id}               │
│                         │
│ TOTAL                   │
│ ${amount}               │
│                         │
│ CONCEPTO                │
│ {description}           │
├─────────────────────────┤
│ [Download] [Email] [Cancel] │
└─────────────────────────┘
```

### States

#### Loading State
- Show skeleton cards (6 cards)
- Skeleton includes: header, body lines, footer
- Animated shimmer effect

#### Empty State
- Large icon: 📄
- Title: "Sin facturas"
- Description: "Aún no has emitido ninguna factura. Crea tu primera factura para comenzar."
- Action button: "+ Crear Primera Factura"

#### Error State
- Show alert dialogs for errors
- Maintain current view (don't navigate away)

### Invoice Card Details

#### Header Section
- **Date**: Formatted as "DD MMM YYYY" (Spanish locale)
- **Status Badge**: 
  - Green for "VIGENTE" (valid)
  - Red for "CANCELADA" (cancelled)

#### Folio Section
- Large, bold folio number
- Label: "FOLIO"

#### Client Section
- Legal name (bold)
- Tax ID (RFC) below name
- Label: "CLIENTE"

#### Amount Section
- Total amount in bold, green color
- Currency: MXN
- Format: $X,XXX.XX
- Label: "TOTAL"

#### Concept Section
- Line item descriptions
- Multiple items displayed as separate lines
- Label: "CONCEPTO"

#### Actions Section
- Three buttons in a row:
  1. **Descargar** (Download) - Blue
  2. **Enviar** (Send Email) - Green
  3. **Cancelar** (Cancel) - Red (only shown for valid invoices)

### Modal Dialogs

#### 1. Email Confirmation Dialog
```
┌─────────────────────────────┐
│         ✉                  │
│  Enviar Factura por Email  │
├─────────────────────────────┤
│ La factura {folio} se      │
│ enviará a:                 │
│                            │
│ [email@example.com]        │
├─────────────────────────────┤
│ [Cambiar Email] [Enviar Ahora] │
└─────────────────────────────┘
```

#### 2. Change Email Dialog
```
┌─────────────────────────────┐
│         ✎                   │
│  Cambiar Email del Receptor │
├─────────────────────────────┤
│ Ingresa la nueva dirección  │
│ de correo electrónico:      │
│                            │
│ [email input field]         │
├─────────────────────────────┤
│ [Cancelar] [Guardar]        │
└─────────────────────────────┘
```

#### 3. Cancel Confirmation Dialog
```
┌─────────────────────────────┐
│         ⚠                   │
│     Cancelar Factura        │
├─────────────────────────────┤
│ ¿Estás seguro de que deseas │
│ cancelar la factura {folio}?│
│                            │
│ ⚠ Esta acción no se puede   │
│   deshacer. La factura será │
│   cancelada ante el SAT.    │
├─────────────────────────────┤
│ [No, Mantener] [Sí, Cancelar]│
└─────────────────────────────┘
```

### Loading Overlay

Full-screen overlay with:
- Spinner animation
- Processing message text
- Examples:
  - "Obteniendo información del cliente..."
  - "Preparando descarga..."
  - "Enviando factura por email..."
  - "Cancelando factura..."
  - "Actualizando email..."

---

## Operations

### 1. Download Invoice ZIP

**User Action:** Click "Descargar" button

**Process:**
```typescript
1. Validate invoice ID exists
2. Validate facturapiOrgKey exists
3. Show loading overlay ("Preparando descarga...")
4. Make GET request to Facturapi API:
   GET /v2/invoices/{id}/zip
   Headers: Authorization: Bearer {key}
5. Receive ZIP blob
6. Create download link
7. Trigger download
8. Clean up DOM elements
9. Hide loading overlay
```

**Error Handling:**
- Missing ID: Alert "No se puede descargar la factura. ID no disponible."
- Missing API key: Alert "No se puede descargar la factura. Clave de API no disponible."
- HTTP error: Alert with error message

### 2. Send Invoice Email

**User Action:** Click "Enviar" button

**Process:**
```typescript
1. Show loading ("Obteniendo información del cliente...")
2. Extract customer ID from invoice
3. Call getFacturapiCustomer cloud function
4. If email exists:
   - Show email confirmation dialog
   - Display folio and email
   - User can send or change email
5. If no email:
   - Alert: "Este cliente no tiene un email registrado..."
   - Prompt to add email first
```

**Send Email Sub-process:**
```typescript
1. User clicks "Enviar Ahora"
2. Close email dialog
3. Show loading ("Enviando factura por email...")
4. Call sendFacturapiEmail cloud function
5. If success:
   - Alert: "La factura se envió por email exitosamente."
6. Hide loading
```

### 3. Update Customer Email

**User Action:** Click "Cambiar Email" in email dialog

**Process:**
```typescript
1. Show change email dialog
2. User enters new email
3. Validate:
   - Not empty
   - Valid email format (regex)
4. Show loading ("Actualizando email...")
5. Call updateFacturapiCustomerEmail cloud function
6. Update local customerEmail state
7. Alert: "La dirección de email se cambió exitosamente..."
8. Return to email confirmation dialog
```

**Email Validation:**
```typescript
// Regex pattern
/^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/

// Validation steps:
1. Check length > 0
2. Convert to lowercase
3. Test against regex
```

### 4. Cancel Invoice

**User Action:** Click "Cancelar" button (only visible for valid invoices)

**Process:**
```typescript
1. Show cancel confirmation dialog
2. Display warning about permanent action
3. User confirms cancellation
4. Close dialog
5. Show loading ("Cancelando factura...")
6. Call cancelarFactura cloud function
7. Alert: "La factura se canceló exitosamente con status: {result}"
8. Refresh invoice list (fetchData)
9. Hide loading
```

**Important Notes:**
- Cancellation is **permanent** and **irreversible**
- Invoice status changes to "canceled" in SAT records
- Canceled invoices cannot be cancelled again
- Cancel button only shows for `status === 'valid'` invoices

### 5. Navigate to Create Invoice

**User Action:** Click "+ Nueva Factura" button

**Process:**
```typescript
1. Extract current route segments
2. Navigate to: {basePath}/home/crearFactura/
```

---

## Error Handling

### Common Errors

| Error | Cause | User Message |
|-------|-------|--------------|
| Missing facturapiOrgKey | School not configured | "Tu escuela no tiene activada la función de facturación. Contacta al equipo de Skola App para activar esta función." |
| Fetch invoices failed | Network/API error | "Hubo un problema al buscar las facturas: {error}" |
| Download failed | Network/API error | "Hubo un problema al descargar la factura: {error}" |
| No customer email | Customer has no email | "Este cliente no tiene un email registrado. Por favor agregue uno primero." |
| Get customer failed | API error | "Hubo un problema al obtener la información del cliente: {error}" |
| Invalid email format | Email validation failed | "Formato de email inválido. Ingresa una dirección de email con formato correcto." |
| Empty email field | User submitted empty email | "Campo vacío. Ingresa una dirección de email para continuar." |
| Update email failed | API error | "Hubo un problema al cambiar el email: {error}" |
| Send email failed | API error | "Hubo un problema al enviar la factura por email: {error}" |
| Cancel failed | API error | "Hubo un problema al cancelar la factura: {error}" |

### Error Display Strategy
- Use `alert()` for all errors (simple, consistent)
- Show loading states during operations
- Maintain dialog state on non-critical errors
- Refresh data after successful operations

---

## Implementation Notes

### Mobile-Specific Considerations

1. **Grid Layout**
   - Use responsive grid (4 → 3 → 2 → 1 columns)
   - Consider card swipe actions for mobile
   - Implement pull-to-refresh

2. **File Download**
   - Use native file download APIs
   - Handle file permissions
   - Provide share options (email, files app, cloud storage)
   - Show download progress indicator

3. **Email Integration**
   - Pre-fill email client with invoice details
   - Use native email composer
   - Handle email client availability

4. **Date Formatting**
   - Use native date formatting libraries
   - Respect device locale settings
   - Format: "DD MMM YYYY" (Spanish)

5. **Loading States**
   - Show native loading indicators
   - Use skeleton screens for initial load
   - Disable actions during processing

6. **Network Handling**
   - Cache invoice list locally
   - Handle offline gracefully
   - Show network status indicator
   - Retry failed operations

7. **Navigation**
   - Deep linking support
   - Handle back button properly
   - Save scroll position

### Security Notes
- `facturapiOrgKey` is sensitive - never log or expose
- Validate all user inputs server-side
- Implement proper authentication checks
- Use HTTPS for all API calls

### Performance Optimization

1. **Lazy Loading**
   - Load invoices in batches/pages
   - Implement infinite scroll

2. **Caching**
   - Cache invoice list locally
   - Refresh on pull-to-refresh
   - Invalidate cache after operations

3. **Image Optimization**
   - Lazy load invoice PDF thumbnails (if implemented)
   - Use appropriate image formats

### Testing Checklist
- [ ] Fetch invoice list successfully
- [ ] Display empty state correctly
- [ ] Download ZIP file
- [ ] Send email with existing email
- [ ] Change customer email
- [ ] Cancel invoice
- [ ] Handle missing API key
- [ ] Handle network errors
- [ ] Validate email format
- [ ] Refresh after operations
- [ ] Responsive layout (all breakpoints)
- [ ] Loading states
- [ ] Error messages
- [ ] Navigation flows

---

## Related Components

| Component | Path | Purpose |
|-----------|------|---------|
| CrearFacturaComponent | `pagos/crear-factura/` | Create new invoices |
| PagosComponent | `pagos/` | Main payments screen |
| EdoCuentaComponent | `pagos/edo-cuenta/` | Account statement |

---

## External Resources

- [Facturapi API Documentation](https://docs.facturapi.io/api/)
- [Facturapi Invoice Endpoints](https://docs.facturapi.io/api/#tag/invoice)
- [Parse Server Documentation](https://parseplatform.org/)
- [Moment.js Documentation](https://momentjs.com/docs/)

---

## API Endpoints Reference

### Facturapi Endpoints Used

#### List Invoices
```
GET /v2/invoices
Headers:
  Authorization: Bearer {facturapiOrgKey}
Query Parameters:
  - limit (optional)
  - page (optional)
```

#### Download Invoice ZIP
```
GET /v2/invoices/{id}/zip
Headers:
  Authorization: Bearer {facturapiOrgKey}
```

#### Get Customer
```
GET /v2/customers/{id}
Headers:
  Authorization: Bearer {facturapiOrgKey}
```

#### Update Customer
```
PUT /v2/customers/{id}
Headers:
  Authorization: Bearer {facturapiOrgKey}
Body:
  {
    email: string
  }
```

#### Send Invoice Email
```
POST /v2/invoices/{id}/email
Headers:
  Authorization: Bearer {facturapiOrgKey}
```

#### Cancel Invoice
```
DELETE /v2/invoices/{id}
Headers:
  Authorization: Bearer {facturapiOrgKey}
```

---

*Last Updated: January 2026*  
*Web Component Version: facturas.component.ts*
