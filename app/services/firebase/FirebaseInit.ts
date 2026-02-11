import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app'
import { getAuth, Auth } from 'firebase/auth'
import { getFirestore, Firestore } from 'firebase/firestore'
import AsyncStorage from '@react-native-async-storage/async-storage'

// Firebase configuration interface
interface FirebaseConfig {
  apiKey: string
  authDomain: string
  projectId: string
  storageBucket: string
  messagingSenderId: string
  appId: string
}

// Default Firebase configuration
// Replace these values with your actual Firebase project configuration
const defaultFirebaseConfig: FirebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "your-sender-id",
  appId: "your-app-id"
}

// Firebase instances
let firebaseApp: FirebaseApp
let auth: Auth
let firestore: Firestore

// AsyncStorage keys for Firebase config
const FIREBASE_CONFIG_KEY = "firebase_config"

/**
 * Initialize Firebase with configuration
 * @param config Optional Firebase configuration. If not provided, uses stored config or default
 */
export async function initializeFirebase(config?: FirebaseConfig): Promise<void> {
  try {
    let firebaseConfig: FirebaseConfig

    if (config) {
      // Use provided config and store it
      firebaseConfig = config
      await AsyncStorage.setItem(FIREBASE_CONFIG_KEY, JSON.stringify(config))
    } else {
      // Try to load stored config
      const storedConfig = await AsyncStorage.getItem(FIREBASE_CONFIG_KEY)
      if (storedConfig) {
        firebaseConfig = JSON.parse(storedConfig)
      } else {
        // Use default config
        firebaseConfig = defaultFirebaseConfig
        console.warn('Using default Firebase config. Please provide your actual configuration.')
      }
    }

    // Initialize Firebase app if not already initialized
    if (getApps().length === 0) {
      firebaseApp = initializeApp(firebaseConfig)
    } else {
      firebaseApp = getApp()
    }

    // Initialize services
    auth = getAuth(firebaseApp)
    firestore = getFirestore(firebaseApp)

    console.log('Firebase initialized successfully')
  } catch (error) {
    console.error('Firebase initialization error:', error)
    throw error
  }
}

/**
 * Get Firebase Auth instance
 * @returns Firebase Auth instance
 */
export function getFirebaseAuth(): Auth {
  if (!auth) {
    throw new Error('Firebase not initialized. Call initializeFirebase() first.')
  }
  return auth
}

/**
 * Get Firestore instance
 * @returns Firestore instance
 */
export function getFirebaseFirestore(): Firestore {
  if (!firestore) {
    throw new Error('Firebase not initialized. Call initializeFirebase() first.')
  }
  return firestore
}

/**
 * Get Firebase App instance
 * @returns Firebase App instance
 */
export function getFirebaseApp(): FirebaseApp {
  if (!firebaseApp) {
    throw new Error('Firebase not initialized. Call initializeFirebase() first.')
  }
  return firebaseApp
}

/**
 * Update Firebase configuration
 * @param config New Firebase configuration
 */
export async function updateFirebaseConfig(config: FirebaseConfig): Promise<void> {
  await initializeFirebase(config)
}

/**
 * Check if Firebase is initialized
 * @returns Boolean indicating if Firebase is initialized
 */
export function isFirebaseInitialized(): boolean {
  return !!firebaseApp && !!auth && !!firestore
}

// Initialize Firebase on module load
initializeFirebase().catch(error => {
  console.error('Failed to initialize Firebase on startup:', error)
})
