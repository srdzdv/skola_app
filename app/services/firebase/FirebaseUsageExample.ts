/**
 * Firebase Services Usage Examples
 * 
 * This file contains examples of how to use the Firebase services.
 * Remove this file once you've implemented the services in your app.
 */

import { 
  initializeFirebase, 
  firebaseAuth, 
  firestoreCRUD,
  FirestoreDocument 
} from './index'

// Example user interface
interface User extends FirestoreDocument {
  name: string
  email: string
  age?: number
  preferences?: string[]
}

// Example task interface
interface Task extends FirestoreDocument {
  title: string
  description: string
  completed: boolean
  userId: string
  priority: 'low' | 'medium' | 'high'
}

/**
 * Example: Initialize Firebase
 */
async function initializeFirebaseExample() {
  try {
    // Initialize with default config (you should replace with your actual config)
    await initializeFirebase()
    console.log('Firebase initialized successfully')
    
    // Or initialize with custom config
    // await initializeFirebase({
    //   apiKey: "your-api-key",
    //   authDomain: "your-project.firebaseapp.com",
    //   projectId: "your-project-id",
    //   storageBucket: "your-project.appspot.com",
    //   messagingSenderId: "your-sender-id",
    //   appId: "your-app-id"
    // })
  } catch (error) {
    console.error('Failed to initialize Firebase:', error)
  }
}

/**
 * Example: Authentication Operations
 */
async function authenticationExamples() {
  // Sign up a new user
  const signUpResult = await firebaseAuth.signInWithEmail(
    'user@example.com',
    'password123'
  )
  
  if (signUpResult.success) {
    console.log('User signed up:', signUpResult.user?.uid)
  } else {
    console.error('Sign up failed:', signUpResult.error)
  }

  // Sign in existing user
  const signInResult = await firebaseAuth.signInWithEmail(
    'user@example.com',
    'password123'
  )
  
  if (signInResult.success) {
    console.log('User signed in:', signInResult.user?.uid)
  } else {
    console.error('Sign in failed:', signInResult.error)
  }

  // Get current user
  const currentUser = firebaseAuth.getCurrentUser()
  console.log('Current user:', currentUser?.uid)

  // Check if authenticated
  const isAuthenticated = firebaseAuth.isAuthenticated()
  console.log('Is authenticated:', isAuthenticated)

  // Listen to auth state changes
  const unsubscribe = firebaseAuth.onAuthStateChange((user) => {
    if (user) {
      console.log('User signed in:', user.uid)
    } else {
      console.log('User signed out')
    }
  })

  // Update user profile
  await firebaseAuth.updateUserProfile({
    displayName: 'John Doe',
    photoURL: 'https://example.com/photo.jpg'
  })

  // Send password reset email
  await firebaseAuth.sendPasswordResetEmail('user@example.com')

  // Sign out
  const signOutResult = await firebaseAuth.signOut()
  if (signOutResult.success) {
    console.log('User signed out successfully')
  }

  // Don't forget to unsubscribe
  unsubscribe()
}

/**
 * Example: Firestore CRUD Operations
 */
async function firestoreExamples() {
  // Create a new user document
  const createResult = await firestoreCRUD.create<User>('users', {
    name: 'John Doe',
    email: 'john@example.com',
    age: 30,
    preferences: ['reading', 'coding']
  })
  
  if (createResult.success) {
    console.log('User created with ID:', createResult.id)
  }

  // Create document with specific ID
  await firestoreCRUD.create<User>('users', {
    name: 'Jane Doe',
    email: 'jane@example.com',
    age: 28
  }, 'jane-doe-123')

  // Read a single document
  const readResult = await firestoreCRUD.read<User>('users', 'jane-doe-123')
  if (readResult.success) {
    console.log('User data:', readResult.data)
  }

  // Read multiple documents with query
  const queryResult = await firestoreCRUD.readMany<User>('users', {
    whereClause: [
      { field: 'age', operator: '>=', value: 25 }
    ],
    orderByClause: [
      { field: 'name', direction: 'asc' }
    ],
    limitCount: 10
  })
  
  if (queryResult.success) {
    console.log('Users found:', queryResult.data?.length)
    queryResult.data?.forEach(user => {
      console.log('User:', user.name, user.email)
    })
  }

  // Update a document
  const updateResult = await firestoreCRUD.update<User>('users', 'jane-doe-123', {
    age: 29,
    preferences: ['photography', 'travel']
  })
  
  if (updateResult.success) {
    console.log('User updated')
  }

  // Upsert (create or update)
  await firestoreCRUD.upsert<User>('users', 'bob-smith-456', {
    name: 'Bob Smith',
    email: 'bob@example.com',
    age: 35
  })

  // Increment a numeric field
  await firestoreCRUD.incrementField('users', 'jane-doe-123', 'age', 1)

  // Add item to array
  await firestoreCRUD.addToArray('users', 'jane-doe-123', 'preferences', 'swimming')

  // Remove item from array
  await firestoreCRUD.removeFromArray('users', 'jane-doe-123', 'preferences', 'reading')

  // Delete a document
  const deleteResult = await firestoreCRUD.delete('users', 'bob-smith-456')
  if (deleteResult.success) {
    console.log('User deleted')
  }
}

/**
 * Example: Working with Tasks Collection
 */
async function taskExamples() {
  const currentUser = firebaseAuth.getCurrentUser()
  if (!currentUser) {
    console.log('User must be authenticated to create tasks')
    return
  }

  // Create a new task
  const task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'> = {
    title: 'Complete Firebase integration',
    description: 'Implement Firebase auth and Firestore CRUD operations',
    completed: false,
    userId: currentUser.uid,
    priority: 'high'
  }

  const createResult = await firestoreCRUD.create<Task>('tasks', task)
  if (createResult.success) {
    console.log('Task created:', createResult.id)
  }

  // Get all tasks for current user
  const userTasks = await firestoreCRUD.readMany<Task>('tasks', {
    whereClause: [
      { field: 'userId', operator: '==', value: currentUser.uid }
    ],
    orderByClause: [
      { field: 'createdAt', direction: 'desc' }
    ]
  })

  if (userTasks.success) {
    console.log('User tasks:', userTasks.data?.length)
  }

  // Mark task as completed
  if (createResult.id) {
    await firestoreCRUD.update<Task>('tasks', createResult.id, {
      completed: true
    })
  }

  // Get completed tasks
  const completedTasks = await firestoreCRUD.readMany<Task>('tasks', {
    whereClause: [
      { field: 'userId', operator: '==', value: currentUser.uid },
      { field: 'completed', operator: '==', value: true }
    ]
  })

  if (completedTasks.success) {
    console.log('Completed tasks:', completedTasks.data?.length)
  }
}

/**
 * Example: Pagination
 */
async function paginationExample() {
  let lastDoc: any = null
  let hasMore = true
  let page = 1

  while (hasMore) {
    const result = await firestoreCRUD.readMany<User>('users', {
      orderByClause: [{ field: 'name', direction: 'asc' }],
      limitCount: 5,
      startAfterDoc: lastDoc
    })

    if (result.success && result.data) {
      console.log(`Page ${page}:`, result.data.map(user => user.name))
      lastDoc = result.lastDoc
      hasMore = result.hasMore || false
      page++
    } else {
      hasMore = false
    }
  }
}

// Export examples for use in your app
export {
  initializeFirebaseExample,
  authenticationExamples,
  firestoreExamples,
  taskExamples,
  paginationExample
}
