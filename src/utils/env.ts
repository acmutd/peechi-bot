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

  async initialize(): Promise<Env> {
    if (this._isInitialized && this._env) {
      return this._env
    }

    try {
      // Import Firebase service dynamically to avoid circular dependencies
      const { default: firebaseService } = await import('../db/firebase')
      const firebaseEnv = await firebaseService.getEnvironmentConfig()

      this._env = {
        ...localEnv,
        ...firebaseEnv,
      }

      this._isInitialized = true
      return this._env
    } catch (error) {
      console.error('Failed to initialize environment service:', error)
      throw new Error('Environment initialization failed')
    }
  }

  getEnv(): Env {
    if (!this._isInitialized || !this._env) {
      throw new Error('Environment service not initialized. Call initialize() first.')
    }
    return this._env
  }

  reinitialize(): Promise<Env> {
    this._isInitialized = false
    this._env = null
    return this.initialize()
  }
}

export const envService = new EnvironmentService()

export default function getEnv(): Env {
  return envService.getEnv()
}
