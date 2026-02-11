# PDF & Video Attachment Fixes

This document outlines the fixes required to enable proper PDF and video attachment functionality across the app.

---

## 1. CrearActividadScreen.tsx - Fix PDF Upload

### 1.1 Fix PDF Upload Flag

**Problem:** When attaching a PDF, the `awsAttachment` flag was not being set to `true`, causing the server to not expect an attachment.

**Location:** `processDataForAnuncio()` and `sendMessagesToMultipleStudents()` functions

**Fix:** Add `docURI` check to the `awsAttachment` calculation.

#### Before:
```typescript
const hasMultipleImages = currentMultipleImages.length > 0
const hasSingleMedia = mediaURL.length > 0
const awsAttachment = hasMultipleImages || hasSingleMedia
```

#### After:
```typescript
const hasMultipleImages = currentMultipleImages.length > 0
const hasSingleMedia = mediaURL.length > 0
const hasDocument = docURI.length > 0
const awsAttachment = hasMultipleImages || hasSingleMedia || hasDocument
```

**Note:** This change must be applied in BOTH functions:
- `processDataForAnuncio()`
- `sendMessagesToMultipleStudents()`

### 1.2 Fix PDF Upload - Disable Resize

**Problem:** The `uploadFileToAWSS3` function was trying to resize PDFs, which causes the upload to fail.

**Location:** `uploadFileToAWSS3()` function

#### Before:
```typescript
async function uploadFileToAWSS3(anuncioPhotoObjectId: string, isPDF: boolean) {
  const shouldResize = true
  // ...
}
```

#### After:
```typescript
async function uploadFileToAWSS3(anuncioPhotoObjectId: string, isPDF: boolean) {
  const shouldResize = !isPDF  // Don't resize PDFs
  // ...
}
```

### 1.3 Fix Stale Closure Issue for docURI

**Problem:** The `docURI` state variable was being accessed in async functions with a stale closure value (empty string), causing the PDF upload to fail silently.

**Solution:** Add a ref to always have access to the latest `docURI` value (same pattern used for `multipleImages`).

#### Step 1: Add the ref after the existing `multipleImagesRef`

```typescript
// Ref for docURI to avoid stale closure issues
const docURIRef = useRef<string>("")
useEffect(() => {
  docURIRef.current = docURI
}, [docURI])
```

#### Step 2: Update all async functions to use the ref

Replace `docURI` with `docURIRef.current` in these locations:

**In `processDataForAnuncio()`:**
```typescript
const currentDocURI = docURIRef.current
const hasDocument = currentDocURI.length > 0
```

**In `sendMessagesToMultipleStudents()`:**
```typescript
const currentDocURI = docURIRef.current
const hasDocument = currentDocURI.length > 0
// ...
} else if (currentDocURI.length > 0) {
  await saveAttachmentToParse(result, true)
}
```

**In `saveActividadToServer()`:**
```typescript
const currentDocURI = docURIRef.current
// ...
} else if (currentDocURI.length > 0) {
  saveAttachmentToParse(anuncioResult, true)
}
```

**In `uploadFileToAWSS3()`:**
```typescript
if (isPDF) {
  assetURL = docURIRef.current
}
```

### 1.4 Fix Stale Closure Issue for mimeType

**Problem:** The `mimeType` state variable was also being accessed with a stale closure value in `uploadFileToAWSS3`.

#### Step 1: Add the ref after `docURIRef`

```typescript
// Ref for mimeType to avoid stale closure issues
const mimeTypeRef = useRef<string>("")
useEffect(() => {
  mimeTypeRef.current = mimeType
}, [mimeType])
```

#### Step 2: Update `uploadFileToAWSS3()` to use the ref

```typescript
const uploadRes = await AWSService.uploadImageDataToAWS(
  anuncioPhotoObjectId,
  assetURL,
  mimeTypeRef.current,  // Use ref instead of state
  shouldResize
)
```

### 1.5 Fix Stale Closure Issue for media (Video Type)

**Problem:** The `media` state variable (which stores the media type like "vid" or "img") was being accessed with a stale closure value in `saveAttachmentToParse`.

#### Step 1: Add the ref after `mimeTypeRef`

```typescript
// Ref for media to avoid stale closure issues
const mediaRef = useRef<string>("")
useEffect(() => {
  mediaRef.current = media
}, [media])
```

#### Step 2: Update `saveAttachmentToParse()` to use the ref

```typescript
async function saveAttachmentToParse(anuncioObjectId: string, isPDF: boolean) {
  // Use ref to get latest media value (avoids stale closure issues)
  const currentMedia = mediaRef.current
  let mediaType = "JPG"
  if (currentMedia === "vid") {
    mediaType = "VID"
  }
  // ...
  if (currentMedia === "vid") {
    uploadVideo(anuncioPhotoResult.id)
  } else {
    uploadFileToAWSS3(anuncioPhotoResult.id, isPDF)
  }
}
```

