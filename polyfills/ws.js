// WebSocket polyfill for React Native
// This prevents the ws library from trying to use Node.js modules

module.exports = class WebSocketPolyfill {
  constructor() {
    console.warn('WebSocket functionality disabled in React Native build');
  }
  
  close() {}
  send() {}
  addEventListener() {}
  removeEventListener() {}
};

module.exports.WebSocket = module.exports;
module.exports.default = module.exports;
