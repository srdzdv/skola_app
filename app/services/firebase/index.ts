// Firebase services exports
export * from './FirebaseInit'
export * from './FirebaseAuth'
export * from './FirestoreCRUD'

// Re-export commonly used Firebase types
export type { User, UserCredential } from 'firebase/auth'
export type { Timestamp, DocumentData, QueryDocumentSnapshot } from 'firebase/firestore'
