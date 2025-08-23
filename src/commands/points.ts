import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from 'discord.js'
import pointsService from '../db/pointsService'
import { Logger } from '../utils/logger'
import type { Command } from '../types'

export const data: Command = {
  data: new SlashCommandBuilder()
  .setName('points')
  .setDescription('Check your points or view the leaderboard')
  .addSubcommand(subcommand =>
    subcommand
      .setName('check')
      .setDescription('Check your current points')
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('leaderboard')
      .setDescription('View the points leaderboard')
      .addIntegerOption(option =>
        option
          .setName('limit')
          .setDescription('Number of top users to show (default: 10, max: 25)')
          .setMinValue(1)
          .setMaxValue(25)
      )
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('user')
      .setDescription('Check another user\'s points')
      .addUserOption(option =>
        option
          .setName('target')
          .setDescription('The user to check points for')
          .setRequired(true)
      )
  ),
  execute: async interaction => {
  const subcommand = interaction.options.getSubcommand()

  try {
    if (subcommand === 'check') {
      const userId = interaction.user.id
      const user = await pointsService.getUser(userId)

      const embed = new EmbedBuilder()
        .setColor(0x0099FF)
        .setTitle('Your Points')
        .setThumbnail(interaction.user.displayAvatarURL())
        .addFields(
          { name: 'Points', value: user?.points.toString() ?? '0', inline: true },
          { name: 'User', value: interaction.user.displayName || interaction.user.username, inline: true }
        )
        .setTimestamp()

      if (!user) {
        embed.setDescription('You haven\'t earned any points yet! Start chatting to earn points.')
      }

      await interaction.reply({ embeds: [embed] })

    } else if (subcommand === 'user') {
      const targetUser = interaction.options.getUser('target', true)
      const user = await pointsService.getUser(targetUser.id)

      const embed = new EmbedBuilder()
        .setColor(0x0099FF)
        .setTitle(`${targetUser.displayName || targetUser.username}'s Points`)
        .setThumbnail(targetUser.displayAvatarURL())
        .addFields(
          { name: 'Points', value: user?.points.toString() ?? '0', inline: true },
          { name: 'User', value: targetUser.displayName || targetUser.username, inline: true }
        )
        .setTimestamp()

      if (!user) {
        embed.setDescription('This user hasn\'t earned any points yet!')
      }

      await interaction.reply({ embeds: [embed] })

    } else if (subcommand === 'leaderboard') {
      const limit = interaction.options.getInteger('limit') ?? 10
      const leaderboard = await pointsService.getLeaderboard(limit)

      const embed = new EmbedBuilder()
        .setColor(0xFFD700)
        .setTitle('🏆 Points Leaderboard')
        .setTimestamp()

      if (leaderboard.length === 0) {
        embed.setDescription('No users have earned points yet!')
      } else {
        const leaderboardText = leaderboard
          .map((user, index) => {
            const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`
            return `${medal} **${user.name}** - ${user.points} points`
          })
          .join('\n')

        embed.setDescription(leaderboardText)
      }

      await interaction.reply({ embeds: [embed] })
    }

  } catch (error) {
    Logger.error('Error executing points command:', error)

    const errorEmbed = new EmbedBuilder()
      .setColor(0xFF0000)
      .setTitle('Error')
      .setDescription('An error occurred while processing your request. Please try again later.')
      .setTimestamp()

    await interaction.reply({ embeds: [errorEmbed], ephemeral: true })
    }
  },
}
