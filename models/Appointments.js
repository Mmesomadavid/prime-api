import mongoose from "mongoose"

const appointmentSchema = new mongoose.Schema(
  {
    // Basic Info
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: String,
    status: {
      type: String,
      enum: ["scheduled", "confirmed", "cancelled", "completed", "no-show"],
      default: "scheduled",
    },

    // Participants
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Doctor",
      required: true,
    },
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Patient",
      required: true,
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Timing
    startTime: {
      type: Date,
      required: true,
    },
    endTime: {
      type: Date,
      required: true,
    },
    duration: {
      type: Number,
      required: true, // in minutes
    },
    timezone: {
      type: String,
      default: "UTC",
    },

    // Appointment Type
    appointmentType: {
      type: String,
      enum: ["in-person", "virtual", "phone"],
      default: "virtual",
    },

    // Virtual Meeting Details
    meetingRoom: {
      roomId: String,
      roomLink: String,
      accessCode: String,
      password: String,
    },

    // Location (for in-person)
    location: String,

    // Google Calendar Integration
    googleCalendarEventId: String,
    googleCalendarLink: String,

    // Participants List
    participants: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        email: String,
        name: String,
        role: {
          type: String,
          enum: ["doctor", "patient", "observer"],
        },
        joinedAt: Date,
        status: {
          type: String,
          enum: ["invited", "accepted", "declined", "joined"],
          default: "invited",
        },
      },
    ],

    // Notes & Records
    notes: String,
    attachments: [
      {
        name: String,
        url: String,
      },
    ],

    // Reminders
    reminderSent: {
      email: {
        type: Boolean,
        default: false,
      },
      sms: {
        type: Boolean,
        default: false,
      },
    },

    // Recurrence (for recurring appointments)
    isRecurring: {
      type: Boolean,
      default: false,
    },
    recurrencePattern: {
      frequency: {
        type: String,
        enum: ["daily", "weekly", "biweekly", "monthly", "yearly"],
      },
      interval: Number, // every N frequency
      endDate: Date,
      daysOfWeek: [String], // for weekly
    },

    // Meeting Metadata
    meetingMetadata: {
      totalParticipants: Number,
      recordingUrl: String,
      recordingId: String,
      transcript: String,
    },
  },
  { timestamps: true },
)

// Index for efficient queries
appointmentSchema.index({ doctorId: 1, startTime: 1 })
appointmentSchema.index({ patientId: 1, startTime: 1 })
appointmentSchema.index({ organizationId: 1, startTime: 1 })
appointmentSchema.index({ createdBy: 1, startTime: 1 })
appointmentSchema.index({ status: 1 })

export default mongoose.model("Appointment", appointmentSchema)
