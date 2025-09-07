import { getEnv } from '../utils/env'
import { Logger } from '../utils/logger'
import {
  googleCalendarEventsListSchema,
  googleCalendarEventSchema,
  transformGoogleCalendarEvent,
  type CalendarEvent,
} from '../types/calendar'

class CalendarService {
  private baseUrl = 'https://www.googleapis.com/calendar/v3'
  private apiKey: string | null = null

  async initialize() {
    if (this.apiKey) return this.apiKey

    try {
      const env = await getEnv()
      this.apiKey = env.CALENDAR_API_KEY
      Logger.info('Google Calendar service initialized')
      return this.apiKey
    } catch (error) {
      Logger.error('Failed to initialize Google Calendar service:', error)
      throw new Error('Calendar service initialization failed')
    }
  }

  async getUpcomingEvents(maxResults: number): Promise<CalendarEvent[]> {
    try {
      const apiKey = await this.initialize()
      const env = await getEnv()

      const now = new Date()
      const oneMonthFromNow = new Date()
      oneMonthFromNow.setMonth(now.getMonth() + 1)

      const params = new URLSearchParams({
        key: apiKey,
        timeMin: now.toISOString(),
        timeMax: oneMonthFromNow.toISOString(),
        maxResults: maxResults.toString(),
        singleEvents: 'true',
        orderBy: 'startTime',
      })

      const url = `${this.baseUrl}/calendars/${encodeURIComponent(env.CALENDAR_ID)}/events?${params}`

      const response = await fetch(url)

      if (!response.ok) {
        throw new Error(`Google Calendar API error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      const validatedResponse = googleCalendarEventsListSchema.parse(data)
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
      const apiKey = await this.initialize()
      const env = await getEnv()

      const params = new URLSearchParams({
        key: apiKey,
      })

      const url = `${this.baseUrl}/calendars/${encodeURIComponent(env.CALENDAR_ID)}/events/${encodeURIComponent(eventId)}?${params}`

      const response = await fetch(url)

      if (!response.ok) {
        if (response.status === 404) {
          Logger.warn(`Calendar event ${eventId} not found`)
          return null
        }
        throw new Error(`Google Calendar API error: ${response.status} ${response.statusText}`)
      }

      const event = await response.json()
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
