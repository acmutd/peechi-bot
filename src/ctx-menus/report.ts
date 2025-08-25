import {
  ActionRowBuilder,
  ApplicationCommandType,
  ButtonBuilder,
  ButtonStyle,
  ContextMenuCommandBuilder,
  EmbedBuilder,
  MessageFlags,
} from 'discord.js'
import type { ContextMenuCommand } from '../types'
import reportService from '../db/reportService'
import { Logger } from '../utils/logger'

const reportCategories = [
  { name: 'Offensive', style: ButtonStyle.Danger, color: 0xe74c3c },
  { name: 'Spam & Ads', style: ButtonStyle.Secondary, color: 0x95a5a6 },
  { name: 'Illegal or NSFW', style: ButtonStyle.Danger, color: 0xc0392b },
  { name: 'Uncomfortable', style: ButtonStyle.Primary, color: 0x3498db },
  { name: 'Other', style: ButtonStyle.Secondary, color: 0x7f8c8d },
]

export const report: ContextMenuCommand = {
  data: new ContextMenuCommandBuilder().setName('Report Message').setType(ApplicationCommandType.Message),
  execute: async interaction => {
    try {
      if (interaction.isUserContextMenuCommand()) return

      const message = interaction.targetMessage

      if (!message) {
        await interaction.reply({
          content: 'Could not find the message to report.',
          flags: MessageFlags.Ephemeral,
        })
        return
      }

      if (message.author.bot) {
        await interaction.reply({
          content: 'You cannot report bot messages.',
          flags: MessageFlags.Ephemeral,
        })
        return
      }

      if (message.author.id === interaction.user.id) {
        await interaction.reply({
          content: 'You cannot report your own message.',
          flags: MessageFlags.Ephemeral,
        })
        return
      }

      const reportId = reportService.createReport(interaction)

      const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        reportCategories.map(
          cat =>
            new ButtonBuilder({
              label: cat.name,
              custom_id: `report/${reportId}/${cat.name}`,
              style: cat.style,
            }),
        ),
      )

      const embed = new EmbedBuilder()
        .setTitle('Report Message')
        .setDescription(
          `Please select the most appropriate category for your report below.\n\n**Report ID:** \`${reportId}\``,
        )
        .addFields({
          name: 'Message Link',
          value: `[Click here to view the reported message](${message.url})`,
          inline: false,
        })
        .setColor(0x2c3e50)
        .setFooter({
          text: 'Your report will be reviewed by our moderation team',
        })
        .setTimestamp()

      await interaction.reply({
        embeds: [embed],
        components: [actionRow],
        flags: MessageFlags.Ephemeral,
      })
    } catch (error) {
      Logger.error('Error in report context menu:', error)
      try {
        if (interaction.replied || interaction.deferred) {
          return
        }
        await interaction.reply({
          content: 'An error occurred while creating your report. Please try again.',
          flags: MessageFlags.Ephemeral,
        })
      } catch (replyError) {
        Logger.error('Failed to send error response:', replyError)
      }
    }
  },
}