### 1.6 Fix Stale Closure Issue for mediaURL (Video/Image URL)

**Problem:** The `mediaURL` state variable was being accessed with a stale closure value in multiple async functions, causing video and image uploads to fail silently.

#### Step 1: Add the ref after `mediaRef`

```typescript
// Ref for mediaURL to avoid stale closure issues
const mediaURLRef = useRef<string>("")
useEffect(() => {
  mediaURLRef.current = mediaURL
}, [mediaURL])
```

#### Step 2: Update all async functions to use the ref

**In `processDataForAnuncio()`:**
```typescript
const currentMediaURL = mediaURLRef.current
const hasSingleMedia = currentMediaURL.length > 0
```

**In `sendMessagesToMultipleStudents()`:**
```typescript
const currentMediaURL = mediaURLRef.current
const hasSingleMedia = currentMediaURL.length > 0
// ...
} else if (currentMediaURL.length > 0) {
  await saveAttachmentToParse(result, false)
}
```

**In `saveActividadToServer()`:**
```typescript
const currentMediaURL = mediaURLRef.current
// ...
} else if (currentMediaURL.length > 0) {
  saveAttachmentToParse(anuncioResult, false)
}
```

**In `uploadFileToAWSS3()`:**
```typescript
// Use ref to get latest mediaURL value (avoids stale closure issues)
let assetURL = mediaURLRef.current
if (isPDF) {
  assetURL = docURIRef.current
}
```

**In `uploadVideo()`:**
```typescript
// Use ref to get latest mediaURL value (avoids stale closure issues)
const videoUri = mediaURLRef.current
```

---

## 2. MensajeDetailScreen.tsx - PDF Display & ID Fix

### 2.1 Fix anuncioObjId extraction

**Problem:** The anuncio object ID was being read as `anuncioObj.id` but the actual property is `objectId`, causing attachments to not be fetched.

**Location:** Derived values from params

#### Before:
```typescript
const anuncioObjId = anuncioObj.id
```

#### After:
```typescript
const anuncioObjId = anuncioObj.id ?? anuncioObj.objectId
```

### 2.2 Add derived values for attachment type detection

**Location:** After the existing derived values

```typescript
// Derived values
const hasMultipleAttachments = attachmentsData.length > 1
const hasSingleAttachment = attachmentsData.length === 1
const firstAttachment = attachmentsData[0]
const firstThumbnailUrl = firstAttachment?.thumbnailUrl ?? ""
const isPdfAttachment = firstAttachment?.tipo === "PDF"
const isVideoAttachment = firstAttachment?.tipo === "VID"
```

### 2.3 Add PDF document thumbnail in header area

**Location:** Inside the `twoColumnContainer`, after the image thumbnail section

```tsx
{/* Single image thumbnail on the right (backward compatible) */}
{hasSingleAttachment && firstThumbnailUrl !== "" && !isPdfAttachment ? (
  <Pressable
    style={styles.imageColumn}
    onPress={() => openAttachmentBtnPressed(firstAttachment)}
  >
    <Image
      source={{ uri: firstThumbnailUrl }}
      style={styles.thumbnail}
      resizeMode="cover"
    />
    <Text style={styles.attachmentSubtext}>
      Abrir adjunto
    </Text>
  </Pressable>
) : null}

{/* PDF document thumbnail on the right */}
{hasSingleAttachment && isPdfAttachment ? (
  <Pressable
    style={styles.imageColumn}
    onPress={() => openAttachmentBtnPressed(firstAttachment)}
  >
    <View style={styles.pdfDocumentShape}>
      <MaterialCommunityIcons name="file-pdf-box" size={36} color={colors.palette.bittersweetLight} />
    </View>
    <Text style={styles.attachmentSubtext}>
      Abrir adjunto
    </Text>
  </Pressable>
) : null}
```

### 2.4 Add styles for PDF document shape

```typescript
pdfDocumentShape: {
  width: 80,
  height: 100,
  backgroundColor: 'white',
  borderRadius: 8,
  borderCurve: 'continuous',
  alignItems: 'center',
  justifyContent: 'center',
  marginBottom: 4,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.1,
  shadowRadius: 4,
  elevation: 3,
},
```

### 2.5 Add Video attachment thumbnail in header area

**Location:** Inside the `twoColumnContainer`, after the PDF thumbnail section

