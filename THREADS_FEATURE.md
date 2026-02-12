# Conversation Threads Feature — Implementation Guide for Parents App

This document describes the conversation threads feature added to the school admin app (`skola_app`) so that it can be implemented in the parents codebase.

---

## Overview

Messages (anuncios) can now be grouped into **conversation threads**. A thread is identified by a shared `threadId` field on the `anuncio` Parse class. The first message in a thread uses its own `objectId` as the `threadId`; all subsequent replies share that same value.

### Key Concepts

| Concept | Description |
|---------|-------------|
| **Thread root** | The first message in a conversation. Its `threadId === objectId`. |
| **Thread reply** | A follow-up message. Its `threadId` points to the root message's `objectId`. |
| **Standalone message** | A legacy message with no `threadId` field set (backwards compatible). |

---

## Data Model Changes

### `anuncio` Parse Class — New Field

| Field | Type | Description |
|-------|------|-------------|
| `threadId` | `String` (optional) | Groups messages into a thread. For root messages: same as `objectId`. For replies: the root's `objectId`. If absent, the message is standalone (not part of any thread). |

No new Parse classes are needed. The feature works entirely through the existing `anuncio` table.

---

## API Functions to Implement

All functions live in `ParseAPI.ts`. Below are the three core functions the parents app needs.

### 1. `fetchThreadsForComunicacion(escuelaId: string)`

Used on the **inbox/received messages** screen. Returns a mixed list of threads and standalone messages, sorted by most recent activity.

**Query logic:**

```
1. Query all approved anuncios WHERE threadId EXISTS
   - Filter by: autor.escuela = escuelaObj, autor.status = 0, autor.usertype = 2
   - aprobado = true, actionTaken != true
   - Include: autor, tipo, grupos, estudiante
   - Descending createdAt, limit 200

2. Group results by threadId into a map:
   threadMap[threadId] = {
     root:       oldest anuncio in the group,
     latest:     newest anuncio in the group,
     replyCount: total messages in the thread
   }

3. Also query anuncios WHERE threadId DOES NOT EXIST (standalone messages)
   - Same filters as above, limit 35

4. Build a combined array of thread entries + standalone entries
5. Sort combined array by most recent date (latest message date for threads, createdAt for standalone)
```

**Return shape per entry:**

```typescript
{
  rootAnuncio:   Parse.Object,  // The first message in the thread
  latestAnuncio: Parse.Object,  // The most recent message (for preview text)
  replyCount:    number,        // Total messages in thread (0 for standalone)
  threadId:      string | null, // Thread identifier (null for standalone)
  isThread:      boolean,       // true if this is a threaded conversation
  sortDate:      Date           // Used for sorting the combined list
}
```

### 2. `fetchThreadMessages(threadId: string)`

Used on the **thread detail screen** to load all messages in a conversation.

**Query logic:**

```
1. Query anuncio WHERE threadId = threadId
   - Include: autor, tipo, grupos, estudiante
   - Ascending createdAt (chronological order, oldest first)
   - Limit 100

2. Also fetch AnuncioPhoto records for all messages in the thread:
   - Query AnuncioPhoto WHERE anuncio IN [results from step 1]
   - Limit 200
```

**Return shape:**

```typescript
{
  messages: Parse.Object[],  // Anuncios sorted oldest → newest
  photos:   Parse.Object[]   // All AnuncioPhoto records for those anuncios
}
```

### 3. `saveAnuncioWithThread(params, grupo, estudianteId, nivelGrupos, threadId)`

Used to **send a reply** within a thread (or create a new thread).

**Logic:**

```
1. Save a new anuncio using the existing saveAnuncioObject() function
2. Fetch the newly created anuncio by its objectId
3. If threadId is provided (replying to existing thread):
     → set anuncio.threadId = threadId
   Else (creating a new thread):
     → set anuncio.threadId = anuncio.objectId (self-referencing)
4. Save the anuncio again
5. Return the anuncio objectId
```

**Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `params` | `Record<string, any>` | Standard anuncio fields: `aprobado`, `descripcion`, `autor`, `awsAttachment`, `materia`, `sentFrom` |
| `grupo` | `any \| null` | Grupo object if replying to a grupo-targeted thread |
| `estudianteId` | `string \| null` | Estudiante objectId if replying to a student-specific thread |
| `nivelGrupos` | `any[] \| null` | Array of grupo objects for nivel-wide messages |
| `threadId` | `string \| null` | Existing thread ID to reply to, or null to start a new thread |

---

## Screen Implementation

### Inbox List (ComunicacionScreen equivalent)

On the "Recibidos" tab:

1. Call `fetchThreadsForComunicacion(escuelaId)`.
2. For each entry, display:
   - **Date**: `moment(entry.sortDate).format("dd DD/MMM")`
   - **Author**: from `rootAnuncio.autor`
   - **Preview text**: from `latestAnuncio.descripcion` (truncated to ~70 chars)
   - **Reply badge**: if `isThread && replyCount > 1`, show a badge with the reply count
