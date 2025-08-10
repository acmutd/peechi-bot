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
import env from '../utils/env'

const reportCategories = ['Offensive', 'Spam & Ads', 'Illegal or NSFW', 'Uncomfortable', 'Other']

export const report: ButtonCommand = {
  baseId: 'report',
  execute: async interaction => {
    const match = interaction.customId.match(/report\/([^\/]*)\/([^\/]+)/)
    const reportId = match![1]
    const category = match![2]

    const report = reportService.getReport(reportId)

    if (!report) {
      await interaction.reply({ content: 'Report not found', flags: MessageFlags.Ephemeral })
      return
    }

    if (!reportCategories.includes(category)) {
      await interaction.reply({ content: 'Invalid category', flags: MessageFlags.Ephemeral })
      return
    }

    reportService.deleteReport(reportId)

    const { message, originalInteraction } = report
    originalInteraction.editReply({
      components: [],
    })

    let userReportMessage = ''

    if (category === 'Other') {
      const modal = ReportModal()
      await interaction.showModal(modal)
      try {
        const res = await interaction.awaitModalSubmit({
          time: 1000 * 60 * 5,
        })
        userReportMessage = res.fields.getTextInputValue('report-text')
        await res.reply({
          content: 'Thank you for your report!',
          flags: MessageFlags.Ephemeral,
        })
      } catch (e) {
        await interaction.editReply({
          content: 'You took too long to send your report.',
        })
      }
    }

    const authorMember = await message.member?.fetch()

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
        value: userReportMessage,
        inline: false,
      })
    }

    const messageEmbed = new EmbedBuilder()
      .setAuthor({
        name: `${authorMember?.displayName || message.author.username} (${message.author.username})`,
        iconURL: message.member?.displayAvatarURL() || message.author.displayAvatarURL(),
      })
      .setDescription(message.content || '*No text content*')
      .setColor(0x34495e)
      .setTimestamp(message.createdTimestamp)

    if (message.attachments.size > 0) {
      messageEmbed.addFields({
        name: 'Attachments',
        value: `${message.attachments.size} file(s) attached`,
        inline: true,
      })
    }

    const modChannel = await interaction.client.channels.fetch(env.modChannelId)
    if (!modChannel?.isSendable()) {
      return
    }

    modChannel.send({
      embeds: [reportEmbed, messageEmbed],
      allowedMentions: { users: [] },
    })

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

    if (interaction.replied || interaction.deferred) {
      await interaction.editReply({
        embeds: [confirmationEmbed],
        options: { flags: MessageFlags.Ephemeral },
      })
    } else {
      await interaction.reply({
        embeds: [confirmationEmbed],
        ephemeral: true,
      })
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
