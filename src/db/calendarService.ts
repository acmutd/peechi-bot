import { calendar_v3, google } from 'googleapis'
import { getEnv } from '../utils/env'
import { Logger } from '../utils/logger'
import {
  googleCalendarEventsListSchema,
  googleCalendarEventSchema,
  transformGoogleCalendarEvent,
  type CalendarEvent,
} from '../types/calendar'

class CalendarService {
  private calendar: calendar_v3.Calendar | null = null

  async initialize() {
    if (this.calendar) return this.calendar

    try {
      const env = await getEnv()

      this.calendar = google.calendar({ version: 'v3', auth: env.CALENDAR_API_KEY })
      Logger.info('Google Calendar service initialized')
      return this.calendar
    } catch (error) {
      Logger.error('Failed to initialize Google Calendar service:', error)
      throw new Error('Calendar service initialization failed')
    }
  }

  async getUpcomingEvents(maxResults: number): Promise<CalendarEvent[]> {
    try {
      const calendar = await this.initialize()
      const env = await getEnv()

      const now = new Date()
      const oneMonthFromNow = new Date()
      oneMonthFromNow.setMonth(now.getMonth() + 1)

      const response = await calendar.events.list({
        calendarId: env.CALENDAR_ID,
        timeMin: now.toISOString(),
        timeMax: oneMonthFromNow.toISOString(),
        maxResults,
        singleEvents: true,
        orderBy: 'startTime',
      })

      const validatedResponse = googleCalendarEventsListSchema.parse(response.data)
      const events = validatedResponse.items || []

      Logger.info(`Fetched ${events.length} events from Google Calendar`)

      return events
        .map(event => {
          try {
            const validatedEvent = googleCalendarEventSchema.parse(event)
            return transformGoogleCalendarEvent(validatedEvent)
          } catch (validationError) {
            Logger.warn(`Skipping invalid calendar event ${event.id}:`, validationError)
            return null
          }
        })
        .filter((event): event is CalendarEvent => event !== null)
    } catch (error) {
      Logger.error('Failed to fetch calendar events:', error)
      throw new Error('Failed to fetch calendar events')
    }
  }

  async getEventById(eventId: string): Promise<CalendarEvent | null> {
    try {
      const calendar = await this.initialize()
      const env = await getEnv()

      const response = await calendar.events.get({
        calendarId: env.CALENDAR_ID,
        eventId,
      })

      const event = response.data
      if (!event) return null

      // Validate and transform the event using Zod schema
      try {
        const validatedEvent = googleCalendarEventSchema.parse(event)
        return transformGoogleCalendarEvent(validatedEvent)
      } catch (validationError) {
        Logger.error(`Invalid calendar event data for ${eventId}:`, validationError)
        return null
      }
    } catch (error) {
      Logger.error(`Failed to fetch calendar event ${eventId}:`, error)
      return null
    }
  }
}

export default new CalendarService()
