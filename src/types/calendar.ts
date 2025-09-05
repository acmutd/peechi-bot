import { z } from 'zod'

// Zod schema for Google Calendar API date/time objects
export const calendarDateTimeSchema = z.object({
  dateTime: z.string().optional(),
  date: z.string().optional(),
  timeZone: z.string().optional(),
})

// Zod schema for Google Calendar API event
export const googleCalendarEventSchema = z.object({
  id: z.string(),
  summary: z.string().optional(),
  description: z.string().optional(),
  start: calendarDateTimeSchema.optional(),
  end: calendarDateTimeSchema.optional(),
  location: z.string().optional(),
  htmlLink: z.string().optional(),
  status: z.string().optional(),
  created: z.string().optional(),
  updated: z.string().optional(),
  creator: z
    .object({
      email: z.string().optional(),
      displayName: z.string().optional(),
    })
    .optional(),
  organizer: z
    .object({
      email: z.string().optional(),
      displayName: z.string().optional(),
    })
    .optional(),
})

// Zod schema for Google Calendar API events list response
export const googleCalendarEventsListSchema = z.object({
  kind: z.string(),
  etag: z.string(),
  summary: z.string().optional(),
  description: z.string().optional(),
  updated: z.string().optional(),
  timeZone: z.string().optional(),
  accessRole: z.string().optional(),
  defaultReminders: z
    .array(
      z.object({
        method: z.string(),
        minutes: z.number(),
      }),
    )
    .optional(),
  nextPageToken: z.string().optional(),
  items: z.array(googleCalendarEventSchema).optional(),
})

// Our internal calendar event schema (cleaned and validated)
export const calendarEventSchema = z.object({
  id: z.string(),
  summary: z.string(),
  description: z.string().optional(),
  start: z.object({
    dateTime: z.string().optional(),
    date: z.string().optional(),
    timeZone: z.string().optional(),
  }),
  end: z.object({
    dateTime: z.string().optional(),
    date: z.string().optional(),
    timeZone: z.string().optional(),
  }),
  location: z.string().optional(),
  htmlLink: z.string().optional(),
})

// Transform function to convert Google Calendar event to our internal format
export const transformGoogleCalendarEvent = (
  event: z.infer<typeof googleCalendarEventSchema>,
): z.infer<typeof calendarEventSchema> => {
  return {
    id: event.id,
    summary: event.summary || 'No Title',
    description: event.description,
    start: {
      dateTime: event.start?.dateTime,
      date: event.start?.date,
      timeZone: event.start?.timeZone,
    },
    end: {
      dateTime: event.end?.dateTime,
      date: event.end?.date,
      timeZone: event.end?.timeZone,
    },
    location: event.location,
    htmlLink: event.htmlLink,
  }
}

// Discord event creation validation schema
export const discordEventDataSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(950).optional(), // Leave room for calendar ID tag
  scheduledStartTime: z.date(),
  scheduledEndTime: z.date(),
  location: z.string().max(100).optional(),
})

// Validation function for Discord event data
export const validateDiscordEventData = (calendarEvent: CalendarEvent) => {
  const startTime = calendarEvent.start.dateTime || calendarEvent.start.date
  const endTime = calendarEvent.end.dateTime || calendarEvent.end.date

  if (!startTime) {
    throw new Error('Event must have a start time')
  }

  const scheduledStartTime = new Date(startTime)
  const scheduledEndTime = endTime ? new Date(endTime) : new Date(scheduledStartTime.getTime() + 60 * 60 * 1000)

  if (scheduledStartTime <= new Date()) {
    throw new Error('Event start time must be in the future')
  }

  if (scheduledEndTime <= scheduledStartTime) {
    throw new Error('Event end time must be after start time')
  }

  return discordEventDataSchema.parse({
    name: calendarEvent.summary.substring(0, 100),
    description: calendarEvent.description?.substring(0, 950), // Leave room for calendar ID
    scheduledStartTime,
    scheduledEndTime,
    location: calendarEvent.location?.substring(0, 100),
  })
}

// Type exports
export type GoogleCalendarEvent = z.infer<typeof googleCalendarEventSchema>
export type GoogleCalendarEventsList = z.infer<typeof googleCalendarEventsListSchema>
export type CalendarEvent = z.infer<typeof calendarEventSchema>
export type CalendarDateTime = z.infer<typeof calendarDateTimeSchema>
export type DiscordEventData = z.infer<typeof discordEventDataSchema>
