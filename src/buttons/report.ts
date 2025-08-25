import {
  ActionRowBuilder,
  EmbedBuilder,
  MessageFlags,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js'
import reportService from '../db/reportService'
import { type ButtonCommand } from '../types'
import { getEnv } from '../utils/env'
import { Logger } from '../utils/logger'

const reportCategories = ['Offensive', 'Spam & Ads', 'Illegal or NSFW', 'Uncomfortable', 'Other']

export const report: ButtonCommand = {
  baseId: 'report',
  execute: async interaction => {
    try {
      const match = interaction.customId.match(/report\/([^\/]*)\/([^\/]+)/)
      if (!match || match.length < 3) {
        await interaction.reply({ content: 'Invalid report format', flags: MessageFlags.Ephemeral })
        return
      }

      const reportId = match[1]
      const category = match[2]

      if (!reportId || !category) {
        await interaction.reply({ content: 'Missing report information', flags: MessageFlags.Ephemeral })
        return
      }

      const report = await reportService.getReport(reportId)

      if (!report) {
        await interaction.reply({ content: 'Report not found or has expired', flags: MessageFlags.Ephemeral })
        return
      }

      if (!reportCategories.includes(category)) {
        await interaction.reply({ content: 'Invalid category', flags: MessageFlags.Ephemeral })
        return
      }

      await reportService.deleteReport(reportId)

      const { message, originalInteraction } = report

      // Safely edit the original interaction
      try {
        await originalInteraction.editReply({
          components: [],
        })
      } catch (error) {
        Logger.warn('Failed to edit original report interaction:', error)
      }

      let userReportMessage = ''

      if (category === 'Other') {
        const modal = ReportModal()
        try {
          await interaction.showModal(modal)
          const res = await interaction.awaitModalSubmit({
            time: 1000 * 60 * 5,
          })
          userReportMessage = res.fields.getTextInputValue('report-text').trim()
          await res.reply({
            content: 'Thank you for your report!',
            flags: MessageFlags.Ephemeral,
          })
        } catch (error) {
          Logger.info('Modal submission failed or timed out:', error)
          // Continue with empty message if modal fails
          if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({
              content: 'Report submitted without additional details.',
              flags: MessageFlags.Ephemeral,
            })
          }
        }
      }

      let authorMember
      try {
        authorMember = await message.member?.fetch()
      } catch (error) {
        Logger.warn('Failed to fetch message author member:', error)
      }

      const reportEmbed = new EmbedBuilder()
        .setTitle('New Report Submitted')
        .setDescription(`**Category:** ${category}\n**Report ID:** \`${reportId}\``)
        .addFields(
          {
            name: 'Reported User',
            value: `${authorMember?.displayName || message.author.username} (<@${message.author.id}>)`,
            inline: true,
          },
          {
            name: 'Channel',
            value: `<#${message.channel.id}>`,
            inline: true,
          },
          {
            name: 'Message Link',
            value: `[View Message](${message.url})`,
            inline: true,
          },
        )
        .setColor(
          category === 'Offensive' || category === 'Illegal or NSFW'
            ? 0xe74c3c
            : category === 'Spam & Ads'
              ? 0x95a5a6
              : category === 'Uncomfortable'
                ? 0x3498db
                : 0x7f8c8d,
        )
        .setTimestamp()
        .setFooter({
          text: 'Anonymous Report System',
        })

      if (userReportMessage) {
        reportEmbed.addFields({
          name: 'Additional Details',
          value: userReportMessage.length > 1000 ? userReportMessage.substring(0, 997) + '...' : userReportMessage,
          inline: false,
        })
      }

      const messageEmbed = new EmbedBuilder()
        .setAuthor({
          name: `${authorMember?.displayName || message.author.username} (${message.author.username})`,
          iconURL: message.member?.displayAvatarURL() || message.author.displayAvatarURL(),
        })
        .setDescription(
          message.content
            ? message.content.length > 1000
              ? message.content.substring(0, 997) + '...'
              : message.content
            : '*No text content*',
        )
        .setColor(0x34495e)
        .setTimestamp(message.createdTimestamp)

      if (message.attachments.size > 0) {
        messageEmbed.addFields({
          name: 'Attachments',
          value: `${message.attachments.size} file(s) attached`,
          inline: true,
        })
      }

      try {
        const env = await getEnv()
        const modChannel = await interaction.client.channels.fetch(env.CHANNELS.ADMIN)
        if (!modChannel?.isSendable()) {
          Logger.error('Admin channel not found or not sendable')
          throw new Error('Cannot send report to admin channel')
        }

        await modChannel.send({
          embeds: [reportEmbed, messageEmbed],
          allowedMentions: { users: [] },
        })
      } catch (error) {
        Logger.error('Failed to send report to admin channel:', error)
        // Still show confirmation to user even if admin notification fails
      }

      const confirmationEmbed = new EmbedBuilder()
        .setTitle('Report Submitted Successfully')
        .setDescription('Your anonymous report has been submitted to our moderation team for review.')
        .addFields(
          {
            name: 'Report ID',
            value: `\`${reportId}\``,
            inline: true,
          },
          {
            name: 'Category',
            value: category,
            inline: true,
          },
        )
        .setColor(0x27ae60)
        .setTimestamp()
        .setFooter({
          text: 'Thank you for helping keep our community safe',
        })

      try {
        if (category !== 'Other' && !interaction.replied && !interaction.deferred) {
          await interaction.reply({
            embeds: [confirmationEmbed],
            ephemeral: true,
          })
        } else if (category !== 'Other') {
          // This case shouldn't happen, but handle it gracefully
          Logger.warn('Interaction already replied/deferred in non-Other category')
        }
        // For 'Other' category, we already replied in the modal handling above
      } catch (error) {
        Logger.error('Failed to send confirmation message:', error)
      }
    } catch (error) {
      Logger.error('Error in report button handler:', error)
      try {
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({
            content: 'An error occurred while processing your report. Please try again.',
            ephemeral: true,
          })
        }
      } catch (replyError) {
        Logger.error('Failed to send error response:', replyError)
      }
    }
  },
}

function ReportModal() {
  return new ModalBuilder()
    .setCustomId('report-modal')
    .setTitle('Additional Report Details')
    .addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId('report-text')
          .setLabel('Please provide additional details')
          .setPlaceholder('Explain why you are reporting this message...')
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true)
          .setMinLength(10)
          .setMaxLength(1000),
      ),
    )
}
