import { Events, Message } from 'discord.js'
import firebaseService from '../db/firebase'
import { Logger } from '../utils/logger'

export const name = Events.MessageCreate

export async function execute(message: Message) {
  // Ignore bot messages
  if (message.author.bot) return

  try {
    // TODO: smth
  } catch (error) {
    Logger.error('Error processing message:', error)
  }
}
