# Multiple Photos in Messages - Implementation Guide

This document explains how to implement the feature that allows users to view multiple images attached to a single message (anuncio).

## Overview

Messages in Skola can now have multiple image attachments. This guide covers how to fetch and display these images in the Parents app.

---

## Database Structure

Each message (anuncio) can have multiple `AnuncioPhoto` records associated with it:

```
anuncio (message)
  └── AnuncioPhoto (1)
  └── AnuncioPhoto (2)
  └── AnuncioPhoto (3)
  ...
```

### AnuncioPhoto Fields

| Field | Type | Description |
|-------|------|-------------|
| `objectId` | String | Unique identifier (used as S3 key) |
| `anuncio` | Pointer | Reference to parent anuncio |
| `TipoArchivo` | String | File type: "JPG", "VID", or "PDF" |
| `newS3Bucket` | Boolean | If true, file is in new S3 bucket with thumbnails |
| `aws` | Boolean | If true, file is stored in AWS S3 |

---

## API Changes

### New Parse Cloud Function

A new function `fetchAnuncioPhotos` fetches ALL photos for a message (instead of just the first one):

```javascript
// Parse Query - Fetch all photos for an anuncio
const Anuncio = Parse.Object.extend("anuncio")
const innerQuery = new Parse.Query(Anuncio)
innerQuery.equalTo("objectId", anuncioId)

const AnuncioPhoto = Parse.Object.extend("AnuncioPhoto")
const query = new Parse.Query(AnuncioPhoto)
query.matchesQuery("anuncio", innerQuery)
query.ascending("createdAt")  // Order by creation date

const results = await query.find()
return results  // Returns array of AnuncioPhoto objects
```

### Response Format

The function returns an array of `AnuncioPhoto` objects:

```json
[
  {
    "objectId": "abc123xyz1",
    "TipoArchivo": "JPG",
    "newS3Bucket": true,
    "createdAt": "2024-01-15T10:30:00Z"
  },
  {
    "objectId": "abc123xyz2",
    "TipoArchivo": "JPG",
    "newS3Bucket": true,
    "createdAt": "2024-01-15T10:30:01Z"
  }
]
```

---

## Implementation Steps

### Step 1: Define Data Structure

Create a model to hold attachment data:

```swift
// Swift (iOS)
struct AttachmentData {
    let objectId: String
    let tipo: String
    let isNewBucket: Bool
    var thumbnailUrl: String?
}
```

```kotlin
// Kotlin (Android)
data class AttachmentData(
    val objectId: String,
    val tipo: String,
    val isNewBucket: Boolean,
    var thumbnailUrl: String? = null
)
```

### Step 2: Fetch All Photos

Replace the single photo fetch with a query that returns all photos:

```swift
// Swift (iOS)
func fetchAnuncioPhotos(anuncioId: String) async throws -> [AttachmentData] {
    let innerQuery = PFQuery(className: "anuncio")
    innerQuery.whereKey("objectId", equalTo: anuncioId)

    let query = PFQuery(className: "AnuncioPhoto")
    query.whereKey("anuncio", matchesQuery: innerQuery)
    query.order(byAscending: "createdAt")

    let results = try await query.findObjectsInBackground()

    return results.map { photo in
        AttachmentData(
            objectId: photo.objectId ?? "",
            tipo: photo["TipoArchivo"] as? String ?? "",
            isNewBucket: photo["newS3Bucket"] as? Bool ?? false
        )
    }
}
```

```kotlin
// Kotlin (Android)
suspend fun fetchAnuncioPhotos(anuncioId: String): List<AttachmentData> {
    val innerQuery = ParseQuery.getQuery<ParseObject>("anuncio")
    innerQuery.whereEqualTo("objectId", anuncioId)

    val query = ParseQuery.getQuery<ParseObject>("AnuncioPhoto")
    query.whereMatchesQuery("anuncio", innerQuery)
    query.orderByAscending("createdAt")

    val results = query.find()

    return results.map { photo ->
        AttachmentData(
            objectId = photo.objectId,
            tipo = photo.getString("TipoArchivo") ?: "",
            isNewBucket = photo.getBoolean("newS3Bucket")
        )
    }
}
```

### Step 3: Fetch Thumbnails

For each photo with `newS3Bucket = true`, fetch the resized thumbnail:

```swift
// Swift (iOS)
func fetchThumbnailUrl(objectId: String) async -> String? {
    let resizedObjectId = "resized-\(objectId)"

    let params = ["objectKey": resizedObjectId]
    let signedUrl = try? await PFCloud.callFunction(
        "getAWSS3SignedUrl",
        withParameters: params
    ) as? String

    return signedUrl
}
```

```kotlin
// Kotlin (Android)
suspend fun fetchThumbnailUrl(objectId: String): String? {
    val resizedObjectId = "resized-$objectId"

    val params = hashMapOf<String, Any>("objectKey" to resizedObjectId)
    return try {
        ParseCloud.callFunction<String>("getAWSS3SignedUrl", params)
    } catch (e: Exception) {
        null
    }
}
```

### Step 4: Complete Fetch Flow

Combine the above to fetch all attachments with thumbnails:

```swift
// Swift (iOS)
func loadAttachments(for anuncioId: String) async {
    let photos = try? await fetchAnuncioPhotos(anuncioId: anuncioId)

    guard let photos = photos, !photos.isEmpty else { return }

    var attachments: [AttachmentData] = []

    for var photo in photos {
        if photo.isNewBucket {
            photo.thumbnailUrl = await fetchThumbnailUrl(objectId: photo.objectId)
        }
        attachments.append(photo)
    }

    // Update UI with attachments array
    self.attachmentsData = attachments
}
```

