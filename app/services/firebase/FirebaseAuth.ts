import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User,
  UserCredential,
  updateProfile,
  sendPasswordResetEmail,
  sendEmailVerification,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  deleteUser,
  AuthError
} from 'firebase/auth'
import { getFirebaseAuth } from './FirebaseInit'

// Auth result interface
export interface AuthResult {
  success: boolean
  user?: User
  error?: string
}

// User profile interface
export interface UserProfile {
  displayName?: string
  photoURL?: string
}

/**
 * Firebase Authentication Service
 */
export class FirebaseAuthService {
  private auth = getFirebaseAuth()

  /**
   * Sign in with email and password
   * @param email User email
   * @param password User password
   * @returns Promise<AuthResult>
   */
  async signInWithEmail(email: string, password: string): Promise<AuthResult> {
    try {
      const userCredential: UserCredential = await signInWithEmailAndPassword(
        this.auth,
        email,
        password
      )
      return {
        success: true,
        user: userCredential.user
      }
    } catch (error) {
      console.error('Sign in error:', error)
      return {
        success: false,
        error: this.getErrorMessage(error as AuthError)
      }
    }
  }

  /**
   * Create user with email and password
   * @param email User email
   * @param password User password
   * @param profile Optional user profile data
   * @returns Promise<AuthResult>
   */
  async createUserWithEmail(
    email: string,
    password: string,
    profile?: UserProfile
  ): Promise<AuthResult> {
    try {
      const userCredential: UserCredential = await createUserWithEmailAndPassword(
        this.auth,
        email,
        password
      )

      // Update profile if provided
      if (profile && (profile.displayName || profile.photoURL)) {
        await updateProfile(userCredential.user, profile)
      }

      return {
        success: true,
        user: userCredential.user
      }
    } catch (error) {
      console.error('Create user error:', error)
      return {
        success: false,
        error: this.getErrorMessage(error as AuthError)
      }
    }
  }

  /**
   * Sign out current user
   * @returns Promise<AuthResult>
   */
  async signOut(): Promise<AuthResult> {
    try {
      await signOut(this.auth)
      return {
        success: true
      }
    } catch (error) {
      console.error('Sign out error:', error)
      return {
        success: false,
        error: this.getErrorMessage(error as AuthError)
      }
    }
  }

  /**
   * Get current user
   * @returns Current user or null
   */
  getCurrentUser(): User | null {
    return this.auth.currentUser
  }

  /**
   * Check if user is authenticated
   * @returns Boolean indicating if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!this.auth.currentUser
  }

  /**
   * Listen to authentication state changes
   * @param callback Callback function to handle auth state changes
   * @returns Unsubscribe function
   */
  onAuthStateChange(callback: (user: User | null) => void): () => void {
    return onAuthStateChanged(this.auth, callback)
  }

  /**
   * Update user profile
   * @param profile User profile data to update
   * @returns Promise<AuthResult>
   */
  async updateUserProfile(profile: UserProfile): Promise<AuthResult> {
    try {
      const user = this.auth.currentUser
      if (!user) {
        return {
          success: false,
          error: 'No authenticated user'
        }
      }

      await updateProfile(user, profile)
      return {
        success: true,
        user
      }
    } catch (error) {
      console.error('Update profile error:', error)
      return {
        success: false,
        error: this.getErrorMessage(error as AuthError)
      }
    }
  }

  /**
   * Send password reset email
   * @param email User email
   * @returns Promise<AuthResult>
   */
  async sendPasswordResetEmail(email: string): Promise<AuthResult> {
    try {
      await sendPasswordResetEmail(this.auth, email)
      return {
        success: true
      }
    } catch (error) {
      console.error('Password reset error:', error)
      return {
        success: false,
        error: this.getErrorMessage(error as AuthError)
      }
    }
  }

  /**
   * Send email verification
   * @returns Promise<AuthResult>
   */
  async sendEmailVerification(): Promise<AuthResult> {
    try {
      const user = this.auth.currentUser
      if (!user) {
        return {
          success: false,
          error: 'No authenticated user'
        }
      }

      await sendEmailVerification(user)
      return {
        success: true
      }
    } catch (error) {
      console.error('Email verification error:', error)
      return {
        success: false,
        error: this.getErrorMessage(error as AuthError)
      }
    }
  }

  /**
   * Update user password
   * @param newPassword New password
   * @returns Promise<AuthResult>
   */
  async updatePassword(newPassword: string): Promise<AuthResult> {
    try {
      const user = this.auth.currentUser
      if (!user) {
        return {
          success: false,
          error: 'No authenticated user'
        }
      }

      await updatePassword(user, newPassword)
      return {
        success: true
      }
    } catch (error) {
      console.error('Update password error:', error)
      return {
        success: false,
        error: this.getErrorMessage(error as AuthError)
      }
    }
  }

  /**
   * Reauthenticate user with email and password
   * @param email User email
   * @param password User password
   * @returns Promise<AuthResult>
   */
  async reauthenticateWithEmail(email: string, password: string): Promise<AuthResult> {
    try {
      const user = this.auth.currentUser
      if (!user) {
        return {
          success: false,
          error: 'No authenticated user'
        }
      }

      const credential = EmailAuthProvider.credential(email, password)
      await reauthenticateWithCredential(user, credential)
      return {
        success: true,
        user
      }
    } catch (error) {
      console.error('Reauthentication error:', error)
      return {
        success: false,
        error: this.getErrorMessage(error as AuthError)
      }
    }
  }

  /**
   * Delete current user account
   * @returns Promise<AuthResult>
   */
  async deleteAccount(): Promise<AuthResult> {
    try {
      const user = this.auth.currentUser
      if (!user) {
        return {
          success: false,
          error: 'No authenticated user'
        }
      }

      await deleteUser(user)
      return {
        success: true
      }
    } catch (error) {
      console.error('Delete account error:', error)
      return {
        success: false,
        error: this.getErrorMessage(error as AuthError)
      }
    }
  }

  /**
   * Get user-friendly error message
   * @param error Firebase Auth error
   * @returns User-friendly error message
   */
  private getErrorMessage(error: AuthError): string {
    switch (error.code) {
      case 'auth/user-not-found':
        return 'No user found with this email address'
      case 'auth/wrong-password':
        return 'Incorrect password'
      case 'auth/email-already-in-use':
        return 'Email address is already in use'
      case 'auth/weak-password':
        return 'Password is too weak'
      case 'auth/invalid-email':
        return 'Invalid email address'
      case 'auth/user-disabled':
        return 'This account has been disabled'
      case 'auth/too-many-requests':
        return 'Too many failed attempts. Please try again later'
      case 'auth/requires-recent-login':
        return 'This operation requires recent authentication. Please sign in again'
      default:
        return error.message || 'An unknown error occurred'
    }
  }
}

// Export singleton instance
export const firebaseAuth = new FirebaseAuthService()
