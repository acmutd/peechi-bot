import type { BotClient } from '../types'
import { EmbedBuilder, TextChannel } from 'discord.js'

export class Logger {
  private static client: BotClient | null = null


  static setClient(client: BotClient) {
    this.client = client
  }

  static info(message: string, ...args: any[]) {
    console.log(`[INFO] ${new Date().toISOString()} - ${message}`, ...args)
  }

  static error(message: string, ...args: any[]) {
    console.error(`[ERROR] ${new Date().toISOString()} - ${message}`, ...args)
    // Send to Discord error channel if available
    this.sendToDiscordErrorChannel('ERROR', message, args)
  }

  static warn(message: string, ...args: any[]) {
    console.warn(`[WARN] ${new Date().toISOString()} - ${message}`, ...args)
  }

  static debug(message: string, ...args: any[]) {
    if (Bun.env.NODE_ENV === 'development') {
      console.log(`[DEBUG] ${new Date().toISOString()} - ${message}`, ...args)
    }
  }

  static critical(message: string, error?: Error | unknown, context?: Record<string, any>) {
    const timestamp = new Date().toISOString()
    console.error(`[CRITICAL] ${timestamp} - ${message}`, error, context)

    this.sendToDiscordErrorChannel('CRITICAL', message, [error, context])
  }

  private static async sendToDiscordErrorChannel(level: 'ERROR' | 'CRITICAL', message: string, args: any[]) {
    if (!this.client) {
      return
    }

    try {
      // Dynamically import env to avoid circular dependencies
      const { getEnv } = await import('./env')
      const env = await getEnv()

      const errorChannel = this.client.channels.cache.get(env.CHANNELS.ERROR) as TextChannel

      if (!errorChannel) {
        console.warn('Error channel not found or not accessible')
        return
      }

      // Create error embed
      const embed = new EmbedBuilder()
        .setTitle(`🚨 ${level} Log`)
        .setDescription(message)
        .setColor(level === 'CRITICAL' ? 0xff0000 : 0xffa500)
        .setTimestamp()

      if (args.length > 0) {
        const details = args
          .filter(arg => arg !== undefined && arg !== null)
          .map(arg => {
            if (arg instanceof Error) {
              return `**Error:** ${arg.name}: ${arg.message}\n**Stack:** \`\`\`${arg.stack?.slice(0, 1000) || 'No stack trace'}\`\`\``
            }
            if (typeof arg === 'object') {
              try {
                return `**Context:** \`\`\`json\n${JSON.stringify(arg, null, 2).slice(0, 1000)}\`\`\``
              } catch {
                return `**Context:** ${String(arg).slice(0, 1000)}`
              }
            }
            return String(arg).slice(0, 1000)
          })
          .join('\n\n')

        if (details) {
          embed.addFields({
            name: 'Details',
            value: details.slice(0, 1024),
          })
        }
      }

      embed.addFields({
        name: 'Environment',
        value: `**Node ENV:** ${process.env.NODE_ENV || 'unknown'}\n**Process:** ${process.pid}`,
        inline: true,
      })

      await errorChannel.send({ embeds: [embed] })
    } catch (discordError) {
      console.error('Failed to send error to Discord channel:', discordError)
    }
  }
}
