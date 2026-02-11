import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  endBefore,
  QueryConstraint,
  DocumentData,
  DocumentReference,
  QueryDocumentSnapshot,
  Timestamp,
  serverTimestamp,
  increment,
  arrayUnion,
  arrayRemove,
  FieldValue
} from 'firebase/firestore'
import { getFirebaseFirestore } from './FirebaseInit'

// Generic document interface
export interface FirestoreDocument {
  id?: string
  createdAt?: Timestamp
  updatedAt?: Timestamp
  [key: string]: any
}

// Query result interface
export interface QueryResult<T = DocumentData> {
  success: boolean
  data?: T[]
  error?: string
  lastDoc?: QueryDocumentSnapshot<DocumentData>
  hasMore?: boolean
}

// Single document result interface
export interface DocumentResult<T = DocumentData> {
  success: boolean
  data?: T
  error?: string
}

// Operation result interface
export interface OperationResult {
  success: boolean
  id?: string
  error?: string
}

// Query options interface
export interface QueryOptions {
  whereClause?: {
    field: string
    operator: '<' | '<=' | '==' | '!=' | '>=' | '>' | 'array-contains' | 'array-contains-any' | 'in' | 'not-in'
    value: any
  }[]
  orderByClause?: {
    field: string
    direction?: 'asc' | 'desc'
  }[]
  limitCount?: number
  startAfterDoc?: QueryDocumentSnapshot<DocumentData>
  endBeforeDoc?: QueryDocumentSnapshot<DocumentData>
}

/**
 * Firestore CRUD Service
 * Generic service for performing CRUD operations on any Firestore collection
 */
export class FirestoreCRUDService {
  private firestore = getFirebaseFirestore()

