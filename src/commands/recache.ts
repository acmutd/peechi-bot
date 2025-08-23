import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import type { Command } from "../types";
import { envService } from "../utils/env";

export const recache: Command = {
    data: new SlashCommandBuilder()
        .setName('recache')
        .setDescription('Recache the environment variables')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(interaction) {
        await envService.reinitialize()
        await interaction.reply({ content: 'Environment variables recached' })
    }
}