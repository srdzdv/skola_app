# Parse WebSocket Fix for React Native

## Problem
Parse SDK is trying to import Node.js modules (net, tls, etc.) through the ws (WebSocket) library, which don't exist in React Native.

## Solutions Applied

### 1. Metro Configuration (`metro.config.js`)
- Added comprehensive Node.js polyfills
- Disabled ws module: `'ws': false`
- Configured resolver to use React Native-compatible alternatives

### 2. Parse Configuration (`ParseInit.ts`)
- Disabled LiveQuery functionality: `Parse.LiveQuery = null`
- Prevented WebSocket connections: `Parse.liveQueryOpen = false`

### 3. Shim Setup (`shim.js` + `App.tsx`)
- Added crypto polyfills
- Imported shim at app entry point

## Alternative Solutions (if above doesn't work)

### Option A: Use Parse HTTP-only mode
```javascript
// In ParseInit.ts, add after Parse.initialize():
Parse.serverURL = parseInitData.serverURL;
Parse.liveQueryServerURL = null; // Disable LiveQuery entirely
```

### Option B: Install specific Parse version without WebSocket
```bash
npm install parse@4.2.0  # Older version without ws dependency
```

### Option C: Use custom Parse build
Create a custom Parse configuration that excludes WebSocket functionality entirely.

### Option D: Environment-specific imports
```javascript
// Only import Parse features needed for React Native
const Parse = require('parse/react-native.js');
// Explicitly avoid any server-side Parse features
```

## Verification
After applying fixes, test with:
```bash
npx expo run:android --no-build-cache
```