```tsx
{/* Video attachment thumbnail on the right */}
{hasSingleAttachment && isVideoAttachment ? (
  <Pressable
    style={styles.imageColumn}
    onPress={() => openAttachmentBtnPressed(firstAttachment)}
  >
    <View style={styles.videoDocumentShape}>
      <MaterialCommunityIcons name="play-circle" size={40} color={colors.palette.bluejeansLight} />
    </View>
    <Text style={styles.attachmentSubtext}>
      Abrir video
    </Text>
  </Pressable>
) : null}
```

### 2.6 Add styles for Video document shape

```typescript
videoDocumentShape: {
  width: 80,
  height: 80,
  backgroundColor: 'white',
  borderRadius: 40,
  borderCurve: 'continuous',
  alignItems: 'center',
  justifyContent: 'center',
  marginBottom: 4,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.1,
  shadowRadius: 4,
  elevation: 3,
},
```

### 2.7 Update fallback button condition

**Problem:** The fallback button was showing for video attachments even though we now have a dedicated video indicator.

**Location:** Single attachment without thumbnail section

#### Before:
```tsx
{hasSingleAttachment && firstThumbnailUrl === "" && !isPdfAttachment ? (
```

#### After:
```tsx
{hasSingleAttachment && firstThumbnailUrl === "" && !isPdfAttachment && !isVideoAttachment ? (
```

---

## 3. AttachmentDetailScreen.tsx - Full Refactoring

### 3.1 Fix PDF Viewing for New Bucket

**Problem:** When `isNewBucket` is `true`, the code did an early return without properly handling PDFs. On Android, WebView cannot display PDFs directly.

**Solution:** Handle all file types properly for new bucket, using Google Docs viewer for PDFs on Android.

```typescript
// NEW Bucket
if (item.isNewBucket) {
  const baseURL = await getSignedObjectUrl(item.objectId)
  urlString = baseURL

  if (item.tipo === "PDF") {
    mode = 'webview'
    // Android WebView can't display PDFs directly, use Google Docs viewer
    if (Platform.OS === "android") {
      urlString = GOOGLE_DOCS_VIEWER_URL + encodeURIComponent(baseURL)
    }
  } else if (item.tipo === "VID") {
    mode = 'video'
  } else {
    mode = 'webview'
  }

  setAssetURL(urlString)
  setDisplayMode(mode)
  return
}
```

### 3.2 React Native Best Practices Refactoring

Apply these changes based on React Native best practices:

#### Use Pressable instead of TouchableOpacity
```typescript
// Before
import { TouchableOpacity } from "react-native"
<TouchableOpacity onPress={backBtnPressed}>

// After
import { Pressable } from "react-native"
<Pressable onPress={backBtnPressed}>
```

#### Use expo-image instead of React Native Image
```typescript
// Before
import { Image } from "react-native"
<Image source={{ uri: assetURL }} style={$imageStyle} resizeMode="contain" />

// After
import { Image } from 'expo-image'
<Image
  source={{ uri: assetURL }}
  style={$imageStyle}
  contentFit="contain"
  transition={200}
/>
```

#### Use ternary with null instead of && for conditional rendering
```typescript
// Before
{isLoading && <ActivityIndicator />}

// After
{isLoading ? <ActivityIndicator /> : null}
```

#### Add borderCurve: 'continuous' with borderRadius
```typescript
const $imageStyle: ImageStyle = {
  borderRadius: 8,
  borderCurve: 'continuous',
  // ...
}
```

#### Derive fileType from route params instead of state
```typescript
// Before
const [fileType, setFileType] = useState("")

// After
const fileType = useMemo(() => {
  const item = route.params as RouteParams
  if (item.tipo === "PDF") return "PDF"
  if (item.tipo === "VID") return "VID"
  return "JPG"
}, [route.params])
```

### 3.3 Fix Guardar Button - Pass URI Directly

**Problem:** The share/save functions used `localURI` from state, but `setLocalURI(uri)` is async - the state won't be updated when the function is called.

**Solution:** Pass the URI directly through the function chain instead of relying on state.

#### Before:
```typescript
const sharePhotoOption = useCallback(() => {
  Share.shareAsync(localURI)
}, [localURI])

const displayShareOrSaveToLibrary = useCallback(() => {
  // Uses localURI from closure - STALE!
  options.push({ text: 'Compartir', onPress: sharePhotoOption })
}, [sharePhotoOption])

FileSystem.downloadAsync(assetURL, fileDirectory).then(({ uri }) => {
  setLocalURI(uri)
  displayShareOrSaveToLibrary()  // localURI not updated yet!
})
```

#### After:
```typescript
const sharePhotoOption = useCallback((uri: string) => {
  Share.shareAsync(uri)
}, [])

const displayShareOrSaveToLibrary = useCallback((uri: string, type: string) => {
  options.push({ text: 'Compartir', onPress: () => sharePhotoOption(uri) })
}, [sharePhotoOption])

FileSystem.downloadAsync(assetURL, fileDirectory).then(({ uri }) => {
  setLocalURI(uri)
  displayShareOrSaveToLibrary(uri, fileType)  // Pass URI directly
})
```

