import Appointment from "../models/Appointment.js"
import Doctor from "../models/doctor.js"
import Patient from "../models/patient.js"
import { sendBatchEmails } from "../utils/emailService.js"
import { generateMeetingRoom } from "../utils/meetingRoomService.js"
import { createCalendarEvent, updateCalendarEvent, deleteCalendarEvent } from "../utils/googleCalendarService.js"

// Create appointment by Doctor or Organization
export const createAppointment = async (req, res, next) => {
  try {
    const {
      title,
      description,
      doctorId,
      patientId,
      organizationId,
      startTime,
      duration,
      appointmentType,
      location,
      timezone,
    } = req.body

    // Validation
    if (!title || !doctorId || !patientId || !startTime || !duration) {
      return res.status(400).json({ message: "Missing required fields" })
    }

    const doctor = await Doctor.findById(doctorId).populate("user")
    if (!doctor) return res.status(404).json({ message: "Doctor not found" })

    const patient = await Patient.findById(patientId)
    if (!patient) return res.status(404).json({ message: "Patient not found" })

    const existingAppointment = await Appointment.findOne({
      doctorId,
      startTime: {
        $gte: new Date(startTime),
        $lt: new Date(new Date(startTime).getTime() + duration * 60000),
      },
      status: { $ne: "cancelled" },
    })

    if (existingAppointment) {
      return res.status(409).json({ message: "Doctor has a conflicting appointment" })
    }

    const endTime = new Date(new Date(startTime).getTime() + duration * 60000)

    const appointment = new Appointment({
      title,
      description,
      doctorId,
      patientId,
      organizationId,
      createdBy: req.user.id,
      startTime,
      endTime,
      duration,
      appointmentType,
      location,
      timezone: timezone || "UTC",
      status: "scheduled",
    })

    // Generate meeting room for virtual appointments
    let meetingRoom = null
    if (appointmentType === "virtual") {
      meetingRoom = await generateMeetingRoom(appointment._id, doctor.user._id)
      appointment.meetingRoom = {
        roomId: meetingRoom.roomId,
        roomLink: meetingRoom.roomLink,
        accessCode: meetingRoom.accessCode,
        password: meetingRoom.password,
      }
    }

    appointment.participants = [
      {
        userId: doctor.user._id,
        email: doctor.email,
        name: `${doctor.firstName} ${doctor.lastName}`,
        role: "doctor",
        status: "accepted",
      },
      {
        userId: patient.createdBy,
        email: patient.email,
        name: `${patient.firstName} ${patient.lastName}`,
        role: "patient",
        status: "invited",
      },
    ]

    await appointment.save()

    // Send invitation emails
    const recipients = appointment.participants.map((p) => ({
      email: p.email,
      name: p.name,
    }))

    const emailData = {
      title: appointment.title,
      description: appointment.description,
      appointmentType: appointment.appointmentType,
      startTime: appointment.startTime,
      duration: appointment.duration,
      location: appointment.location,
      meetingLink: appointment.meetingRoom?.roomLink,
      accessCode: appointment.meetingRoom?.accessCode,
    }

    await sendBatchEmails(recipients, "appointmentInvitation", emailData)

    // Sync to Google Calendar
    if (doctor.user.googleId) {
      try {
        const googleEvent = await createCalendarEvent(doctor.user.googleId, {
          title: appointment.title,
          description: appointment.description,
          startTime: appointment.startTime,
          endTime: appointment.endTime,
          timezone: appointment.timezone,
          attendees: appointment.participants.map((p) => ({ email: p.email })),
        })

        appointment.googleCalendarEventId = googleEvent.eventId
        appointment.googleCalendarLink = googleEvent.eventLink
        await appointment.save()
      } catch (error) {
        console.error("Error syncing to Google Calendar:", error)
      }
    }

    res.status(201).json({
      message: "Appointment created successfully",
      appointment,
    })
  } catch (error) {
    next(error)
  }
}

export const getAppointments = async (req, res, next) => {
  try {
    const { status, startDate, endDate, type } = req.query
    const userId = req.user.id

    const query = {
      $or: [{ createdBy: userId }, { "participants.userId": userId }],
    }

    if (status) query.status = status
    if (type) query.appointmentType = type

    if (startDate || endDate) {
      query.startTime = {}
      if (startDate) query.startTime.$gte = new Date(startDate)
      if (endDate) query.startTime.$lte = new Date(endDate)
    }

    const appointments = await Appointment.find(query).populate("doctorId").populate("patientId").sort({ startTime: 1 })

    res.status(200).json(appointments)
  } catch (error) {
    next(error)
  }
}

export const getAppointmentById = async (req, res, next) => {
  try {
    const appointment = await Appointment.findById(req.params.appointmentId)
      .populate("doctorId")
      .populate("patientId")
      .populate("organizationId")

    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found" })
    }

    const hasAccess =
      appointment.createdBy.toString() === req.user.id ||
      appointment.participants.some((p) => p.userId?.toString() === req.user.id)

    if (!hasAccess) {
      return res.status(403).json({ message: "Access denied" })
    }

    res.status(200).json(appointment)
  } catch (error) {
    next(error)
  }
}

