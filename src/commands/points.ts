import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js'
import pointsService from '../db/pointsService'
import { Logger } from '../utils/logger'
import type { Command } from '../types'

export const data: Command = {
  data: new SlashCommandBuilder()
    .setName('points')
    .setDescription('Check your points or view the leaderboard')
    .addSubcommand(subcommand => subcommand.setName('check').setDescription('Check your current points'))
    .addSubcommand(subcommand =>
      subcommand
        .setName('leaderboard')
        .setDescription('View the points leaderboard')
        .addIntegerOption(option =>
          option
            .setName('limit')
            .setDescription('Number of top users to show (default: 10, max: 25)')
            .setMinValue(1)
            .setMaxValue(25),
        ),
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('user')
        .setDescription("Check another user's points")
        .addUserOption(option =>
          option.setName('target').setDescription('The user to check points for').setRequired(true),
        ),
    ),
  execute: async interaction => {
    const subcommand = interaction.options.getSubcommand()

    try {
      if (subcommand === 'check') {
        const userId = interaction.user.id
        const user = await pointsService.getUser(userId)

        const embed = new EmbedBuilder()
          .setColor(0x0099ff)
          .setTitle('Your Points')
          .setThumbnail(interaction.user.displayAvatarURL())
          .addFields(
            { name: 'Points', value: user?.points.toString() ?? '0', inline: true },
            { name: 'User', value: interaction.user.displayName || interaction.user.username, inline: true },
          )
          .setTimestamp()

        if (!user) {
          embed.setDescription("You haven't earned any points yet! Start chatting to earn points.")
        }

        await interaction.reply({ embeds: [embed] })
      } else if (subcommand === 'user') {
        const targetUser = interaction.options.getUser('target', true)

        if (!targetUser) {
          const errorEmbed = new EmbedBuilder()
            .setColor(0xff0000)
            .setTitle('Error')
            .setDescription('Invalid user specified.')
            .setTimestamp()
          await interaction.reply({ embeds: [errorEmbed], ephemeral: true })
          return
        }

        if (targetUser.bot) {
          const errorEmbed = new EmbedBuilder()
            .setColor(0xff0000)
            .setTitle('Error')
            .setDescription("Bots don't earn points!")
            .setTimestamp()
          await interaction.reply({ embeds: [errorEmbed], ephemeral: true })
          return
        }

        const user = await pointsService.getUser(targetUser.id)

        const embed = new EmbedBuilder()
          .setColor(0x0099ff)
          .setTitle(`${targetUser.displayName || targetUser.username}'s Points`)
          .setThumbnail(targetUser.displayAvatarURL())
          .addFields(
            { name: 'Points', value: user?.points.toString() ?? '0', inline: true },
            { name: 'User', value: targetUser.displayName || targetUser.username, inline: true },
          )
          .setTimestamp()

        if (!user) {
          embed.setDescription("This user hasn't earned any points yet!")
        }

        await interaction.reply({ embeds: [embed] })
      } else if (subcommand === 'leaderboard') {
        const limit = interaction.options.getInteger('limit') ?? 10

        // Additional validation for the limit (though Discord should handle this)
        const sanitizedLimit = Math.max(1, Math.min(25, limit))

        const leaderboard = await pointsService.getLeaderboard(sanitizedLimit)

        const embed = new EmbedBuilder().setColor(0xffd700).setTitle('🏆 Points Leaderboard').setTimestamp()

        if (leaderboard.length === 0) {
          embed.setDescription('No users have earned points yet!')
        } else {
          const leaderboardText = leaderboard
            .map((user, index) => {
              const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`
              // Escape user names to prevent Discord markdown injection
              const safeName = user.name.replace(/[*_`~|\\]/g, '\\$&')
              return `${medal} **${safeName}** - ${user.points.toLocaleString()} points`
            })
            .join('\n')

          embed.setDescription(leaderboardText)

          if (sanitizedLimit !== limit) {
            embed.setFooter({ text: `Showing top ${sanitizedLimit} users` })
          }
        }

        await interaction.reply({ embeds: [embed] })
      } else {
        // Handle unexpected subcommands
        const errorEmbed = new EmbedBuilder()
          .setColor(0xff0000)
          .setTitle('Error')
          .setDescription('Unknown subcommand.')
          .setTimestamp()
        await interaction.reply({ embeds: [errorEmbed], ephemeral: true })
      }
    } catch (error) {
      Logger.error('Error executing points command:', error)

      const errorEmbed = new EmbedBuilder()
        .setColor(0xff0000)
        .setTitle('Error')
        .setDescription('An error occurred while processing your request. Please try again later.')
        .setTimestamp()

      try {
        if (interaction.replied || interaction.deferred) {
          await interaction.editReply({ embeds: [errorEmbed] })
        } else {
          await interaction.reply({ embeds: [errorEmbed], ephemeral: true })
        }
      } catch (replyError) {
        Logger.error('Failed to send error response:', replyError)
      }
    }
  },
}
