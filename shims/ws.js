// Minimal shim to use global WebSocket in React Native for libraries expecting 'ws'
module.exports = global.WebSocket || global.window?.WebSocket || require('react-native-web/dist/cjs/vendor/websocket/WebSocket');

















