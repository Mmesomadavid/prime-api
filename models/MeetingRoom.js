import mongoose from "mongoose"

const meetingRoomSchema = new mongoose.Schema(
  {
    // Room Identification
    roomId: {
      type: String,
      unique: true,
      required: true,
    },
    roomName: String,
    accessCode: {
      type: String,
      unique: true,
      required: true,
    },
    password: String,

    // Host Info
    hostId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Appointment Reference
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Appointment",
      required: true,
    },

    // Meeting Control
    isActive: {
      type: Boolean,
      default: false,
    },
    startedAt: Date,
    endedAt: Date,
    isRecording: {
      type: Boolean,
      default: false,
    },
    recordingId: String,

    // Participants
    participants: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        name: String,
        email: String,
        role: {
          type: String,
          enum: ["host", "co-host", "participant", "observer"],
          default: "participant",
        },
        joinedAt: Date,
        leftAt: Date,
        isAudioEnabled: Boolean,
        isVideoEnabled: Boolean,
      },
    ],

    // Settings
    maxParticipants: {
      type: Number,
      default: 100,
    },
    allowRecording: {
      type: Boolean,
      default: true,
    },
    waitingRoomEnabled: {
      type: Boolean,
      default: false,
    },
    screenShareEnabled: {
      type: Boolean,
      default: true,
    },
    chatEnabled: {
      type: Boolean,
      default: true,
    },

    // Chat History
    chatHistory: [
      {
        userId: mongoose.Schema.Types.ObjectId,
        name: String,
        message: String,
        timestamp: Date,
      },
    ],

    // Meeting Statistics
    totalDuration: Number, // in seconds
    peakParticipants: Number,
  },
  { timestamps: true },
)

meetingRoomSchema.index({ roomId: 1 })
meetingRoomSchema.index({ appointmentId: 1 })
meetingRoomSchema.index({ hostId: 1 })

export default mongoose.model("MeetingRoom", meetingRoomSchema)
