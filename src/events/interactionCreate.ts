import {
  Events,
  BaseInteraction,
  UserContextMenuCommandInteraction,
  MessageContextMenuCommandInteraction,
  type InteractionReplyOptions,
  MessageFlags,
} from 'discord.js'
import { type BotClient } from '../types'
import { Logger } from '../utils/logger'

export const name = Events.InteractionCreate

export async function execute(interaction: BaseInteraction) {
  if (interaction.isChatInputCommand()) return handleCommand(interaction)
  if (interaction.isContextMenuCommand()) return handleContextMenu(interaction)
  if (interaction.isButton()) return handleButton(interaction)
}

async function handleContextMenu(interaction: BaseInteraction) {
  if (!interaction.isContextMenuCommand()) return

  const client = interaction.client as BotClient
  const command = client.contextMenuCommands.get(interaction.commandName)

  if (!command) {
    Logger.error(`No context menu matching ${interaction.commandName} was found.`)
    return
  }

  try {
    if (interaction.isMessageContextMenuCommand()) {
      await command.execute(interaction as MessageContextMenuCommandInteraction)
    } else if (interaction.isUserContextMenuCommand()) {
      await command.execute(interaction as UserContextMenuCommandInteraction)
    }
    Logger.info(`${interaction.user.username} used ${interaction.commandName}`)
  } catch (error) {
    Logger.error('Error executing context menu:', error)

    const reply: InteractionReplyOptions = {
      content: 'There was an error while executing this context menu!',
      flags: MessageFlags.Ephemeral,
    }

    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(reply)
    } else {
      await interaction.reply(reply)
    }
  }
}

async function handleCommand(interaction: BaseInteraction) {
  if (!interaction.isChatInputCommand()) return

  const client = interaction.client as BotClient
  const command = client.commands.get(interaction.commandName)

  if (!command) {
    Logger.error(`No command matching ${interaction.commandName} was found.`)
    return
  }

  try {
    await command.execute(interaction)
    Logger.info(`${interaction.user.username} used /${interaction.commandName}`)
  } catch (error) {
    Logger.error('Error executing command:', error)

    const reply: InteractionReplyOptions = {
      content: 'There was an error while executing this command!',
      flags: MessageFlags.Ephemeral,
    }

    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(reply)
    } else {
      await interaction.reply(reply)
    }
  }
}

async function handleButton(interaction: BaseInteraction) {
  if (!interaction.isButton()) return

  const client = interaction.client as BotClient
  const baseId = interaction.customId.split('/')[0]
  const command = client.buttons.get(baseId)

  if (!command) {
    Logger.error(`No button matching ${interaction.customId} was found.`)
    return
  }

  try {
    await command.execute(interaction)
  } catch (error) {
    Logger.error('Error executing button:', error)

    const reply: InteractionReplyOptions = {
      content: 'There was an error while executing this button!',
      flags: MessageFlags.Ephemeral,
    }

    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(reply)
    } else {
      await interaction.reply(reply)
    }
  }
}
