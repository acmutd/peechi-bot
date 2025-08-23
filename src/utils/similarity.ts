import { compareTwoStrings } from 'string-similarity'
import type { MessageHistory } from '../types/users'

const SIMILARITY_THRESHOLD = 0.7

function normalizeMessage(content: string): string {
  return content
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[*_~`]/g, '')
    .replace(/:\w+:/g, '')
    .trim()
}

export function isSimilarToRecentMessages(
  newMessage: string,
  recentMessages: MessageHistory[]
): boolean {
  if (!newMessage.trim() || recentMessages.length === 0) {
    return false
  }

  const normalizedNew = normalizeMessage(newMessage)

  if (normalizedNew.length < 3) {
    return true
  }

  for (const recentMessage of recentMessages) {
    const normalizedRecent = normalizeMessage(recentMessage.content)

    if (normalizedRecent.length < 3) {
      continue
    }

    const similarity = compareTwoStrings(normalizedNew, normalizedRecent)

    if (similarity >= SIMILARITY_THRESHOLD) {
      return true
    }
  }

  return false
}

export function calculatePointsForMessage(message: string): number {
  const normalizedMessage = normalizeMessage(message)
  const length = normalizedMessage.length

  if (length < 3) {
    return 0
  }

  if (length < 10) {
    return 1
  }

  if (length < 50) {
    return 2
  }

  return 3
}
