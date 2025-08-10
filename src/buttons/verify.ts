import {  ActionRowBuilder, MessageFlags, ModalBuilder, TextInputBuilder, TextInputStyle } from "discord.js"
import type { ButtonCommand } from "../types"
import env from "../utils/env"

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

        const res = await interaction.awaitModalSubmit({ time: 10_000 })
        if (!res) {
            await interaction.reply({ content: 'No response', flags: MessageFlags.Ephemeral })
            return
        }

        const name = res.fields.getTextInputValue('name')
        const pronouns = res.fields.getTextInputValue('pronouns')

        if (name.length > 32) {
            await interaction.reply({ content: 'Name is too long', flags: MessageFlags.Ephemeral })
            return
        }

        const role = await interaction.guild?.roles.fetch(env.roles.verified)
        if (!role) {
            await interaction.reply({ content: 'Verified role not found', flags: MessageFlags.Ephemeral })
            return
        }

        await member.setNickname(name)
        await member.roles.add(role)
        await interaction.followUp({ content: 'Verified', flags: MessageFlags.Ephemeral })
    }
}

function VerifyModal() {
    return new ModalBuilder()
        .setCustomId('verify')
        .setTitle('Verify')
        .addComponents(
            new ActionRowBuilder<TextInputBuilder>().addComponents(
                new TextInputBuilder()
                    .setCustomId('name')
                    .setLabel('Name')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true)
            ),
            new ActionRowBuilder<TextInputBuilder>().addComponents(
                new TextInputBuilder()
                    .setCustomId('pronouns')
                    .setLabel('Pronouns (optional)')
                    .setStyle(TextInputStyle.Short)
                    .setRequired(false)
        ))
}