---

## UI Implementation

### Display Logic

```
if attachments.count == 0:
    // No attachments - show nothing

if attachments.count == 1:
    // Single attachment - show thumbnail on the right side of header
    // (existing behavior)

if attachments.count > 1:
    // Multiple attachments - show horizontal scrollable gallery
```

### Single Attachment (Existing Behavior)

Display a single thumbnail (100x100) on the right side of the message header:

```
┌─────────────────────────────────────┐
│ Autor -> Destino        ┌────────┐  │
│ Fecha                   │ Image  │  │
│ Tipo                    │ 100x100│  │
│ Estado                  └────────┘  │
│                         Abrir adj.  │
└─────────────────────────────────────┘
```

### Multiple Attachments (New Behavior)

Display a horizontal scrollable gallery below the header:

```
┌─────────────────────────────────────┐
│ Autor -> Destino                    │
│ Fecha                               │
│ Tipo                                │
│ Estado                              │
├─────────────────────────────────────┤
│ 3 imagenes adjuntas                 │
│ ┌──────┐ ┌──────┐ ┌──────┐         │
│ │ Img  │ │ Img  │ │ Img  │  -->    │
│ │  1   │ │  2   │ │  3   │         │
│ └──────┘ └──────┘ └──────┘         │
└─────────────────────────────────────┘
```

### UI Components

#### Thumbnail Grid Item (90x90)

```swift
// Swift (iOS) - SwiftUI
struct ImageThumbnail: View {
    let thumbnailUrl: String
    let index: Int
    let total: Int
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            ZStack(alignment: .bottomTrailing) {
                AsyncImage(url: URL(string: thumbnailUrl)) { image in
                    image
                        .resizable()
                        .aspectRatio(contentMode: .fill)
                } placeholder: {
                    Color.gray.opacity(0.3)
                }
                .frame(width: 90, height: 90)
                .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))

                if total > 1 {
                    Text("\(index + 1)")
                        .font(.caption2)
                        .fontWeight(.bold)
                        .foregroundColor(.white)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(Color.black.opacity(0.6))
                        .clipShape(Capsule())
                        .padding(4)
                }
            }
        }
    }
}
```

#### Horizontal Gallery Container

```swift
// Swift (iOS) - SwiftUI
struct MultipleImagesGallery: View {
    let attachments: [AttachmentData]
    let onImageTap: (AttachmentData) -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("\(attachments.count) imagenes adjuntas")
                .font(.subheadline)
                .fontWeight(.semibold)
                .foregroundColor(.white)

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 10) {
                    ForEach(Array(attachments.enumerated()), id: \.element.objectId) { index, attachment in
                        if let thumbnailUrl = attachment.thumbnailUrl {
                            ImageThumbnail(
                                thumbnailUrl: thumbnailUrl,
                                index: index,
                                total: attachments.count,
                                onTap: { onImageTap(attachment) }
                            )
                        } else {
                            // Fallback for images without thumbnail
                            NoThumbnailButton(
                                index: index,
                                onTap: { onImageTap(attachment) }
                            )
                        }
                    }
                }
            }
        }
        .padding(12)
        .background(Color.bluejeansDark)
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
    }
}
```

---

## Opening Attachments

When a user taps on a thumbnail, navigate to the attachment detail screen with the attachment data:

```swift
// Swift (iOS)
func openAttachment(_ attachment: AttachmentData) {
    let detailVC = AttachmentDetailViewController()
    detailVC.objectId = attachment.objectId
    detailVC.tipo = attachment.tipo
    detailVC.isNewBucket = attachment.isNewBucket
    navigationController?.pushViewController(detailVC, animated: true)
}
```

The existing `AttachmentDetailScreen` handles displaying the full-size image, video, or PDF.

---

## Testing

### Test Cases

1. **No attachments**: Message displays without any attachment UI
2. **Single image**: Thumbnail appears on right side of header (existing behavior)
3. **Single PDF/Video**: "Abrir adjunto" button appears (no thumbnail)
4. **Multiple images (2-10)**: Horizontal gallery appears with all thumbnails
5. **Mixed attachments**: Gallery handles images, PDFs, and videos correctly

### Test Data

To test, create a message with multiple images using the admin app:
1. Go to "Crear Actividad"
2. Tap attachment icon
3. Select "Multiples Imagenes"
4. Choose 2-10 images
5. Send the message
6. Open the message in Parents app to verify display

---

## Migration Notes

- **Backward Compatible**: Messages with single attachments continue to work as before
- **No Database Changes**: Uses existing `AnuncioPhoto` table structure
- **No Breaking Changes**: Only the query method changes from `first()` to `find()`

---

## Performance Considerations

1. **Thumbnail Loading**: Thumbnails are loaded in sequence. Consider parallel loading for faster display.

2. **Image Caching**: Use image caching (SDWebImage for iOS, Glide/Coil for Android) to avoid re-fetching thumbnails.

3. **Lazy Loading**: For messages with many images, consider loading thumbnails as they scroll into view.

4. **Memory**: Thumbnails are small (resized images), but monitor memory usage with many attachments.

---

## Questions?

Contact the backend team for any questions about the Parse queries or AWS S3 signed URLs.
