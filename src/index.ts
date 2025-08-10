import { Client, Collection, GatewayIntentBits, REST, Routes } from 'discord.js'
import { readdirSync } from 'fs'
import { pathToFileURL } from 'url'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

import type { BotClient, ButtonCommand, Command, ContextMenuCommand } from './types'
import { Logger } from './utils/logger'
import env from './utils/env'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

class DiscordBot {
  private client: BotClient
  private commands: Collection<string, Command>
  private contextMenuCommands: Collection<string, ContextMenuCommand>
  private buttons: Collection<string, ButtonCommand>

  constructor() {
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.DirectMessages,
      ],
    }) as BotClient

    this.commands = new Collection()
    this.contextMenuCommands = new Collection()
    this.buttons = new Collection()
    this.client.commands = this.commands
    this.client.contextMenuCommands = this.contextMenuCommands
    this.client.buttons = this.buttons
  }

  async loadCommands() {
    const commandsPath = join(__dirname, 'commands')
    const commandFiles = readdirSync(commandsPath).filter(file => file.endsWith('.ts'))

    for (const file of commandFiles) {
      const filePath = pathToFileURL(join(commandsPath, file)).href
      try {
        const commandModule = await import(filePath)

        const commands = Object.values(commandModule).filter(
          cmd => cmd && typeof cmd === 'object' && 'data' in cmd && 'execute' in cmd,
        ) as Command[]

        for (const command of commands) {
          this.commands.set(command.data.name, command)
        }
      } catch (error) {
        Logger.error(`Error loading command from ${file}:`, error)
      }
    }
  }

  async loadEvents() {
    const eventsPath = join(__dirname, 'events')
    const eventFiles = readdirSync(eventsPath).filter(file => file.endsWith('.ts'))

    for (const file of eventFiles) {
      const filePath = pathToFileURL(join(eventsPath, file)).href
      try {
        const eventModule = await import(filePath)

        if (eventModule.once) {
          this.client.once(eventModule.name, (...args) => eventModule.execute(...args))
        } else {
          this.client.on(eventModule.name, (...args) => eventModule.execute(...args))
        }

        Logger.info(`Loaded event: ${eventModule.name}`)
      } catch (error) {
        Logger.error(`Error loading event from ${file}:`, error)
      }
    }
  }

  async loadContextMenus() {
    const contextMenusPath = join(__dirname, 'ctx-menus')

    try {
      const contextMenuFiles = readdirSync(contextMenusPath).filter(
        file => file.endsWith('.ts') || file.endsWith('.js'),
      )

      for (const file of contextMenuFiles) {
        const filePath = pathToFileURL(join(contextMenusPath, file)).href
        try {
          const contextMenuModule = await import(filePath)

          const contextMenus = Object.values(contextMenuModule).filter(
            (cmd: any) => cmd && typeof cmd === 'object' && cmd.data && cmd.execute,
          ) as ContextMenuCommand[]

          for (const contextMenu of contextMenus) {
            this.contextMenuCommands.set(contextMenu.data.name, contextMenu)
            Logger.info(`Loaded context menu: ${contextMenu.data.name}`)
          }
        } catch (error) {
          Logger.error(`Error loading context menu from ${file}:`, error)
        }
      }
    } catch (error) {
      Logger.warn('Context menus directory not found, skipping context menu loading')
    }
  }

  async loadButtons() {
    const buttonsPath = join(__dirname, 'buttons')
    const buttonFiles = readdirSync(buttonsPath).filter(file => file.endsWith('.ts'))

    for (const file of buttonFiles) {
      const filePath = pathToFileURL(join(buttonsPath, file)).href
      try {
        const buttonModule = await import(filePath)

        const buttons = Object.values(buttonModule).filter(
          (cmd: any) => cmd && typeof cmd === 'object' && cmd.baseId && cmd.execute,
        ) as ButtonCommand[]

        for (const button of buttons) {
          this.buttons.set(button.baseId, button)
        }
      } catch (error) {
        Logger.error(`Error loading button from ${file}:`, error)
      }
    }
  }

  async deployCommands() {
    const commandData = Array.from(this.commands.values()).map(command => command.data.toJSON())
    const contextMenuData = Array.from(this.contextMenuCommands.values()).map(contextMenu => contextMenu.data.toJSON())
    const allCommands = [...commandData, ...contextMenuData]

    const rest = new REST().setToken(env.discordToken)

    try {
      Logger.info(
        `Started refreshing ${allCommands.length} application commands (${commandData.length} slash, ${contextMenuData.length} context menu).`,
      )
      await rest.put(Routes.applicationGuildCommands(env.clientId, env.guildId), { body: allCommands })

      Logger.info(
        `Successfully reloaded ${commandData.length} application (/) commands and ${contextMenuData.length} context menu commands.`,
      )
    } catch (error) {
      Logger.error('Error deploying commands:', error)
      throw error
    }
  }

  async start() {
    try {
      await this.loadCommands()
      await this.loadEvents()
      await this.loadContextMenus()
      await this.loadButtons()

      await this.deployCommands()

      await this.client.login(env.discordToken)

      // Graceful shutdown handling
      process.on('SIGINT', () => this.shutdown())
      process.on('SIGTERM', () => this.shutdown())
    } catch (error) {
      Logger.error('Error starting bot:', error)
      process.exit(1)
    }
  }

  private async shutdown() {
    Logger.info('Shutting down bot...')

    try {
      this.client.destroy()
      Logger.info('Bot shut down successfully')
      process.exit(0)
    } catch (error) {
      Logger.error('Error during shutdown:', error)
      process.exit(1)
    }
  }
}

// Start the bot
const bot = new DiscordBot()
bot.start().catch(error => {
  Logger.error('Failed to start bot:', error)
  process.exit(1)
})
