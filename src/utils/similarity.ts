function normalizeMessage(content: string): string {
  return content
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[*_~`]/g, '')
    .replace(/:\w+:/g, '')
    .trim()
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
