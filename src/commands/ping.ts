import { SlashCommandBuilder } from 'discord.js'
import type { Command } from '../types'

export const ping: Command = {
  data: new SlashCommandBuilder().setName('ping').setDescription('Replies with Pong!'),
  async execute(interaction) {
    const sent = await interaction.reply({
      content: 'Pong!',
      withResponse: true,
    })

    const latency = sent.interaction.createdTimestamp - interaction.createdTimestamp
    const apiLatency = Math.round(interaction.client.ws.ping)

    await interaction.editReply(`Pong!\nLatency: ${latency}ms\nAPI Latency: ${apiLatency}ms`)
  },
}
