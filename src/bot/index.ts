import { Client, Collection, Events, REST, Routes } from 'discord.js'
import { readdirSync } from 'fs'
import { pathToFileURL } from 'url'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

import type { BotClient, ButtonCommand, Command, ContextMenuCommand } from '../types'
import { Logger } from '../utils/logger'
import { BOT_INTENTS } from '../constants/intents'
import { getEnv } from '../utils/env'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

/**
 * Main Discord bot class that handles initialization, command loading, and lifecycle management
 */
export class DiscordBot {
  private client: BotClient
  private commands: Collection<string, Command>
  private contextMenuCommands: Collection<string, ContextMenuCommand>
  private buttons: Collection<string, ButtonCommand>

  constructor() {
    this.client = new Client({
      intents: BOT_INTENTS,
    }) as BotClient

    this.commands = new Collection()
    this.contextMenuCommands = new Collection()
    this.buttons = new Collection()
    this.client.commands = this.commands
    this.client.contextMenuCommands = this.contextMenuCommands
    this.client.buttons = this.buttons
  }

  /**
   * Load all slash commands from the commands directory
   */
  async loadCommands() {
    const commandsPath = join(__dirname, '..', 'commands')
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
          Logger.info(`Loaded command: ${command.data.name}`)
        }
      } catch (error) {
        Logger.critical(`Error loading command from ${file}`, error, { file, commandsPath })
      }
    }
  }

  /**
   * Load all event handlers from the events directory
   */
  async loadEvents() {
    const env = await getEnv()
    const eventsPath = join(__dirname, '..', 'events')
    const eventFiles = readdirSync(eventsPath).filter(file => file.endsWith('.ts'))

    for (const file of eventFiles) {
      const filePath = pathToFileURL(join(eventsPath, file)).href
      try {
        const eventModule = await import(filePath)

        if (eventModule.once) {
          this.client.once(eventModule.name, (...args) => eventModule.execute(...args))
        } else {
          if (eventModule.name === Events.MessageCreate && env.DISABLE_POINTS) {
            continue
          }
          this.client.on(eventModule.name, (...args) => eventModule.execute(...args))
        }

        Logger.info(`Loaded event: ${eventModule.name}`)
      } catch (error) {
        Logger.critical(`Error loading event from ${file}`, error, { file, eventsPath })
      }
    }
  }

  /**
   * Load all context menu commands from the ctx-menus directory
   */
  async loadContextMenus() {
    const contextMenusPath = join(__dirname, '..', 'ctx-menus')

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
          Logger.critical(`Error loading context menu from ${file}`, error, { file, contextMenusPath })
        }
      }
    } catch (error) {
      Logger.warn('Context menus directory not found, skipping context menu loading')
    }
  }

  /**
   * Load all button handlers from the buttons directory
   */
  async loadButtons() {
    const buttonsPath = join(__dirname, '..', 'buttons')
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
          Logger.info(`Loaded button: ${button.baseId}`)
        }
      } catch (error) {
        Logger.critical(`Error loading button from ${file}`, error, { file, buttonsPath })
      }
    }
  }

  /**
   * Deploy all commands to Discord
   */
  async deployCommands() {
    const commandData = Array.from(this.commands.values()).map(command => command.data.toJSON())
    const contextMenuData = Array.from(this.contextMenuCommands.values()).map(contextMenu => contextMenu.data.toJSON())
    const allCommands = [...commandData, ...contextMenuData]

    const env = await getEnv()
    const rest = new REST().setToken(env.DISCORD_TOKEN)

    try {
      Logger.info(
        `Started refreshing ${allCommands.length} application commands (${commandData.length} slash, ${contextMenuData.length} context menu).`,
      )
      await rest.put(Routes.applicationGuildCommands(env.CLIENT_ID, env.GUILD_ID), { body: allCommands })

      Logger.info(
        `Successfully reloaded ${commandData.length} application (/) commands and ${contextMenuData.length} context menu commands.`,
      )
    } catch (error) {
      Logger.critical('Error deploying commands to Discord', error, {
        commandCount: commandData.length,
        contextMenuCount: contextMenuData.length,
      })
      throw error
    }
  }

  /**
   * Start the bot and load all components
   */
  async start() {
    try {
      Logger.info('Starting Discord bot...')

      await this.loadCommands()
      await this.loadEvents()
      await this.loadContextMenus()
      await this.loadButtons()

      await this.deployCommands()

      const env = await getEnv()
      await this.client.login(env.DISCORD_TOKEN)

      // Graceful shutdown handling
      process.on('SIGINT', () => this.shutdown())
      process.on('SIGTERM', () => this.shutdown())

      Logger.info('Bot started successfully!')
    } catch (error) {
      Logger.critical('Failed to start Discord bot', error)
      process.exit(1)
    }
  }

  /**
   * Gracefully shutdown the bot
   */
  private async shutdown() {
    Logger.info('Shutting down bot...')

    try {
      this.client.destroy()
      Logger.info('Bot shut down successfully')
      process.exit(0)
    } catch (error) {
      Logger.critical('Error during bot shutdown', error)
      process.exit(1)
    }
  }

  /**
   * Get the bot client instance
   */
  getClient(): BotClient {
    return this.client
  }
}
