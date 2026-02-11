// we always make sure 'react-native' gets included first
import '@testing-library/jest-native/extend-expect';

// Mock React Native
jest.mock('react-native', () => {
  return {
    Alert: {
      alert: jest.fn(),
    },
    Image: {
      resolveAssetSource: jest.fn(() => ({ uri: 'test-image.jpg' })),
      getSize: jest.fn((uri, success) => success(100, 100)),
    },
    Animated: {
      timing: jest.fn(() => ({
        start: jest.fn(cb => cb && cb({ finished: true })),
      })),
      spring: jest.fn(() => ({
        start: jest.fn(cb => cb && cb({ finished: true })),
      })),
      Value: jest.fn(() => ({
        setValue: jest.fn(),
        interpolate: jest.fn(() => ({
          interpolate: jest.fn(),
        })),
      })),
    },
    // Add basic components that might be used in tests
    View: 'View',
    Text: 'Text',
    TextInput: 'TextInput',
    ScrollView: 'ScrollView',
    TouchableOpacity: 'TouchableOpacity',
    ActivityIndicator: 'ActivityIndicator',
  };
});

// Mock Expo modules
jest.mock('expo-modules-core', () => ({}));
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: { Heavy: 'heavy' }
}));
jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: jest.fn(),
}));

// Mock additional components used in the app
jest.mock('@react-native-segmented-control/segmented-control', () => ({
  default: 'SegmentedControl'
}));
jest.mock('@react-native-picker/picker', () => ({
  Picker: 'Picker'
}));
jest.mock('@react-native-community/datetimepicker', () => 'DateTimePicker');

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock i18n
jest.mock('i18n-js', () => ({
  currentLocale: () => 'en',
  t: (key: string, params?: Record<string, string>) => {
    return `${key} ${JSON.stringify(params || {})}`;
  },
}));

// Set up global test flag
declare global {
  namespace NodeJS {
    interface Global {
      __TEST__: boolean;
    }
  }
}

(global as any).__TEST__ = true;

// Set fake timers
jest.useFakeTimers();
