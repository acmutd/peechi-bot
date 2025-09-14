import { GatewayIntentBits } from 'discord.js'

/**
 * Discord bot intents configuration
 * These intents determine what events the bot can receive from Discord
 */
export const BOT_INTENTS = [
  GatewayIntentBits.Guilds,
  GatewayIntentBits.GuildMessages,
  GatewayIntentBits.MessageContent,
  GatewayIntentBits.GuildMembers,
  GatewayIntentBits.GuildScheduledEvents,
] as const
