import { google } from "googleapis"
import dotenv from "dotenv"

dotenv.config()

// Initialize OAuth2 client
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URL,
)

// Create calendar instance
const calendar = google.calendar({ version: "v3", auth: oauth2Client })

// Get user's access token (stored in database or session)
export const getCalendarClient = (accessToken) => {
  oauth2Client.setCredentials({
    access_token: accessToken,
  })
  return google.calendar({ version: "v3", auth: oauth2Client })
}

// Create event in Google Calendar
export const createCalendarEvent = async (accessToken, eventData) => {
  try {
    const calendarClient = getCalendarClient(accessToken)

    const event = {
      summary: eventData.title,
      description: eventData.description || "",
      start: {
        dateTime: new Date(eventData.startTime).toISOString(),
        timeZone: eventData.timezone || "UTC",
      },
      end: {
        dateTime: new Date(eventData.endTime).toISOString(),
        timeZone: eventData.timezone || "UTC",
      },
      attendees: eventData.attendees || [], // [{email: 'user@example.com'}]
      conferenceData: {
        createRequest: {
          requestId: `appointment-${Date.now()}`,
          conferenceSolutionKey: {
            key: "hangoutsMeet",
          },
        },
      },
      reminders: {
        useDefault: true,
      },
    }

    const response = await calendarClient.events.insert({
      calendarId: "primary",
      resource: event,
      conferenceDataVersion: 1,
    })

    return {
      eventId: response.data.id,
      eventLink: response.data.htmlLink,
      conferenceLink: response.data.conferenceData?.entryPoints?.[0]?.uri,
    }
  } catch (error) {
    console.error("Error creating calendar event:", error)
    throw error
  }
}

// Update calendar event
export const updateCalendarEvent = async (accessToken, eventId, eventData) => {
  try {
    const calendarClient = getCalendarClient(accessToken)

    const event = {
      summary: eventData.title,
      description: eventData.description || "",
      start: {
        dateTime: new Date(eventData.startTime).toISOString(),
        timeZone: eventData.timezone || "UTC",
      },
      end: {
        dateTime: new Date(eventData.endTime).toISOString(),
        timeZone: eventData.timezone || "UTC",
      },
      attendees: eventData.attendees || [],
    }

    const response = await calendarClient.events.update({
      calendarId: "primary",
      eventId,
      resource: event,
    })

    return response.data
  } catch (error) {
    console.error("Error updating calendar event:", error)
    throw error
  }
}

// Delete calendar event
export const deleteCalendarEvent = async (accessToken, eventId) => {
  try {
    const calendarClient = getCalendarClient(accessToken)

    await calendarClient.events.delete({
      calendarId: "primary",
      eventId,
    })

    return true
  } catch (error) {
    console.error("Error deleting calendar event:", error)
    throw error
  }
}

// Get available time slots
export const getAvailableSlots = async (accessToken, date, slotDuration = 60) => {
  try {
    const calendarClient = getCalendarClient(accessToken)
    const startOfDay = new Date(date)
    startOfDay.setHours(0, 0, 0, 0)
    const endOfDay = new Date(date)
    endOfDay.setHours(23, 59, 59, 999)

    const events = await calendarClient.events.list({
      calendarId: "primary",
      timeMin: startOfDay.toISOString(),
      timeMax: endOfDay.toISOString(),
      singleEvents: true,
      orderBy: "startTime",
    })

    const busySlots = events.data.items || []
    const availableSlots = []

    // Generate 30-min slots throughout the day (9 AM to 6 PM)
    const dayStart = new Date(date)
    dayStart.setHours(9, 0, 0, 0)
    const dayEnd = new Date(date)
    dayEnd.setHours(18, 0, 0, 0)

    for (let time = dayStart; time < dayEnd; time.setMinutes(time.getMinutes() + 30)) {
      const slotEnd = new Date(time.getTime() + slotDuration * 60000)

      const isAvailable = !busySlots.some((event) => {
        const eventStart = new Date(event.start.dateTime || event.start.date)
        const eventEnd = new Date(event.end.dateTime || event.end.date)
        return time < eventEnd && slotEnd > eventStart
      })

      if (isAvailable) {
        availableSlots.push({
          startTime: new Date(time),
          endTime: slotEnd,
        })
      }
    }

    return availableSlots
  } catch (error) {
    console.error("Error fetching available slots:", error)
    throw error
  }
}

export default {
  getCalendarClient,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  getAvailableSlots,
}
