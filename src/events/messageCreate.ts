import { Events, Message } from 'discord.js'
import firebaseService from '../db/firebase'
import pointsService from '../db/pointsService'
import { Logger } from '../utils/logger'

export const name = Events.MessageCreate

export async function execute(message: Message) {
  // Ignore bot messages
  if (message.author.bot) return

  // Ignore messages without content (embeds, attachments only, etc.)
  if (!message.content || message.content.trim().length === 0) return

  // Ignore system messages
  if (message.system) return

  try {
    // Process the message for points
    const result = await pointsService.processMessage(
      message.author.id,
      message.author.displayName || message.author.username,
      message.content,
      message.channel.id
    )

    // Log the result for debugging
    if (result.pointsAwarded > 0) {
      Logger.info(`User ${message.author.username} awarded ${result.pointsAwarded} points: ${result.reason}`)
    } else {
      Logger.debug(`No points awarded to ${message.author.username}: ${result.reason}`)
    }
  } catch (error) {
    Logger.error('Error processing message:', error)
  }
}
