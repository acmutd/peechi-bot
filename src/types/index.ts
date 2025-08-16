import {
  Collection,
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  Client,
  UserContextMenuCommandInteraction,
  ContextMenuCommandBuilder,
  MessageContextMenuCommandInteraction,
  ButtonInteraction,
  ButtonBuilder,
  type SlashCommandSubcommandsOnlyBuilder,
} from 'discord.js'

export type Command = {
  data: SlashCommandBuilder | SlashCommandSubcommandsOnlyBuilder
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>
}

export type ContextMenuCommand = {
  data: ContextMenuCommandBuilder
  execute: (interaction: UserContextMenuCommandInteraction | MessageContextMenuCommandInteraction) => Promise<void>
}

export type ButtonCommand = {
  // Base id will be the first slash e.g. `/report/{id}/{category}`
  baseId: string
  execute: (interaction: ButtonInteraction) => Promise<void>
}

export interface BotClient extends Client {
  commands: Collection<string, Command>
  contextMenuCommands: Collection<string, ContextMenuCommand>
  buttons: Collection<string, ButtonCommand>
}

export type ReportData = {
  id: string
  reportedUserId: string
  reportedUserName: string
  messageId: string
  messageContent: string
  category: string
}
