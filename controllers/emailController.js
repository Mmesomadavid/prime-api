import Appointment from "../models/Appointment.js"
import Doctor from "../models/doctor.js"
import patient from "../models/patient.js"
import { sendBatchEmails } from "../utils/emailService.js"

// ---------------------
// Send Single Reminder
// ---------------------
export const sendAppointmentReminder = async (req, res) => {
  try {
    const { appointmentId } = req.params

    const appointment = await Appointment.findById(appointmentId)
      .populate("doctorId")
      .populate("patientId")

    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found" })
    }

    if (appointment.status === "cancelled") {
      return res
        .status(400)
        .json({ message: "Cannot send reminder for cancelled appointment" })
    }

    const recipients = appointment.participants.map((p) => ({
      email: p.email,
      name: p.name,
    }))

    const emailData = {
      title: appointment.title,
      startTime: appointment.startTime,
      duration: appointment.duration,
      meetingLink: appointment.meetingRoom?.roomLink,
    }

    await sendBatchEmails(recipients, "appointmentReminder", emailData)

    res.status(200).json({ message: "Reminder sent successfully" })
  } catch (error) {
    console.error("Error sending appointment reminder:", error)
    res
      .status(500)
      .json({ error: "Failed to send reminder", details: error.message })
  }
}

// ---------------------
// Send Bulk Reminders
// ---------------------
export const sendBulkReminders = async (req, res) => {
  try {
    const today = new Date()
    const tomorrow = new Date()
    tomorrow.setDate(today.getDate() + 1)

    const upcomingAppointments = await Appointment.find({
      startTime: { $gte: today, $lte: tomorrow },
      status: { $ne: "cancelled" },
      reminderSent: false,
    })
      .populate("doctorId")
      .populate("patientId")

    let remindersSent = 0

    for (const appointment of upcomingAppointments) {
      const recipients = appointment.participants.map((p) => ({
        email: p.email,
        name: p.name,
      }))

      const emailData = {
        title: appointment.title,
        startTime: appointment.startTime,
        duration: appointment.duration,
        meetingLink: appointment.meetingRoom?.roomLink,
      }

      await sendBatchEmails(recipients, "appointmentReminder", emailData)
      remindersSent += recipients.length

      appointment.reminderSent = true
      await appointment.save()
    }

    res.status(200).json({
      message: "Bulk reminders sent successfully",
      remindersSent,
      appointmentsProcessed: upcomingAppointments.length,
    })
  } catch (error) {
    console.error("Error sending bulk reminders:", error)
    res
      .status(500)
      .json({ error: "Failed to send bulk reminders", details: error.message })
  }
}

// ---------------------
// Resend Invitation
// ---------------------
export const resendInvitation = async (req, res, next) => {
  try {
    const { appointmentId } = req.params
    const { recipientType } = req.body

    const appointment = await Appointment.findById(appointmentId)

    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found" })
    }

    const recipients =
      recipientType === "both"
        ? appointment.participants
        : appointment.participants.filter((p) => p.role === recipientType)

    const emailData = {
      title: appointment.title,
      startTime: appointment.startTime,
      duration: appointment.duration,
      meetingLink: appointment.meetingRoom?.roomLink,
      acceptLink: `${process.env.FRONTEND_URL}/appointments/${appointment._id}/accept`,
      declineLink: `${process.env.FRONTEND_URL}/appointments/${appointment._id}/decline`,
    }

    const emailRecipients = recipients.map((p) => ({
      email: p.email,
      name: p.name,
    }))

    await sendBatchEmails(emailRecipients, "appointmentInvitation", emailData)

    res.status(200).json({ message: "Invitation resent successfully" })
  } catch (error) {
    next(error)
  }
}

// ---------------------
// Send Custom Email
// ---------------------
export const sendCustomEmail = async (req, res) => {
  try {
    const { recipientEmail, subject, htmlContent } = req.body
    const userId = req.user.id

    if (!recipientEmail || !subject || !htmlContent) {
      return res.status(400).json({
        error: "recipientEmail, subject, and htmlContent are required",
      })
    }

    // Only doctors can send custom emails
    const doctor = await Doctor.findOne({ userId })
    if (!doctor) {
      return res
        .status(403)
        .json({ error: "Only doctors can send custom emails" })
    }

    await sendBatchEmails([{ email: recipientEmail }], "customEmail", {
      subject,
      htmlContent,
    })

    res.status(200).json({ message: "Email sent successfully" })
  } catch (error) {
    console.error("Error sending custom email:", error)
    res
      .status(500)
      .json({ error: "Failed to send email", details: error.message })
  }
}
