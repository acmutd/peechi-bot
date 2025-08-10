// src/services/firebase.ts
import { initializeApp, cert, type ServiceAccount } from 'firebase-admin/app'
import { getFirestore, Firestore } from 'firebase-admin/firestore'
import { readFileSync } from 'node:fs'
import env from '../utils/env'

class FirebaseService {
  private db: Firestore

  constructor() {
    this.initializeFirebase()
    this.db = getFirestore()
  }

  private initializeFirebase() {
    try {
      const serviceAccount = JSON.parse(readFileSync('./peechi-bot.json', 'utf8')) as ServiceAccount

      initializeApp({
        credential: cert(serviceAccount),
        projectId: env.firestore.projectId,
      })

      console.log('Firebase initialized successfully')
    } catch (error) {
      console.error('Error initializing Firebase:', error)
      throw error
    }
  }
}

export default new FirebaseService()