export const updateAppointment = async (req, res, next) => {
  try {
    const appointment = await Appointment.findById(req.params.appointmentId)

    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found" })
    }

    if (appointment.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ message: "Access denied" })
    }

    const { title, description, startTime, duration, status, location } = req.body

    if (title) appointment.title = title
    if (description) appointment.description = description
    if (location) appointment.location = location
    if (status) appointment.status = status

    if (startTime || duration) {
      const newStartTime = startTime || appointment.startTime
      const newDuration = duration || appointment.duration
      const newEndTime = new Date(new Date(newStartTime).getTime() + newDuration * 60000)

      const conflict = await Appointment.findOne({
        _id: { $ne: appointment._id },
        doctorId: appointment.doctorId,
        startTime: { $gte: newStartTime, $lt: newEndTime },
        status: { $ne: "cancelled" },
      })

      if (conflict) {
        return res.status(409).json({ message: "Conflicting appointment exists" })
      }

      appointment.startTime = newStartTime
      appointment.endTime = newEndTime
      appointment.duration = newDuration
    }

    await appointment.save()

    if (appointment.googleCalendarEventId && startTime) {
      try {
        const doctor = await Doctor.findById(appointment.doctorId).populate("user")
        await updateCalendarEvent(doctor.user.googleId, appointment.googleCalendarEventId, {
          title: appointment.title,
          description: appointment.description,
          startTime: appointment.startTime,
          endTime: appointment.endTime,
        })
      } catch (error) {
        console.error("Error updating calendar:", error)
      }
    }

    res.status(200).json({ message: "Appointment updated successfully", appointment })
  } catch (error) {
    next(error)
  }
}

export const cancelAppointment = async (req, res, next) => {
  try {
    const appointment = await Appointment.findById(req.params.appointmentId)

    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found" })
    }

    if (appointment.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ message: "Access denied" })
    }

    appointment.status = "cancelled"
    await appointment.save()

    const recipients = appointment.participants.map((p) => ({
      email: p.email,
      name: p.name,
    }))

    await sendBatchEmails(recipients, "appointmentCancellation", {
      title: appointment.title,
      startTime: appointment.startTime,
      reason: req.body.reason || "No reason provided",
    })

    if (appointment.googleCalendarEventId) {
      try {
        const doctor = await Doctor.findById(appointment.doctorId).populate("user")
        await deleteCalendarEvent(doctor.user.googleId, appointment.googleCalendarEventId)
      } catch (error) {
        console.error("Error deleting calendar event:", error)
      }
    }

    res.status(200).json({ message: "Appointment cancelled successfully" })
  } catch (error) {
    next(error)
  }
}

export const acceptAppointment = async (req, res, next) => {
  try {
    const appointment = await Appointment.findById(req.params.appointmentId)

    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found" })
    }

    appointment.participants = appointment.participants.map((p) => {
      if (p.userId?.toString() === req.user.id) {
        p.status = "accepted"
      }
      return p
    })

    await appointment.save()

    res.status(200).json({ message: "Appointment accepted", appointment })
  } catch (error) {
    next(error)
  }
}

export const declineAppointment = async (req, res, next) => {
  try {
    const appointment = await Appointment.findById(req.params.appointmentId)

    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found" })
    }

    appointment.participants = appointment.participants.map((p) => {
      if (p.userId?.toString() === req.user.id) {
        p.status = "declined"
      }
      return p
    })

    await appointment.save()

    res.status(200).json({ message: "Appointment declined", appointment })
  } catch (error) {
    next(error)
  }
}

export const getAvailableSlots = async (req, res, next) => {
  try {
    const { doctorId, date, duration = 60 } = req.query

    if (!doctorId || !date) {
      return res.status(400).json({ message: "doctorId and date are required" })
    }

    const doctor = await Doctor.findById(doctorId)
    if (!doctor) {
      return res.status(404).json({ message: "Doctor not found" })
    }

    const targetDate = new Date(date)
    const dayStart = new Date(targetDate)
    dayStart.setHours(0, 0, 0, 0)
    const dayEnd = new Date(targetDate)
    dayEnd.setHours(23, 59, 59, 999)

    const bookedAppointments = await Appointment.find({
      doctorId,
      startTime: { $gte: dayStart, $lte: dayEnd },
      status: { $ne: "cancelled" },
    })

    const availableSlots = []
    const slotStart = new Date(targetDate)
    slotStart.setHours(9, 0, 0, 0)
    const slotEnd = new Date(targetDate)
    slotEnd.setHours(18, 0, 0, 0)

    for (let time = new Date(slotStart); time < slotEnd; ) {
      const slotEndTime = new Date(time.getTime() + Number.parseInt(duration) * 60000)

      const isBooked = bookedAppointments.some(
        (apt) => time < new Date(apt.endTime) && slotEndTime > new Date(apt.startTime),
      )

      if (!isBooked) {
        availableSlots.push({ startTime: new Date(time), endTime: slotEndTime })
      }

      time = new Date(time.getTime() + 30 * 60000)
    }

    res.status(200).json(availableSlots)
  } catch (error) {
    next(error)
  }
}
