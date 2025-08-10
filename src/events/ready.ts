import { ActivityType, Client, Events } from 'discord.js'
import { Logger } from '../utils/logger'

export const name = Events.ClientReady
export const once = true

export async function execute(client: Client) {
  Logger.info(`Ready! Logged in as ${client.user?.tag}`)
  Logger.info(`Bot is in ${client.guilds.cache.size} guilds`)

  client.user?.setActivity('engineers grow 😭', { type: ActivityType.Watching })
}
