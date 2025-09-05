import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  EmbedBuilder,
  type GuildScheduledEventCreateOptions,
  GuildScheduledEventEntityType,
  GuildScheduledEventPrivacyLevel,
  GuildScheduledEvent,
} from 'discord.js'
import type { Command } from '../types'
import calendarService from '../db/calendarService'
import { validateDiscordEventData } from '../types/calendar'
import { Logger } from '../utils/logger'

export const calendarSync: Command = {
  data: new SlashCommandBuilder()
    .setName('calendar-sync')
    .setDescription('Sync Google Calendar events to Discord guild events')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageEvents),
  execute: async (interaction: ChatInputCommandInteraction) => {
    try {
      await interaction.deferReply()

      const calendarEvents = await calendarService.getUpcomingEvents(20)

      if (calendarEvents.length === 0) {
        await interaction.editReply({
          content: 'No upcoming events found in Google Calendar.',
        })
        return
      }

      const existingEvents = await interaction.guild?.scheduledEvents.fetch()

      const existingCalendarIds = new Set<string>()
      const discordEventsMap = new Map<string, GuildScheduledEvent>()

      existingEvents?.forEach(discordEvent => {
        const match = discordEvent.description?.match(/\[cal:([^\]]+)\]/)
        if (match) {
          const calendarId = match[1]
          existingCalendarIds.add(calendarId)
          discordEventsMap.set(calendarId, discordEvent)
        }
      })

      const eventsToCreate = calendarEvents.filter(event => !existingCalendarIds.has(event.id))
      const eventsToUpdate = calendarEvents.filter(event => existingCalendarIds.has(event.id))
      const eventsToDelete = Array.from(discordEventsMap.entries()).filter(
        ([calId]) => !calendarEvents.some(calEvent => calEvent.id === calId),
      )

      if (eventsToCreate.length === 0 && eventsToUpdate.length === 0 && eventsToDelete.length === 0) {
        await interaction.editReply({
          content: `All ${calendarEvents.length} calendar events are already up to date.`,
        })
        return
      }

      const createdEvents: string[] = []
      const updatedEvents: string[] = []
      const deletedEvents: string[] = []
      const failedEvents: string[] = []

      // Create new events
      for (const calEvent of eventsToCreate) {
        try {
          const validatedEventData = validateDiscordEventData(calEvent)

          // Embed calendar ID in description
          const descriptionWithId = validatedEventData.description
            ? `${validatedEventData.description}\n\n[cal:${calEvent.id}]`
            : `[cal:${calEvent.id}]`

          const eventOptions: GuildScheduledEventCreateOptions = {
            name: validatedEventData.name,
            description: descriptionWithId,
            scheduledStartTime: validatedEventData.scheduledStartTime,
            scheduledEndTime: validatedEventData.scheduledEndTime,
            privacyLevel: GuildScheduledEventPrivacyLevel.GuildOnly,
            entityType: GuildScheduledEventEntityType.External,
            entityMetadata: {
              location: validatedEventData.location ?? 'TBD',
            },
          }

          await interaction.guild?.scheduledEvents.create(eventOptions)
          createdEvents.push(calEvent.summary)
          Logger.info(`Created Discord event: ${calEvent.summary}`)
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown validation error'
          Logger.error(`Failed to create Discord event for ${calEvent.summary}:`, error)
          failedEvents.push(`${calEvent.summary} (${errorMessage})`)
        }
      }

      // Update existing events
      for (const calEvent of eventsToUpdate) {
        try {
          const validatedEventData = validateDiscordEventData(calEvent)
          const existingDiscordEvent = discordEventsMap.get(calEvent.id)

          if (!existingDiscordEvent) continue

          // Embed calendar ID in description
          const descriptionWithId = validatedEventData.description
            ? `${validatedEventData.description}\n\n[cal:${calEvent.id}]`
            : `[cal:${calEvent.id}]`

          await existingDiscordEvent.edit({
            name: validatedEventData.name,
            description: descriptionWithId,
            scheduledStartTime: validatedEventData.scheduledStartTime,
            scheduledEndTime: validatedEventData.scheduledEndTime,
            entityMetadata: {
              location: validatedEventData.location ?? 'TBD',
            },
          })

          updatedEvents.push(calEvent.summary)
          Logger.info(`Updated Discord event: ${calEvent.summary}`)
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown validation error'
          Logger.error(`Failed to update Discord event for ${calEvent.summary}:`, error)
          failedEvents.push(`${calEvent.summary} (${errorMessage})`)
        }
      }

      // Delete events that no longer exist in calendar
      for (const [_, discordEvent] of eventsToDelete) {
        try {
          await discordEvent.delete()
          deletedEvents.push(discordEvent.name)
          Logger.info(`Deleted Discord event: ${discordEvent.name}`)
        } catch (error) {
          Logger.error(`Failed to delete Discord event ${discordEvent.name}:`, error)
          failedEvents.push(`${discordEvent.name} (delete failed)`)
        }
      }

      // Create result embed
      const totalChanges = createdEvents.length + updatedEvents.length + deletedEvents.length
      const embed = new EmbedBuilder()
        .setTitle('Calendar Sync Complete')
        .setColor(totalChanges > 0 ? 0x00ff00 : 0xff9900)
        .setTimestamp()

      if (createdEvents.length > 0) {
        embed.addFields([
          {
            name: `Created Events (${createdEvents.length})`,
            value:
              createdEvents
                .slice(0, 10)
                .map(name => `• ${name}`)
                .join('\n') || 'None',
            inline: false,
          },
        ])
      }

      if (updatedEvents.length > 0) {
        embed.addFields([
          {
            name: `Updated Events (${updatedEvents.length})`,
            value:
              updatedEvents
                .slice(0, 10)
                .map(name => `• ${name}`)
                .join('\n') || 'None',
            inline: false,
          },
        ])
      }

      if (deletedEvents.length > 0) {
        embed.addFields([
          {
            name: `Deleted Events (${deletedEvents.length})`,
            value:
              deletedEvents
                .slice(0, 10)
                .map(name => `• ${name}`)
                .join('\n') || 'None',
            inline: false,
          },
        ])
      }

      if (failedEvents.length > 0) {
        embed.addFields([
          {
            name: `Failed Events (${failedEvents.length})`,
            value:
              failedEvents
                .slice(0, 5)
                .map(name => `• ${name}`)
                .join('\n') || 'None',
            inline: false,
          },
        ])
      }

      if (totalChanges === 0 && failedEvents.length === 0) {
        embed.setDescription('No changes were needed - all events are up to date.')
      }

      const totalEventsShown =
        Math.min(10, createdEvents.length) + Math.min(10, updatedEvents.length) + Math.min(10, deletedEvents.length)
      const totalEventsProcessed = createdEvents.length + updatedEvents.length + deletedEvents.length

      if (totalEventsProcessed > totalEventsShown) {
        embed.setFooter({ text: `... and ${totalEventsProcessed - totalEventsShown} more events processed` })
      }

      await interaction.editReply({ embeds: [embed] })
    } catch (error) {
      Logger.error('Error in sync command:', error)

      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'

      try {
        await interaction.editReply({
          content: `**Sync failed:** ${errorMessage}\n\nPlease check the bot logs for more details.`,
        })
      } catch {
        // If we can't edit the reply, try to follow up
        await interaction.followUp({
          content: `**Sync failed:** ${errorMessage}`,
        })
      }
    }
  },
}
