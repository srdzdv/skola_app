# Crear Factura (Invoice Creation) Feature Documentation

> Documentation for the Mobile App Team  
> Feature: Electronic Invoice (CFDI) Generation for Mexican Schools  
> Source: Web Application (`crear-factura.component.ts`)

---

## Table of Contents

1. [Overview](#overview)
2. [User Flow](#user-flow)
3. [Data Models](#data-models)
4. [API & Cloud Functions](#api--cloud-functions)
5. [Business Logic](#business-logic)
6. [UI/UX Requirements](#uiux-requirements)
7. [Form Validations](#form-validations)
8. [Error Handling](#error-handling)
9. [Implementation Notes](#implementation-notes)

---

## Overview

### Purpose
This feature allows school administrators to create and emit electronic invoices (CFDI - Comprobante Fiscal Digital por Internet) compliant with Mexican tax regulations (SAT). The invoices are generated through **Facturapi**, a third-party invoicing service.

### Key Features
- Multi-step wizard interface (6 steps)
- Student search with autocomplete
- RFC (Tax ID) management for invoice recipients
- Support for various payment methods and CFDI usage codes
- IEDU complement for educational institutions (SAT requirement)
- Invoice download as ZIP (contains XML and PDF)
- Email delivery of invoices

### Prerequisites
- School must have an active subscription with `facturapiOrgKey` configured
- Students must be registered in the system
- RFC data can be pre-registered or created on-the-fly

---

## User Flow

The invoice creation process follows a **6-step wizard**:

### Step 1: Student Selection (`Alumno`)
```
User Action: Search and select a student
Required Data: Student name (minimum 2 characters to trigger search)
Output: Selected student object with CURP
```

**Search Behavior:**
- Debounced search (300ms delay after typing stops)
- Preloads all students on component init for faster filtering
- Falls back to database query if cache unavailable
- Results limited to 20 items
- Filters by: First name starts with search term OR full name contains search term

### Step 2: Amount & Concept (`Monto`)
```
Required Fields:
- cantidad (number): Amount to invoice
- facturaConcepto (string): Invoice concept/description
- productoSKU (string): Product/Service code
- ivaAplicado (boolean): Whether IVA is included (default: true)
```

**Product/Service Codes (SKU):**
| Code | Description |
|------|-------------|
| KBH-0001 | Colegiaturas (Tuition) |
| KBH-0002 | Uniformes (Uniforms) |
| KBH-0003 | Cursos (Courses) |
| KBH-0004 | Guarderías (Daycare) |
| KBH-0005 | Inscripción Anual (Annual Registration) |
| KBH-0006 | Reinscripción Anual (Annual Re-registration) |
| KBH-0007 | Seguro por Accidentes (Accident Insurance) |
| KBH-0008 | Tiempo Extra (Extra Time) |
| KBH-0009 | Recargos Moratorios (Late Fees) |
| KBH-0010 | Credencial (ID Card) |
| KBH-0011 | Libros y Cuadernos KBH (Books) |
| KBH-0012 | Candado de Estacionamiento (Parking Lock) |
| KBH-0013 | Manteles (Tablecloths) |
| KBH-0014 | Otros Servicios (Other Services) |
| KBH-0015 | Libros Exentos (Exempt Books) |

### Step 3: Recipient Selection (`Receptor`)
```
Required Fields:
- rfcReceptor (string): Tax ID of the invoice recipient
- facturaEmail (string): Email to send the invoice
Optional:
- selectedRFCName (string): Display name for the RFC
```

**RFC Options:**
1. **Existing RFC**: Select from previously registered RFC data for the student
2. **Público General**: Generic RFC for general public (`XAXX010101000`)
3. **New RFC**: Register new tax information

### Step 4: Payment Details (`Detalles`)
```
Required Fields:
- facturaFormaPago (string): Payment method code (default: "03" - Electronic Transfer)
- facturaUsoCFDI (string): CFDI usage code (default: "D10" - Educational Services)
- fechaExpedicion (string): Issue date (YYYY-MM-DD format)

Optional Fields:
- relacion04 (boolean): Related invoice flag
- docRelacion04 (string): UUID of related document
- IEDU complement data
```

**Payment Methods (Forma de Pago):**
| Code | Description |
|------|-------------|
| 01 | Efectivo (Cash) |
| 02 | Cheque nominativo |
| 03 | Transferencia electrónica (Electronic Transfer) |
| 04 | Tarjeta de crédito (Credit Card) |
| 28 | Tarjeta de débito (Debit Card) |
| 99 | Por definir (To be defined) |
| ... | (See full list in component) |

**CFDI Usage Codes (Uso CFDI):**
| Code | Description |
|------|-------------|
| D10 | Pagos por servicios educativos (Educational Services) - **DEFAULT** |
| G01 | Adquisición de mercancías |
| G03 | Gastos en general |
| D08 | Gastos de transportación escolar |
| ... | (See full list in component) |

### Step 5: Review & Confirm (`Confirmar`)
```
Display all entered data for user verification before submission
```

### Step 6: Success Confirmation
```
Display:
- Invoice folio number
- Receipt summary
- Download ZIP button
- Create new invoice option
```

---

## Data Models

### Main Payment Model (`modelPago`)
```typescript
interface ModelPago {
  nombre: string;              // Student full name
  mail: string;                // Email (legacy, not used)
  direccion: string;           // Address (legacy, not used)
  rfc: string;                 // RFC (legacy, not used)
  razon: string;               // Business name (legacy, not used)
  total: number;               // Total amount
  factura: boolean;            // Invoice flag (legacy)
  rfcReceptor: string;         // Recipient's RFC (Tax ID)
  facturaConcepto: string;     // Invoice concept description
  facturaFormaPago: string;    // Payment method code (e.g., "03")
  facturaUsoCFDI: string;      // CFDI usage code (e.g., "D10")
  facturaEmail: string;        // Recipient email
  cantidad: number;            // Amount to invoice
  estudianteCURP: string;      // Student's CURP
  ivaAplicado: boolean;        // IVA included flag
  relacion04: boolean;         // Related document flag
  docRelacion04: string;       // Related document UUID
  fechaExpedicion: string;     // Issue date (YYYY-MM-DD)
  productoSKU: string;         // Product/Service SKU code
}
```

### New RFC Model (`modelRFC`)
```typescript
interface ModelRFC {
  rfcNuevoAlumno: string;      // Student name (display only)
  rfcNuevoRazonSocial: string; // Legal name / Business name
  rfcNuevoRFC: string;         // RFC (Tax ID)
  rfcNuevocodigoPostal: string;// Postal code
  rfcNuevoEmail: string;       // Email
  tax_system: string;          // Tax regime code (e.g., "601", "612", "626")
}
```

### IEDU Model (Educational Complement)
```typescript
interface ModelIEDU {
  ieduAdded: boolean;          // Whether IEDU complement is enabled
  version: string;             // Always "1.0"
  nombreAlumno: string;        // Student name
  CURP: string;                // Student's CURP
  nivelEducativo: string;      // Educational level
  rfcPago: string;             // Payer's RFC
  autRVOE: string;             // RVOE authorization number
}
```

**Educational Levels (nivelEducativo):**
- Preescolar
- Primaria
- Secundaria
- Profesional técnico
- Bachillerato

### Tax Regimes (Régimen Fiscal)
| Code | Description |
|------|-------------|
| 601 | General de Ley Personas Morales |
| 603 | Personas Morales con Fines no Lucrativos |
| 605 | Sueldos y Salarios |
| 606 | Arrendamiento |
| 612 | Personas Físicas con Actividades Empresariales |
| 621 | Incorporación Fiscal |
| 626 | Régimen Simplificado de Confianza (RESICO) |
| ... | (See full list in component) |

---

## API & Cloud Functions

### Parse Server Configuration
```
Server URL: https://skola-server.herokuapp.com/parse
App ID: skolaAppId
```

### Database Tables (Parse Classes)

#### `Estudiantes` (Students)
```typescript
{
  NOMBRE: string;        // First name
  APELLIDO: string;      // Last name
  CURP: string;          // Student's CURP
  escuela: Pointer<Escuela>;
  grupo: Pointer<Grupo>;
  status: number;        // 0 = active
}
```

#### `Facturapi` (RFC/Tax Data)
```typescript
{
  estudiante: string;           // Student object ID
  rfc: string;                  // Tax ID
  razonSocial: string;          // Legal name
  emailReceptor: string;        // Email
  facturapiCustomerId: string;  // Facturapi customer ID
}
```

#### `Subscripcion` (School Subscription)
```typescript
{
  escuela: Pointer<Escuela>;
  paid: boolean;
  facturapiOrgKey: string;     // Facturapi API key for the school
}
```

### Cloud Functions

#### 1. `registrarClienteFacturapi`
Registers a new customer in Facturapi and saves RFC data to Parse.

**Parameters:**
```typescript
{
  estudianteObjectId: string;  // Student's Parse object ID
  legalName: string;           // Legal/Business name
  email: string;               // Email
  taxId: string;               // RFC (uppercase)
  zipcode: string;             // Postal code
  facturapiOrgKey: string;     // School's Facturapi API key
  tax_system: string;          // Tax regime code
}
```

**Returns:** `string` - The new Facturapi object ID

#### 2. `crearFactura`
Creates and emits a new invoice through Facturapi.

**Parameters:**
```typescript
{
  customerId: string;          // Facturapi customer ID
  concepto: string;            // Invoice concept/description
  multiconcepto: any[];        // Multiple line items (optional)
  formaPago: string;           // Payment method code
  usoCFDI: string;             // CFDI usage code
  precio: number;              // Total amount
  ivaAplicado: boolean;        // IVA included flag
  facturapiOrgKey: string;     // School's Facturapi API key
  opCustomerId: string;        // OpenPay customer ID (optional)
  opTokenId: string;           // OpenPay token ID (optional)
  sku: string;                 // Product/Service SKU
  fechaExpedicion: string;     // Issue date (ISO 8601 format)
  relacion04DocId: string;     // Related document UUID (optional)
  IEDU: ModelIEDU;             // IEDU complement data
}
```

**Returns:**
```typescript
{
  success: boolean;
  invoice: {
    id: string;                // Facturapi invoice ID
    folio_number: string;      // Invoice folio number
    uuid: string;              // Fiscal UUID
    // ... other invoice data
  }
}
```

### Direct Facturapi API Calls

#### Download Invoice ZIP
```
GET https://www.facturapi.io/v2/invoices/{invoice_id}/zip
Headers:
  Authorization: Bearer {facturapiOrgKey}

Response: Binary ZIP file containing:
  - XML (CFDI)
  - PDF (Visual representation)
```

---

## Business Logic

### Date Validation Rules

The invoice issue date (`fechaExpedicion`) has specific SAT requirements:

```typescript
// Maximum 72 hours in the past
const minDate = new Date(now.getTime() - (72 * 60 * 60 * 1000));

// Cannot be in the future
const maxDate = now;

// Date format for API: ISO 8601 with timezone
// Example: "2024-01-15T10:30:45.123-06:00"
```

### Público General (Generic RFC) Logic

For generic invoices without a specific RFC:

```typescript
if (publicoGeneral) {
  // Use school-specific Facturapi object or default
  switch (escuela.id) {
    case 'lX0nAIzWgE': // KBH Santa Fe
      facturapiObjectId = 'Ve2FuAp4Vu';
      break;
    case 'vyes6sJELf': // KBH DANJAAS
      facturapiObjectId = 'tVB7eUlwBX';
      break;
    default:
      // Use default public RFC
      rfcReceptor = 'XAXX010101000';
  }
}
```

### Student Search Optimization

```typescript
// Preload strategy
async preloadEstudiantes() {
  // Load all active students on init
  queryEstudiante.equalTo('escuela', escuela);
  queryEstudiante.equalTo('status', 0);  // Active only
  queryEstudiante.limit(1000);
  queryEstudiante.ascending('ApPATERNO');
  
  this.allEstudiantes = await queryEstudiante.find();
}

// Client-side filtering (no network call)
filterEstudiantes(searchString: string) {
  const searchLower = searchString.toLowerCase();
  return allEstudiantes.filter(student => {
    const nombre = student.get('NOMBRE').toLowerCase();
    const apellido = student.get('APELLIDO').toLowerCase();
    const fullName = `${nombre} ${apellido}`;
    return nombre.startsWith(searchLower) || fullName.includes(searchLower);
  }).slice(0, 20);
}
```

### Invoice Processing Flow

```
1. User clicks "Emitir Factura"
   ↓
2. Validate all required fields
   ↓
3. Query Facturapi table to get facturapiCustomerId
   ↓
4. Call crearFactura cloud function with all parameters
   ↓
5. On success: Navigate to Step 6 (Success screen)
   ↓
6. User can download ZIP or create another invoice
```

---

## UI/UX Requirements

### Step Progress Indicator
- Show 5 steps visually (step 6 is hidden in progress bar)
- Current step: Green fill
- Completed steps: Green with checkmark
- Future steps: Gray

### Modal Dialogs
1. **Student Selection Dialog**: List of matching students
2. **RFC Selection Dialog**: List of registered RFCs + "Add New" option
3. **New RFC Dialog**: Form to register new tax information
4. **IEDU Dialog**: Form for educational complement data
5. **Loading Overlay**: Full-screen spinner with message

### Form Field States
- Disabled "Continue" button until required fields are filled
- Error messages below invalid fields
- Uppercase transformation for RFC inputs

### Success Screen
- Animated checkmark
- Invoice summary card
- Download button (disabled while downloading)
- Secondary actions: "Create another" and "Back to invoices"

---

## Form Validations

### Step 1 (Student)
- `estudianteSeleccionado` must not be null

### Step 2 (Amount)
- `cantidad` must be > 0
- `facturaConcepto` must not be empty

### Step 3 (Recipient)
- `rfcReceptor` must not be empty
- `facturaEmail` must not be empty

### Step 4 (Details)
- `fechaExpedicion` must be within valid range (72 hours past to now)

### New RFC Form
- All fields required: Razón Social, RFC, Código Postal, Email
- RFC should be uppercase (transform on submit)

---

## Error Handling

### Common Errors

| Error | Cause | User Message |
|-------|-------|--------------|
| Missing facturapiOrgKey | School not configured for invoicing | "Tu escuela no tiene activada la función de facturación. Contacta al equipo de Skola App para activar esta función." |
| Invalid tax regime | Customer missing tax regime | "El cliente no tiene definido su régimen fiscal. Clave del cliente: {id}" |
| Date out of range | Issue date invalid | "Error en fecha de expedición: {specific error}" |
| Empty fields | Required fields missing | "Campos vacíos. Estudiante, concepto del pago y cantidad son necesarios para registrar un pago." |

### Error Display Strategy
- Use `alert()` for critical errors
- Display inline error messages for form validation
- Log errors to console for debugging

---

## Implementation Notes

### Mobile-Specific Considerations

1. **Network Handling**
   - Cache student list locally
   - Handle offline gracefully (disable invoice creation)
   - Show loading states for all API calls

2. **Form Navigation**
   - Support swipe gestures for step navigation
   - Save draft data between steps
   - Handle app backgrounding (save state)

3. **Date Picker**
   - Use native date picker
   - Respect min/max date constraints

4. **ZIP Download**
   - Handle file download natively
   - Provide share options (email, files app)

5. **Keyboard**
   - Auto-dismiss on tap outside
   - Handle numeric keyboard for amount fields
   - Use email keyboard for email fields

### Security Notes
- `facturapiOrgKey` is sensitive - never log or expose
- RFC should be validated server-side
- Implement proper authentication checks

### Testing Checklist
- [ ] Student search with various inputs
- [ ] RFC selection flow (existing, new, público general)
- [ ] Date validation (boundary cases)
- [ ] Invoice creation end-to-end
- [ ] ZIP download
- [ ] Error handling for all API failures
- [ ] Form state persistence
- [ ] Back navigation handling

---

## Related Components

| Component | Path | Purpose |
|-----------|------|---------|
| FacturasComponent | `pagos/facturas/` | Invoice listing and management |
| RegistrarPagoComponent | `registrar-pago/` | Payment registration (includes invoice option) |
| EdoCuentaComponent | `pagos/edo-cuenta/` | Account statement |

---

## External Resources

- [Facturapi API Documentation](https://docs.facturapi.io/api/)
- [SAT CFDI 4.0 Specifications](https://www.sat.gob.mx/consultas/35025/formato-de-factura-electronica-(anexo-20))
- [Parse Server Documentation](https://parseplatform.org/)

---

*Last Updated: January 2026*  
*Web Component Version: crear-factura.component.ts*
