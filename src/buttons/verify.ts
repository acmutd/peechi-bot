import { ActionRowBuilder, MessageFlags, ModalBuilder, TextInputBuilder, TextInputStyle } from 'discord.js'
import type { ButtonCommand } from '../types'
import { getEnv } from '../utils/env'
import pointsService from '../db/pointsService'
import { Logger } from '../utils/logger'

export const verify: ButtonCommand = {
  baseId: 'verify',
  execute: async interaction => {
    try {
      const user = interaction.user
      const member = interaction.guild?.members.cache.get(user.id)

      if (!member) {
        await interaction.reply({ content: 'You are not in a guild', flags: MessageFlags.Ephemeral })
        return
      }

      // Check if user is already verified
      try {
        const env = await getEnv()
        const verifiedRole = await interaction.guild?.roles.fetch(env.ROLES.VERIFIED)
        if (verifiedRole && member.roles.cache.has(verifiedRole.id)) {
          await interaction.reply({ content: 'You are already verified!', flags: MessageFlags.Ephemeral })
          return
        }
      } catch (error) {
        Logger.warn('Could not check verification status:', error)
      }

      const modal = VerifyModal()
      await interaction.showModal(modal)

      let res
      try {
        res = await interaction.awaitModalSubmit({ time: 1000 * 60 * 5, dispose: true })
      } catch (error) {
        // Modal submission timed out or was cancelled
        Logger.info(`Modal submission timed out for user ${user.id}`)
        return
      }

      if (!res) {
        return
      }

      await res.reply({ content: 'Please wait while we verify your account', flags: MessageFlags.Ephemeral })

      const name = res.fields.getTextInputValue('name').trim()
      const pronouns = res.fields.getTextInputValue('pronouns').trim()

      // Validate name
      if (!name || name.length === 0) {
        await res.editReply({ content: 'Name cannot be empty' })
        return
      }

      if (name.length > 32) {
        await res.editReply({ content: 'Name is too long (maximum 32 characters)' })
        return
      }

      // Validate name contains only allowed characters
      if (!/^[a-zA-Z0-9\s\-_.()]+$/.test(name)) {
        await res.editReply({
          content:
            'Name contains invalid characters. Only letters, numbers, spaces, and basic punctuation are allowed.',
        })
        return
      }

      try {
        const env = await getEnv()
        const role = await interaction.guild?.roles.fetch(env.ROLES.VERIFIED)
        if (!role) {
          await res.editReply({ content: 'Verification role not found. Please contact a moderator.' })
          return
        }

        // Check bot permissions
        const botMember = interaction.guild?.members.me
        if (!botMember?.permissions.has(['ManageRoles', 'ManageNicknames'])) {
          await res.editReply({
            content: 'Bot lacks necessary permissions to complete verification. Please contact a moderator.',
          })
          return
        }

        // Check if bot can assign the role (role hierarchy)
        if (role.position >= botMember.roles.highest.position) {
          await res.editReply({
            content: 'Bot cannot assign the verification role due to role hierarchy. Please contact a moderator.',
          })
          return
        }

        const existingUser = await pointsService.getUser(user.id)
        if (!existingUser) {
          await pointsService.createUser(user.id, name, pronouns)
          Logger.info(`Created new user during verification: ${name} (${user.id})`)
        } else {
          Logger.info(`User ${name} (${user.id}) already exists in database`)
        }

        // Try to set nickname
        try {
          await member.setNickname(name)
        } catch (error) {
          Logger.warn(`Failed to set nickname for ${user.id}:`, error)
          // Continue with role assignment even if nickname fails
        }

        // Add verified role
        await member.roles.add(role)

        await res.editReply({ content: 'Verified successfully! You can now start earning points by chatting.' })
      } catch (error) {
        Logger.error(`Error during verification for user ${user.id}:`, error)
        try {
          await res.editReply({
            content:
              'An error occurred during verification. Please try again or contact a moderator if the issue persists.',
          })
        } catch (editError) {
          Logger.error('Failed to edit reply after verification error:', editError)
        }
      }
    } catch (error) {
      Logger.error('Unexpected error in verify button handler:', error, {
        userId: interaction.user.id,
        username: interaction.user.username,
        channelId: interaction.channelId,
      })
      try {
        if (interaction.replied || interaction.deferred) {
          // Cannot respond anymore
          return
        }
        await interaction.reply({
          content: 'An unexpected error occurred. Please try again.',
          flags: MessageFlags.Ephemeral,
        })
      } catch (replyError) {
        Logger.error('Failed to send error response:', replyError)
      }
    }
  },
}

function VerifyModal() {
  return new ModalBuilder()
    .setCustomId('verify')
    .setTitle('Verify')
    .addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder().setCustomId('name').setLabel('Name').setStyle(TextInputStyle.Short).setRequired(true),
      ),
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId('pronouns')
          .setLabel('Pronouns (optional)')
          .setStyle(TextInputStyle.Short)
          .setRequired(false),
      ),
    )
}
