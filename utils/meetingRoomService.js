import { v4 as uuidv4 } from "uuid"
import crypto from "crypto"
import MeetingRoom from "../models/MeetingRoom"

// Generate unique room identifiers
export const generateMeetingRoom = async (appointmentId, hostId) => {
  const roomId = `room-${uuidv4().slice(0, 8)}`
  const accessCode = generateAccessCode()
  const password = generatePassword()

  const meetingRoom = await MeetingRoom.create({
    roomId,
    roomName: `Meeting-${Date.now()}`,
    accessCode,
    password,
    hostId,
    appointmentId,
    isActive: false,
  })

  return {
    roomId: meetingRoom.roomId,
    roomLink: `${process.env.MEETING_BASE_URL}/room/${meetingRoom.roomId}`,
    accessCode,
    password,
    roomData: meetingRoom,
  }
}

// Generate access code
const generateAccessCode = () => {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

// Generate random password
const generatePassword = () => {
  return crypto.randomBytes(6).toString("hex").toUpperCase()
}

// Get room by ID
export const getMeetingRoom = async (roomId) => {
  return await MeetingRoom.findOne({ roomId }).populate("participants.userId")
}

// Add participant to room
export const addParticipant = async (roomId, participantData) => {
  const room = await MeetingRoom.findOne({ roomId })
  if (!room) throw new Error("Room not found")

  const participant = {
    userId: participantData.userId,
    name: participantData.name,
    email: participantData.email,
    role: participantData.role || "participant",
    joinedAt: new Date(),
    isAudioEnabled: true,
    isVideoEnabled: true,
  }

  room.participants.push(participant)
  room.isActive = true

  await room.save()
  return room
}

// Remove participant
export const removeParticipant = async (roomId, userId) => {
  const room = await MeetingRoom.findOne({ roomId })
  if (!room) throw new Error("Room not found")

  room.participants = room.participants.map((p) => {
    if (p.userId.toString() === userId.toString()) {
      p.leftAt = new Date()
    }
    return p
  })

  await room.save()
  return room
}

// Start meeting
export const startMeeting = async (roomId) => {
  const room = await MeetingRoom.findOne({ roomId })
  if (!room) throw new Error("Room not found")

  room.isActive = true
  room.startedAt = new Date()
  await room.save()

  return room
}

// End meeting
export const endMeeting = async (roomId, recordingId = null) => {
  const room = await MeetingRoom.findOne({ roomId })
  if (!room) throw new Error("Room not found")

  room.isActive = false
  room.endedAt = new Date()
  room.totalDuration = Math.floor(
    (room.endedAt - room.startedAt) / 1000, // in seconds
  )

  if (recordingId) {
    room.recordingId = recordingId
  }

  await room.save()
  return room
}

// Add chat message
export const addChatMessage = async (roomId, userId, name, message) => {
  const room = await MeetingRoom.findOne({ roomId })
  if (!room) throw new Error("Room not found")

  room.chatHistory.push({
    userId,
    name,
    message,
    timestamp: new Date(),
  })

  await room.save()
  return room
}

export default {
  generateMeetingRoom,
  getMeetingRoom,
  addParticipant,
  removeParticipant,
  startMeeting,
  endMeeting,
  addChatMessage,
}
