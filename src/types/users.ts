import { z } from 'zod'

export const userSchema = z.object({
  userId: z.string(),
  name: z.string(),
  pronouns: z.string(),
  points: z.number().default(0),
  lastUpdated: z.number().default(() => Date.now()),
})

export const userPointsUpdateSchema = z.object({
  userId: z.string(),
  pointsToAdd: z.number(),
})

export type User = z.infer<typeof userSchema>
export type UserPointsUpdate = z.infer<typeof userPointsUpdateSchema>