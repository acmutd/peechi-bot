// src/services/firebase.ts
import { initializeApp, cert, type ServiceAccount } from 'firebase-admin/app'
import { getFirestore, Firestore } from 'firebase-admin/firestore'
import { readFileSync } from 'node:fs'
import { localEnv, firebaseEnvSchema, type FirebaseEnv } from '../utils/env'

class FirebaseService {
  private db: Firestore

  constructor() {
    this.initializeFirebase()
    this.db = getFirestore()
  }

  private initializeFirebase() {
    try {
      const serviceAccount = JSON.parse(readFileSync(localEnv.FIRESTORE_KEY_FILENAME, 'utf8')) as ServiceAccount

      initializeApp({
        credential: cert(serviceAccount),
        projectId: localEnv.FIRESTORE_PROJECT_ID,
      })

      console.log('Firebase initialized successfully')
    } catch (error) {
      console.error('Error initializing Firebase:', error)
      throw error
    }
  }

  /**
   * Get environment configuration from Firebase
   */
  async getEnvironmentConfig(): Promise<FirebaseEnv> {
    try {
      const envDoc = await this.db.collection('config').doc('environment').get()

      if (!envDoc.exists) {
        throw new Error('Environment configuration not found in Firebase')
      }

      const data = envDoc.data()

      const firebaseEnv = firebaseEnvSchema.parse(data)

      return firebaseEnv
    } catch (error) {
      console.error('Error fetching environment config from Firebase:', error)
      throw error
    }
  }

  /**
   * Get Firestore database instance
   */
  getDb(): Firestore {
    return this.db
  }
}

export default new FirebaseService()