### 3.4 Fix File Type Handling for PDFs

**Problem:** PDFs were showing the "Save to photo library" option, which doesn't make sense for documents.

**Solution:** For PDFs, show the share sheet directly. For images/videos, show the alert with options.

```typescript
const displayShareOrSaveToLibrary = useCallback((uri: string, type: string) => {
  // For PDFs, just show share sheet directly (can't save to photo library)
  if (type === "PDF") {
    sharePhotoOption(uri)
    return
  }

  const options: AlertButton[] = []

  if (Platform.OS === 'ios') {
    options.push({ text: 'Guardar al carrete', onPress: () => savePhotoToLibrary(uri), style: 'default' })
  }
  options.push({ text: 'Compartir', onPress: () => sharePhotoOption(uri), style: 'default' })
  options.push({ text: 'Cancelar', onPress: () => {}, style: 'cancel' })

  Alert.alert(
    "Selecciona una opción",
    type === "VID" ? "Comparte o guarda el video" : "Comparte o guarda la foto",
    options,
    { cancelable: false },
  )
}, [savePhotoToLibrary, sharePhotoOption])
```

### 3.5 Use Legacy FileSystem Import

**Problem:** `FileSystem.downloadAsync` is deprecated in newer expo-file-system versions.

**Solution:** Import from the legacy path to suppress the warning.

```typescript
// Before
import * as FileSystem from 'expo-file-system'

// After
import * as FileSystem from 'expo-file-system/legacy'
```

---

## Summary Table

| File | Issue | Fix |
|------|-------|-----|
| `CrearActividadScreen.tsx` | PDF not marked as attachment | Add `hasDocument = docURI.length > 0` to `awsAttachment` |
| `CrearActividadScreen.tsx` | PDF upload fails (resize attempted) | Set `shouldResize = !isPDF` in `uploadFileToAWSS3()` |
| `CrearActividadScreen.tsx` | Stale closure - docURI is empty | Add `docURIRef` and use `docURIRef.current` in async functions |
| `CrearActividadScreen.tsx` | Stale closure - mimeType is empty | Add `mimeTypeRef` and use `mimeTypeRef.current` in `uploadFileToAWSS3()` |
| `CrearActividadScreen.tsx` | Stale closure - media is empty | Add `mediaRef` and use `mediaRef.current` in `saveAttachmentToParse()` |
| `CrearActividadScreen.tsx` | Stale closure - mediaURL is empty | Add `mediaURLRef` and use `mediaURLRef.current` in all async functions |
| `MensajeDetailScreen.tsx` | anuncioObjId is undefined | Use `anuncioObj.id ?? anuncioObj.objectId` |
| `MensajeDetailScreen.tsx` | PDF not visible in message | Add PDF document shape in header area |
| `MensajeDetailScreen.tsx` | Video not visible in message | Add video play circle indicator in header area |
| `AttachmentDetailScreen.tsx` | PDF doesn't open (Android) | Use Google Docs viewer with `encodeURIComponent()` for new bucket |
| `AttachmentDetailScreen.tsx` | TouchableOpacity deprecated | Replace with Pressable |
| `AttachmentDetailScreen.tsx` | React Native Image not optimized | Replace with expo-image |
| `AttachmentDetailScreen.tsx` | Guardar button not working | Pass URI directly instead of relying on state |
| `AttachmentDetailScreen.tsx` | PDF shows "save to library" option | Show share sheet directly for PDFs |
| `AttachmentDetailScreen.tsx` | FileSystem.downloadAsync deprecated | Import from `expo-file-system/legacy` |

---

## Testing Checklist

### PDF Testing
- [ ] Create a new message with PDF attachment
- [ ] Verify PDF uploads successfully (no resize error)
- [ ] Open message and verify PDF document icon is visible in header
- [ ] Tap PDF icon and verify it opens in viewer
- [ ] Tap "Guardar" for PDF and verify share sheet appears directly

### Video Testing
- [ ] Create a new message with video attachment
- [ ] Verify video uploads successfully with progress indicator
- [ ] Open message and verify video plays correctly
- [ ] Tap "Guardar" for video and verify save/share options appear

### Image Testing
- [ ] Create a new message with single image attachment
- [ ] Create a new message with multiple images
- [ ] Verify images upload and resize correctly
- [ ] Tap "Guardar" for image and verify alert with options appears
- [ ] Test save to photo library for images (iOS)

### General Testing
- [ ] Test share functionality for all file types
- [ ] Test on both iOS and Android
- [ ] Test sending messages to multiple students with attachments