  /**
   * Create a new document in a collection
   * @param collectionName Name of the collection
   * @param data Document data
   * @param documentId Optional document ID (if not provided, Firestore will generate one)
   * @returns Promise<OperationResult>
   */
  async create<T extends FirestoreDocument>(
    collectionName: string,
    data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>,
    documentId?: string
  ): Promise<OperationResult> {
    try {
      const collectionRef = collection(this.firestore, collectionName)
      const timestamp = serverTimestamp()
      const documentData = {
        ...data,
        createdAt: timestamp,
        updatedAt: timestamp
      }

      let docRef: DocumentReference

      if (documentId) {
        // Create document with specific ID
        docRef = doc(collectionRef, documentId)
        await setDoc(docRef, documentData)
      } else {
        // Create document with auto-generated ID
        docRef = await addDoc(collectionRef, documentData)
      }

      return {
        success: true,
        id: docRef.id
      }
    } catch (error) {
      console.error(`Error creating document in ${collectionName}:`, error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  /**
   * Read a single document by ID
   * @param collectionName Name of the collection
   * @param documentId Document ID
   * @returns Promise<DocumentResult<T>>
   */
  async read<T extends FirestoreDocument>(
    collectionName: string,
    documentId: string
  ): Promise<DocumentResult<T>> {
    try {
      const docRef = doc(this.firestore, collectionName, documentId)
      const docSnap = await getDoc(docRef)

      if (docSnap.exists()) {
        const data = { id: docSnap.id, ...docSnap.data() } as T
        return {
          success: true,
          data
        }
      } else {
        return {
          success: false,
          error: 'Document not found'
        }
      }
    } catch (error) {
      console.error(`Error reading document from ${collectionName}:`, error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  /**
   * Read multiple documents with optional query constraints
   * @param collectionName Name of the collection
   * @param options Query options
   * @returns Promise<QueryResult<T>>
   */
  async readMany<T extends FirestoreDocument>(
    collectionName: string,
    options: QueryOptions = {}
  ): Promise<QueryResult<T>> {
    try {
      const collectionRef = collection(this.firestore, collectionName)
      const constraints: QueryConstraint[] = []

      // Add where clauses
      if (options.whereClause) {
        options.whereClause.forEach(clause => {
          constraints.push(where(clause.field, clause.operator, clause.value))
        })
      }

      // Add order by clauses
      if (options.orderByClause) {
        options.orderByClause.forEach(clause => {
          constraints.push(orderBy(clause.field, clause.direction || 'asc'))
        })
      }

      // Add pagination
      if (options.startAfterDoc) {
        constraints.push(startAfter(options.startAfterDoc))
      }
      if (options.endBeforeDoc) {
        constraints.push(endBefore(options.endBeforeDoc))
      }

      // Add limit
      if (options.limitCount) {
        constraints.push(limit(options.limitCount))
      }

      const q = query(collectionRef, ...constraints)
      const querySnapshot = await getDocs(q)

      const data: T[] = []
      querySnapshot.forEach(doc => {
        data.push({ id: doc.id, ...doc.data() } as T)
      })

      const lastDoc = querySnapshot.docs[querySnapshot.docs.length - 1]
      const hasMore = options.limitCount ? querySnapshot.docs.length === options.limitCount : false

      return {
        success: true,
        data,
        lastDoc,
        hasMore
      }
    } catch (error) {
      console.error(`Error reading documents from ${collectionName}:`, error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  /**
   * Update a document
   * @param collectionName Name of the collection
   * @param documentId Document ID
   * @param data Partial data to update
   * @returns Promise<OperationResult>
   */
  async update<T extends FirestoreDocument>(
    collectionName: string,
    documentId: string,
    data: Partial<Omit<T, 'id' | 'createdAt'>>
  ): Promise<OperationResult> {
    try {
      const docRef = doc(this.firestore, collectionName, documentId)
      const updateData = {
        ...data,
        updatedAt: serverTimestamp()
      }

      await updateDoc(docRef, updateData)

      return {
        success: true,
        id: documentId
      }
    } catch (error) {
      console.error(`Error updating document in ${collectionName}:`, error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  /**
   * Delete a document
   * @param collectionName Name of the collection
   * @param documentId Document ID
   * @returns Promise<OperationResult>
   */
  async delete(collectionName: string, documentId: string): Promise<OperationResult> {
    try {
      const docRef = doc(this.firestore, collectionName, documentId)
      await deleteDoc(docRef)

      return {
        success: true,
        id: documentId
      }
    } catch (error) {
      console.error(`Error deleting document from ${collectionName}:`, error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  /**
   * Upsert (create or update) a document
   * @param collectionName Name of the collection
   * @param documentId Document ID
   * @param data Document data
   * @param merge Whether to merge with existing data (default: true)
   * @returns Promise<OperationResult>
   */
  async upsert<T extends FirestoreDocument>(
    collectionName: string,
    documentId: string,
    data: Omit<T, 'id'>,
    merge: boolean = true
  ): Promise<OperationResult> {
    try {
      const docRef = doc(this.firestore, collectionName, documentId)
      const timestamp = serverTimestamp()
      
      let documentData: any
      if (merge) {
        documentData = {
          ...data,
          updatedAt: timestamp
        }
      } else {
        documentData = {
          ...data,
          createdAt: timestamp,
          updatedAt: timestamp
        }
      }

      await setDoc(docRef, documentData, { merge })

      return {
        success: true,
        id: documentId
      }
    } catch (error) {
      console.error(`Error upserting document in ${collectionName}:`, error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  /**
   * Increment a numeric field
   * @param collectionName Name of the collection
   * @param documentId Document ID
   * @param field Field name to increment
   * @param value Value to increment by (default: 1)
   * @returns Promise<OperationResult>
   */
  async incrementField(
    collectionName: string,
    documentId: string,
    field: string,
    value: number = 1
  ): Promise<OperationResult> {
    try {
      const docRef = doc(this.firestore, collectionName, documentId)
      await updateDoc(docRef, {
        [field]: increment(value),
        updatedAt: serverTimestamp()
      })

      return {
        success: true,
        id: documentId
      }
    } catch (error) {
      console.error(`Error incrementing field in ${collectionName}:`, error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  /**
   * Add item to array field
   * @param collectionName Name of the collection
   * @param documentId Document ID
   * @param field Array field name
   * @param value Value to add to array
   * @returns Promise<OperationResult>
   */
  async addToArray(
    collectionName: string,
    documentId: string,
    field: string,
    value: any
  ): Promise<OperationResult> {
    try {
      const docRef = doc(this.firestore, collectionName, documentId)
      await updateDoc(docRef, {
        [field]: arrayUnion(value),
        updatedAt: serverTimestamp()
      })

      return {
        success: true,
        id: documentId
      }
    } catch (error) {
      console.error(`Error adding to array in ${collectionName}:`, error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  /**
   * Remove item from array field
   * @param collectionName Name of the collection
   * @param documentId Document ID
   * @param field Array field name
   * @param value Value to remove from array
   * @returns Promise<OperationResult>
   */
  async removeFromArray(
    collectionName: string,
    documentId: string,
    field: string,
    value: any
  ): Promise<OperationResult> {
    try {
      const docRef = doc(this.firestore, collectionName, documentId)
      await updateDoc(docRef, {
        [field]: arrayRemove(value),
        updatedAt: serverTimestamp()
      })

      return {
        success: true,
        id: documentId
      }
    } catch (error) {
      console.error(`Error removing from array in ${collectionName}:`, error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  /**
   * Get server timestamp
   * @returns FieldValue representing server timestamp
   */
  getServerTimestamp(): FieldValue {
    return serverTimestamp()
  }

  /**
   * Get increment field value
   * @param value Value to increment by
   * @returns FieldValue representing increment
   */
  getIncrement(value: number): FieldValue {
    return increment(value)
  }

  /**
   * Get array union field value
   * @param values Values to add to array
   * @returns FieldValue representing array union
   */
  getArrayUnion(...values: any[]): FieldValue {
    return arrayUnion(...values)
  }

  /**
   * Get array remove field value
   * @param values Values to remove from array
   * @returns FieldValue representing array remove
   */
  getArrayRemove(...values: any[]): FieldValue {
    return arrayRemove(...values)
  }
}

// Export singleton instance
export const firestoreCRUD = new FirestoreCRUDService()
