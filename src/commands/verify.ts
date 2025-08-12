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
import env from '../utils/env'

export const verify: Command = {
  data: new SlashCommandBuilder()
    .setName('verify')
    .setDescription('Insert verification button in verification channel')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  execute: async interaction => {
    const verificationChannel = await interaction.client.channels.fetch(env.verificationChannelId)
    if (!verificationChannel?.isSendable()) {
      await interaction.reply({ content: 'Verification channel not found', flags: MessageFlags.Ephemeral })
      return
    }

    const messages = await verificationChannel.messages.fetch({ limit: 100 })
    for (const message of messages.values()) {
      await message.delete()
    }

    const embed = VerificationEmbed()
    const button = VerificationButton()
    const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(button)

    await verificationChannel.send({ embeds: [embed], components: [actionRow] })
    await interaction.reply({ content: 'Verification button inserted', flags: MessageFlags.Ephemeral })
  },
}

function VerificationEmbed() {
  return new EmbedBuilder()
    .setTitle('Verification')
    .setDescription('Click the button below to verify')
    .addFields([
      {
        name: 'Instructions',
        value: 'Click the button below and enter your first & last name',
      },
      {
        name: 'Additional',
        value: 'You can also enter your pronouns, just make sure the total message is less than 32 characters',
      },
    ])
}

function VerificationButton() {
  return new ButtonBuilder({
    custom_id: 'verify',
    label: 'Verify',
    style: ButtonStyle.Success,
  })
}
