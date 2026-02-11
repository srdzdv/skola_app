// Learn more https://docs.expo.io/guides/customizing-metro
const path = require('path')
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

config.transformer.getTransformOptions = async () => ({
  transform: {
    experimentalImportSupport: false,
    inlineRequires: true,
  },
});

// Custom resolver to handle Node.js modules for React Native
const originalResolver = config.resolver.resolverMainFields;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Block problematic WebSocket modules entirely
  if (moduleName === 'ws' || moduleName.includes('node_modules/ws') || 
      moduleName.includes('parse/node_modules/ws')) {
    return {
      type: 'empty',
    };
  }
  
  // Handle specific Node.js modules
  const nodeModuleMappings = {
    'net': false,
    'tls': null,
    'crypto': 'react-native-crypto',
    'stream': 'stream-browserify',
    'buffer': 'buffer',
    'process': 'process/browser',
    'zlib': 'browserify-zlib',
    'util': 'util',
    'assert': 'assert',
    'events': 'events',
    'vm': 'vm-browserify',
    'os': 'os-browserify',
    'http': '@tradle/react-native-http',
    'https': 'https-browserify',
    'tty': 'tty-browserify',
    'url': 'url',
  };
  
  if (nodeModuleMappings.hasOwnProperty(moduleName)) {
    const replacement = nodeModuleMappings[moduleName];
    if (replacement === null) {
      return { type: 'empty' };
    }
    if (replacement) {
      return context.resolveRequest(context, replacement, platform);
    }
  }
  
  // Use default resolver for everything else
  return context.resolveRequest(context, moduleName, platform);
};

// Add Node.js polyfills for React Native
config.resolver.alias = {
  ...config.resolver.alias,
  'crypto': 'react-native-crypto',
  'stream': 'stream-browserify',
  'buffer': 'buffer',
  'process': 'process/browser',
  'zlib': 'browserify-zlib',
  'util': 'util',
  'assert': 'assert',
  'events': 'events',
  'vm': 'vm-browserify',
  'os': 'os-browserify',
  'http': '@tradle/react-native-http',
  'https': 'https-browserify',
      'net': null,
  'tls': false,
  'tty': 'tty-browserify',
  'url': 'url',
  '_stream_readable': 'readable-stream/readable',
  '_stream_writable': 'readable-stream/writable',
  '_stream_duplex': 'readable-stream/duplex',
  '_stream_transform': 'readable-stream/transform',
  '_stream_passthrough': 'readable-stream/passthrough',
  // Block WebSocket entirely
  'ws': false,
};

// Ensure resolver can find the polyfills
config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];
config.resolver.platforms = ['ios', 'android', 'web', 'native'];

// Additional resolver configuration for Node.js modules
config.resolver.sourceExts = [...config.resolver.sourceExts, 'cjs'];
config.resolver.nodeModulesPaths = [
  path.resolve(__dirname, 'node_modules'),
  path.resolve(__dirname, '../node_modules'),
];

module.exports = config;
