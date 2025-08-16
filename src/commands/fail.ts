import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  MessageFlags,
  SlashCommandSubcommandBuilder,
} from 'discord.js'
import { Logger } from '../utils/logger'
import type { Command } from '../types'

export const failCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('fail')
    .setDescription('Trigger test errors for debugging (Admin only)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(new SlashCommandSubcommandBuilder().setName('error').setDescription('Trigger a regular error'))
    .addSubcommand(new SlashCommandSubcommandBuilder().setName('critical').setDescription('Trigger a critical error')),
  execute: async (interaction: ChatInputCommandInteraction) => {
    const subcommand = interaction.options.getSubcommand()

    switch (subcommand) {
      case 'error':
        Logger.error('Test error triggered by /fail command', undefined, {
          triggeredBy: interaction.user.username,
          userId: interaction.user.id,
          severity: 'low',
          context: {
            command: '/fail error',
            channelId: interaction.channelId,
          },
        })
        break

      case 'critical':
        Logger.critical('Test critical error triggered by /fail command', undefined, {
          triggeredBy: interaction.user.username,
          userId: interaction.user.id,
          severity: 'high',
          context: {
            command: '/fail',
            channelId: interaction.channelId,
          },
        })
        break

      default:
        await interaction.reply({
          content: 'Invalid subcommand. Please use one of the following: error, critical',
          flags: MessageFlags.Ephemeral,
        })
    }
    await interaction.reply({
      content: 'Error triggered',
      flags: MessageFlags.Ephemeral,
    })
  },
}
