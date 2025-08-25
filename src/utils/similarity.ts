function normalizeMessage(content: string): string {
  // Validate input
  if (!content || typeof content !== 'string') {
    return ''
  }

  return content
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[*_~`]/g, '')
    .replace(/:\w+:/g, '')
    .replace(/https?:\/\/[^\s]+/g, '') // Remove URLs
    .replace(/<[@#&!][0-9]+>/g, '') // Remove Discord mentions
    .trim()
}

export function calculatePointsForMessage(message: string): number {
  // Validate input
  if (!message || typeof message !== 'string') {
    return 0
  }

  // Prevent abuse with extremely long messages
  if (message.length > 10000) {
    return 0
  }

  const normalizedMessage = normalizeMessage(message)
  const length = normalizedMessage.length

  // No points for empty or very short messages
  if (length < 3) {
    return 0
  }

  // Prevent spam by checking for repeated characters
  const uniqueChars = new Set(normalizedMessage.replace(/\s/g, '')).size
  if (uniqueChars < 3 && length > 10) {
    return 0 // Likely spam like "aaaaaaaaaa"
  }

  // Check for minimum word count (prevent "a a a a a" type spam)
  const wordCount = normalizedMessage.split(/\s+/).filter(word => word.length > 0).length
  if (wordCount < 2 && length > 10) {
    return 0
  }

  if (length < 10) {
    return 1
  }

  if (length < 50) {
    return 2
  }

  if (length < 200) {
    return 3
  }

  // Cap at 4 points for very long messages
  return 4
}
