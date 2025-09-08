import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from 'discord.js'
import type { Command } from '../types'
import { getEnv } from '../utils/env'
import { Logger } from '../utils/logger'

export const verify: Command = {
  data: new SlashCommandBuilder()
    .setName('verify')
    .setDescription('Insert verification button in verification channel')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  execute: async interaction => {
    try {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral })

      const env = await getEnv()
      const verificationChannel = await interaction.client.channels.fetch(env.CHANNELS.VERIFICATION)
      if (!verificationChannel?.isSendable()) {
        await interaction.reply({
          content: 'Verification channel not found or bot cannot send messages there',
          flags: MessageFlags.Ephemeral,
        })
        return
      }

      try {
        const messages = await verificationChannel.messages.fetch({ limit: 100 })
        for (const message of messages.values()) {
          try {
            await message.delete()
          } catch (error) {
            Logger.warn('Failed to delete message:', error)
          }
        }
      } catch (error) {
        Logger.warn('Failed to fetch messages for cleanup:', error)
      }

      const embed = VerificationEmbed()
      const button = VerificationButton()
      const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(button)

      await verificationChannel.send({ embeds: [embed], components: [actionRow] })
      await interaction.editReply({ content: 'Verification button inserted' })
    } catch (error) {
      Logger.error('Error in verify command:', error)
      await interaction.editReply({ content: 'An error occurred while setting up verification' })
    }
  },
}

function VerificationEmbed() {
  return new EmbedBuilder()
    .setTitle('Server Verification')
    .setDescription('Click the button below to verify and gain access to all channels.')
    .setColor(0x00d4aa)
    .addFields([
      {
        name: 'Instructions',
        value: 'Enter your **first and last name** (and optionally pronouns)\nMax 32 characters total',
        inline: false,
      },
    ])
    .setFooter({
      text: 'Need help? Drop a message in the verifcation help channel',
    })
}

function VerificationButton() {
  return new ButtonBuilder({
    custom_id: 'verify',
    label: 'Verify Account',
    style: ButtonStyle.Success,
  })
}
