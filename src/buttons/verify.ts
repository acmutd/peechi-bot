import { ActionRowBuilder, MessageFlags, ModalBuilder, TextInputBuilder, TextInputStyle } from 'discord.js'
import type { ButtonCommand } from '../types'
import getEnv from '../utils/env'

export const verify: ButtonCommand = {
  baseId: 'verify',
  execute: async interaction => {
    const user = interaction.user
    const member = interaction.guild?.members.cache.get(user.id)

    if (!member) {
      await interaction.reply({ content: 'You are not in a guild', flags: MessageFlags.Ephemeral })
      return
    }

    const modal = VerifyModal()
    await interaction.showModal(modal)

    const res = await interaction.awaitModalSubmit({ time: 1000 * 60 * 5, dispose: true })
    if (!res) {
      await interaction.reply({ content: 'No response', flags: MessageFlags.Ephemeral })
      return
    }

    await res.reply({ content: 'Please wait while we verify your account', flags: MessageFlags.Ephemeral })

    const name = res.fields.getTextInputValue('name')
    const pronouns = res.fields.getTextInputValue('pronouns')

    if (name.length > 32) {
      await interaction.reply({ content: 'Name is too long', flags: MessageFlags.Ephemeral })
      return
    }

    const env = getEnv()
    const role = await interaction.guild?.roles.fetch(env.ROLES.VERIFIED)
    if (!role) {
      await interaction.reply({ content: 'Verified role not found', flags: MessageFlags.Ephemeral })
      return
    }

    await member.setNickname(name)
    await member.roles.add(role)
    await res.editReply({ content: 'Verified' })
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
