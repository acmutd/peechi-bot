import { z } from 'zod'

export const localEnvSchema = z.object({
  DISCORD_TOKEN: z.string(),
  GUILD_ID: z.string(),
  CLIENT_ID: z.string(),
  FIRESTORE_PROJECT_ID: z.string(),
  FIRESTORE_KEY_FILENAME: z.string(),
  NODE_ENV: z.enum(['development', 'production']).default('development'),
})

export const firebaseEnvSchema = z.object({
  ROLES: z.object({
    VERIFIED: z.string(),
  }),
  CHANNELS: z.object({
    VERIFICATION: z.string(),
    ADMIN: z.string(),
    ERROR: z.string(),
  }),
})

export type LocalEnv = z.infer<typeof localEnvSchema>
export type FirebaseEnv = z.infer<typeof firebaseEnvSchema>

type Prettify<T> = {
  [K in keyof T]: T[K]
}

export type Env = Prettify<LocalEnv & FirebaseEnv>

export const localEnv = localEnvSchema.parse(Bun.env)
class EnvironmentService {
  private _env: Env | null = null
  private _isInitialized = false
  private _initializationPromise: Promise<Env> | null = null

  async initialize(): Promise<Env> {
    if (this._isInitialized && this._env) {
      return this._env
    }

    // If initialization is already in progress, return the same promise
    if (this._initializationPromise) {
      return this._initializationPromise
    }

    this._initializationPromise = this._doInitialize()
    return this._initializationPromise
  }

  private async _doInitialize(): Promise<Env> {
    try {
      // Import Firebase service dynamically to avoid circular dependencies
      const { default: firebaseService } = await import('../db/firebase')
      const firebaseEnv = await firebaseService.getEnvironmentConfig()

      this._env = {
        ...localEnv,
        ...firebaseEnv,
      }

      this._isInitialized = true
      this._initializationPromise = null // Clear the promise
      return this._env
    } catch (error) {
      this._initializationPromise = null // Clear the promise so retry is possible
      console.error('Failed to initialize environment service:', error)
      throw new Error('Environment initialization failed')
    }
  }


  async getEnv(): Promise<Env> {
    if (this._isInitialized && this._env) {
      return this._env
    }

    // Try to initialize if not already done
    return await this.initialize()
  }

  reinitialize(): Promise<Env> {
    this._isInitialized = false
    this._env = null
    this._initializationPromise = null
    return this.initialize()
  }
}

export const envService = new EnvironmentService()

export async function getEnv(): Promise<Env> {
  return envService.getEnv()
}
