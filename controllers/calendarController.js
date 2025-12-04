import Doctor from "../models/doctor.js"
import Appointment from "../models/Appointment.js"
import googleCalendarService from "../utils/googleCalendarService"

export const linkGoogleCalendar = async (req, res, next) => {
  try {
    const { accessToken, refreshToken, googleId } = req.body
    const userId = req.user.id

    const doctor = await Doctor.findOne({ userId })
    if (!doctor) {
      return res.status(404).json({ message: "Doctor profile not found" })
    }

    doctor.googleId = googleId
    doctor.googleAccessToken = accessToken
    doctor.googleRefreshToken = refreshToken
    doctor.googleCalendarLinked = true

    await doctor.save()

    res.status(200).json({ message: "Google Calendar linked successfully" })
  } catch (error) {
    next(error)
  }
}

export const unlinkGoogleCalendar = async (req, res, next) => {
  try {
    const userId = req.user.id

    const doctor = await Doctor.findOne({ userId })
    if (!doctor) {
      return res.status(404).json({ message: "Doctor profile not found" })
    }

    doctor.googleId = null
    doctor.googleAccessToken = null
    doctor.googleRefreshToken = null
    doctor.googleCalendarLinked = false

    await doctor.save()

    res.status(200).json({ message: "Google Calendar unlinked successfully" })
  } catch (error) {
    next(error)
  }
}

// Get available time slots for doctor
export const getAvailableSlots = async (req, res) => {
  try {
    const { doctorId, date, slotDuration = 30 } = req.query

    if (!doctorId || !date) {
      return res.status(400).json({ error: "doctorId and date are required" })
    }

    const doctor = await Doctor.findById(doctorId)
    if (!doctor) {
      return res.status(404).json({ error: "Doctor not found" })
    }

    // Get doctor's working hours (can be set in doctor profile)
    const workingHours = doctor.workingHours || {
      start: "09:00",
      end: "17:00",
    }

    const availableSlots = await googleCalendarService.getAvailableSlots(
      doctor.googleId,
      new Date(date),
      Number.parseInt(slotDuration),
      workingHours,
    )

    res.status(200).json({ availableSlots })
  } catch (error) {
    console.error("Error fetching available slots:", error)
    res.status(500).json({ error: "Failed to fetch available slots", details: error.message })
  }
}

// Sync appointment to Google Calendar
export const syncToGoogleCalendar = async (req, res, next) => {
  try {
    const { appointmentId } = req.params
    const userId = req.user.id

    const doctor = await Doctor.findOne({ userId })
    if (!doctor || !doctor.googleCalendarLinked) {
      return res.status(400).json({ error: "Google Calendar not linked" })
    }

    // Fetch appointment details
    const appointment = await Appointment.findById(appointmentId).populate("patient")

    if (!appointment) {
      return res.status(404).json({ error: "Appointment not found" })
    }

    // Add to Google Calendar
    const event = await googleCalendarService.addEventToCalendar(doctor.googleId, {
      title: appointment.title,
      description: appointment.description,
      startTime: appointment.startTime,
      endTime: appointment.endTime,
      attendees: [appointment.patient.userId.email],
      location: appointment.type === "virtual" ? "Virtual Meeting" : appointment.location,
    })

    res.status(201).json({ message: "Appointment synced to Google Calendar", event })
  } catch (error) {
    next(error)
  }
}

// Get calendar events
export const getCalendarEvents = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query
    const userId = req.user.id

    const doctor = await Doctor.findOne({ userId })
    if (!doctor || !doctor.googleCalendarLinked) {
      return res.status(400).json({ error: "Google Calendar not linked" })
    }

    const events = await googleCalendarService.getCalendarEvents(
      doctor.googleId,
      new Date(startDate),
      new Date(endDate),
    )

    res.status(200).json({ events })
  } catch (error) {
    next(error)
  }
}

// Check Google Calendar sync status
export const getSyncStatus = async (req, res, next) => {
  try {
    const userId = req.user.id

    const doctor = await Doctor.findOne({ userId })
    if (!doctor) {
      return res.status(404).json({ message: "Doctor profile not found" })
    }

    res.status(200).json({
      calendarLinked: doctor.googleCalendarLinked,
      googleId: doctor.googleId || null,
    })
  } catch (error) {
    next(error)
  }
}
