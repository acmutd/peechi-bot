import { z } from 'zod'

export const messageHistorySchema = z.object({
  content: z.string(),
  timestamp: z.number(),
  channelId: z.string(),
})

export const userSchema = z.object({
  userId: z.string(),
  name: z.string(),
  pronouns: z.string(),
  points: z.number().default(0),
  lastMessages: z.array(messageHistorySchema).max(5).default([]),
  lastUpdated: z.number().default(() => Date.now()),
})

export const userPointsUpdateSchema = z.object({
  userId: z.string(),
  pointsToAdd: z.number(),
  message: messageHistorySchema,
})

export type User = z.infer<typeof userSchema>
export type MessageHistory = z.infer<typeof messageHistorySchema>
export type UserPointsUpdate = z.infer<typeof userPointsUpdateSchema>