3. On tap:
   - If `isThread === true`: navigate to **ThreadDetail** screen with params:
     ```typescript
     {
       threadId:     entry.threadId,
       threadSubject: rootAnuncio.descripcion (truncated to ~40 chars),
       estudianteId: rootAnuncio.estudiante?.id || null,
       grupoData:    rootAnuncio.grupos?.[0] || null,
     }
     ```
   - If `isThread === false`: navigate to the existing single message detail screen (no changes needed).

### Thread Detail Screen (new screen)

A chat-style view showing all messages in a thread with an inline reply composer.

**Navigation params:**

```typescript
{
  threadId:      string,
  threadSubject: string,             // Shown as the header title
  estudianteId:  string | null,
  grupoData:     any | null,
  reloadTable:   (msgType: number) => void  // Callback to refresh the parent list
}
```

**Loading messages:**

1. Call `fetchThreadMessages(threadId)`.
2. Get the current user via `getCurrentUserObj()`.
3. For each message, build a view model:
   ```typescript
   {
     id:             string,
     descripcion:    string,
     autorName:      string,   // autor.parentesco for parents, autor.username otherwise
     autorId:        string,
     timestamp:      string,   // moment(createdAt).format("ddd DD/MMM HH:mm")
     isCurrentUser:  boolean,  // autorObj.id === currentUser.id
     hasAttachment:  boolean,
     attachmentCount: number,  // Count AnuncioPhotos matching this anuncio ID
   }
   ```

**Message display:**

- Current user's messages: **right-aligned** blue bubble, white text
- Other users' messages: **left-aligned** white bubble, dark text, with author name label above
- Each bubble shows: message text, timestamp, attachment indicator (if any)
- Tapping a bubble navigates to the existing `mensajeDetail` screen for that individual anuncio

**Info bar:**

At the top of the message list, show a bar with:
- The student name or grupo destination (from the first message)
- Total message count (e.g., "5 mensajes")

**Reply composer:**

- A `TextInput` with placeholder "Responder en la conversación..."
- A send button (paper-plane icon) that:
  1. Calls `saveAnuncioWithThread()` with:
     - `params.aprobado`: `true` for parents (usertype 2)
     - `params.descripcion`: the reply text
     - `params.autor`: current user
     - `params.sentFrom`: `"skolaRN_" + Platform.OS`
     - `threadId`: the current thread's `threadId`
     - `estudianteId` and `grupoData` from navigation params
  2. Triggers the appropriate cloud function notification:
     - For parents (usertype 2): `"adminApprovedAnuncio"` with `{ anuncioObjectId, escuelaObjId }`
  3. Reloads the thread messages
  4. Scrolls the FlatList to the bottom

**Keyboard handling:**

- Wrap in `KeyboardAvoidingView` with:
  - `behavior="padding"` on iOS
  - `behavior="height"` on Android
  - `keyboardVerticalOffset={90}` on iOS

---

## Navigation Setup

Register the new screen in your navigator:

```typescript
// In your stack param list type:
ThreadDetail: {
  threadId: string
  threadSubject?: string
  estudianteId?: string | null
  grupoData?: any
  reloadTable?: (msgType: number) => void
}

// In your Stack.Navigator:
<Stack.Screen name="ThreadDetail" component={ThreadDetailScreen} />
```

The `ThreadDetail` screen should set its own header title dynamically:

```typescript
useEffect(() => {
  navigation.setOptions({
    headerTitle: threadSubject || "Conversación",
    headerBackTitleVisible: false,
  })
}, [])
```

---

## Backwards Compatibility

- Messages without a `threadId` field continue to work exactly as before.
- `fetchThreadsForComunicacion` fetches **both** threaded and non-threaded messages and merges them into a single sorted list.
- The inbox list cell tap handler checks `isThread` to decide which detail screen to open.
- No migration is needed for existing data.

---

## Cloud Functions Used

| Function | When Called | Params |
|----------|-----------|--------|
| `adminApprovedAnuncio` | After a parent sends a reply (triggers push notification to school) | `{ anuncioObjectId, escuelaObjId }` |

---

## Summary of Files Changed (Admin App)

| File | What Changed |
|------|-------------|
| `ParseAPI.ts` | Added `saveAnuncioWithThread`, `fetchThreadsForComunicacion`, `fetchThreadMessages`, `setAnuncioThreadId` |
| `ComunicacionScreen.tsx` | Inbox now calls `fetchThreadsForComunicacion`, displays thread badges, routes taps to `ThreadDetail` |
| `ThreadDetailScreen.tsx` | **New screen** — chat-style thread view with reply composer |
| `AppNavigator.tsx` | Added `ThreadDetail` route and typed params |
| `CrearActividadScreen.tsx` | New messages created via the compose flow now call `saveAnuncioWithThread` (sets threadId on creation) |
| `screens/index.ts` | Exports `ThreadDetailScreen` |
