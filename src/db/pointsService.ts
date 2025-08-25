import { Firestore } from 'firebase-admin/firestore'
import firebaseService from './firebase'
import { userSchema, type User, type UserPointsUpdate } from '../types/users'
import { calculatePointsForMessage } from '../utils/similarity'
import { Logger } from '../utils/logger'

export class PointsService {
  private db: Firestore

  constructor() {
    this.db = firebaseService.getDb()
  }

  async getUser(userId: string): Promise<User | null> {
    try {
      const userDoc = await this.db.collection('users').doc(userId).get()

      if (!userDoc.exists) {
        return null
      }

      const userData = userDoc.data()
      return userSchema.parse(userData)
    } catch (error) {
      Logger.error(`Error fetching user ${userId}:`, error)
      return null
    }
  }

  async createUser(userId: string, name: string, pronouns: string = ''): Promise<User> {
    const newUser: User = {
      userId,
      name,
      pronouns,
      points: 0,
      lastUpdated: Date.now(),
    }

    try {
      await this.db.collection('users').doc(userId).set(newUser)
      Logger.info(`Created new user: ${name} (${userId})`)
      return newUser
    } catch (error) {
      Logger.error(`Error creating user ${userId}:`, error)
      throw error
    }
  }

  async updateUserPoints(update: UserPointsUpdate): Promise<boolean> {
    try {
      // Validate input
      if (!update.userId || typeof update.userId !== 'string') {
        Logger.error('Invalid userId provided to updateUserPoints')
        return false
      }

      if (typeof update.pointsToAdd !== 'number' || isNaN(update.pointsToAdd)) {
        Logger.error('Invalid pointsToAdd provided to updateUserPoints')
        return false
      }

      // Prevent negative points (unless explicitly allowed)
      if (update.pointsToAdd < 0) {
        Logger.warn(`Attempted to add negative points (${update.pointsToAdd}) for user ${update.userId}`)
        return false
      }

      // Prevent extremely large point values that could cause issues
      if (update.pointsToAdd > 1000000) {
        Logger.warn(`Attempted to add excessive points (${update.pointsToAdd}) for user ${update.userId}`)
        return false
      }

      const userRef = this.db.collection('users').doc(update.userId)

      const result = await this.db.runTransaction(async (transaction) => {
        const userDoc = await transaction.get(userRef)

        let userData: User
        if (!userDoc.exists) {
          Logger.warn(`Attempted to update points for non-existent user: ${update.userId}`)
          return false
        } else {
          try {
            userData = userSchema.parse(userDoc.data())
          } catch (parseError) {
            Logger.error(`Invalid user data format for user ${update.userId}:`, parseError)
            return false
          }
        }

        // Prevent integer overflow
        const newPoints = userData.points + update.pointsToAdd
        if (newPoints > Number.MAX_SAFE_INTEGER) {
          Logger.warn(`Point update would cause overflow for user ${update.userId}`)
          return false
        }

        userData.points = newPoints
        userData.lastUpdated = Date.now()

        transaction.set(userRef, userData)
        return true
      })

      if (result) {
        Logger.info(`Updated user ${update.userId}: +${update.pointsToAdd} points`)
      }
      return result
    } catch (error) {
      Logger.error(`Error updating points for user ${update.userId}:`, error)
      return false
    }
  }

  async processMessage(
    userId: string,
    userName: string,
    messageContent: string,
    channelId: string
  ): Promise<{ pointsAwarded: number; reason: string }> {
    try {
      // Validate inputs
      if (!userId || typeof userId !== 'string') {
        return {
          pointsAwarded: 0,
          reason: 'Invalid user ID'
        }
      }

      if (!userName || typeof userName !== 'string') {
        return {
          pointsAwarded: 0,
          reason: 'Invalid user name'
        }
      }

      if (!messageContent || typeof messageContent !== 'string') {
        return {
          pointsAwarded: 0,
          reason: 'Invalid message content'
        }
      }

      let user = await this.getUser(userId)
      if (!user) {
        try {
          user = await this.createUser(userId, userName)
        } catch (createError) {
          Logger.error(`Failed to create user ${userId}:`, createError)
          return {
            pointsAwarded: 0,
            reason: 'Failed to create user profile'
          }
        }
      }

      const pointsToAdd = calculatePointsForMessage(messageContent)

      if (pointsToAdd === 0) {
        return {
          pointsAwarded: 0,
          reason: 'Message too short or invalid'
        }
      }

      const success = await this.updateUserPoints({
        userId,
        pointsToAdd
      })

      if (success) {
        return {
          pointsAwarded: pointsToAdd,
          reason: `Awarded ${pointsToAdd} points for message`
        }
      } else {
        return {
          pointsAwarded: 0,
          reason: 'Failed to update user points'
        }
      }
    } catch (error) {
      Logger.error(`Error processing message for user ${userId}:`, error)
      return {
        pointsAwarded: 0,
        reason: 'Error processing message'
      }
    }
  }

  async getUserPoints(userId: string): Promise<number> {
    const user = await this.getUser(userId)
    return user?.points ?? 0
  }

  async getLeaderboard(limit: number = 10): Promise<User[]> {
    try {
      // Validate and sanitize limit
      if (typeof limit !== 'number' || isNaN(limit)) {
        Logger.warn('Invalid limit provided to getLeaderboard, using default')
        limit = 10
      }

      // Ensure limit is within reasonable bounds
      if (limit <= 0) {
        limit = 10
      } else if (limit > 100) {
        limit = 100
      }

      const snapshot = await this.db
        .collection('users')
        .orderBy('points', 'desc')
        .limit(limit)
        .get()

      const users: User[] = []
      snapshot.forEach(doc => {
        try {
          const userData = userSchema.parse(doc.data())
          users.push(userData)
        } catch (error) {
          Logger.warn(`Invalid user data for ${doc.id}:`, error)
        }
      })

      return users
    } catch (error) {
      Logger.error('Error fetching leaderboard:', error)
      return []
    }
  }
}

export default new PointsService()
