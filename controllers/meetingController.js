import MeetingRoom from "../models/MeetingRoom.js"
import {
  getMeetingRoom,
  addParticipant,
  removeParticipant,
  startMeeting,
  endMeeting,
addChatMessage,
} from "../utils/meetingRoomService.js"

// Join meeting room
export const joinMeeting = async (req, res, next) => {
  try {
    const { name } = req.body
    const room = await getMeetingRoom(req.params.roomId)

    if (!room) {
      return res.status(404).json({ message: "Meeting room not found" })
    }

    const participantData = {
      userId: req.user.id,
      name: name || req.user.email,
      email: req.user.email,
      role: room.hostId.toString() === req.user.id ? "host" : "participant",
    }

    const updatedRoom = await addParticipant(req.params.roomId, participantData)

    res.status(200).json({ message: "Joined meeting", room: updatedRoom })
  } catch (error) {
    next(error)
  }
}

// Leave meeting room
export const leaveMeeting = async (req, res, next) => {
  try {
    const room = await removeParticipant(req.params.roomId, req.user.id)

    res.status(200).json({ message: "Left meeting", room })
  } catch (error) {
    next(error)
  }
}

export const getMeeting = async (req, res, next) => {
  try {
    const room = await getMeetingRoom(req.params.roomId)

    if (!room) {
      return res.status(404).json({ message: "Meeting room not found" })
    }

    res.status(200).json(room)
  } catch (error) {
    next(error)
  }
}

export const startMeetingHandler = async (req, res, next) => {
  try {
    const room = await MeetingRoom.findOne({ roomId: req.params.roomId })

    if (!room) {
      return res.status(404).json({ message: "Meeting room not found" })
    }

    if (room.hostId.toString() !== req.user.id) {
      return res.status(403).json({ message: "Only host can start meeting" })
    }

    const updatedRoom = await startMeeting(req.params.roomId)

    res.status(200).json({ message: "Meeting started", room: updatedRoom })
  } catch (error) {
    next(error)
  }
}

export const endMeetingHandler = async (req, res, next) => {
  try {
    const { recordingId } = req.body
    const room = await MeetingRoom.findOne({ roomId: req.params.roomId })

    if (!room) {
      return res.status(404).json({ message: "Meeting room not found" })
    }

    if (room.hostId.toString() !== req.user.id) {
      return res.status(403).json({ message: "Only host can end meeting" })
    }

    const updatedRoom = await endMeeting(req.params.roomId, recordingId)

    res.status(200).json({ message: "Meeting ended", room: updatedRoom })
  } catch (error) {
    next(error)
  }
}

export const sendChatMessage = async (req, res, next) => {
  try {
    const { message } = req.body

    if (!message) {
      return res.status(400).json({ message: "Message is required" })
    }

    const room = await addChatMessage(req.params.roomId, req.user.id, req.user.email, message)

    res.status(200).json({ message: "Message added", room })
  } catch (error) {
    next(error)
  }
}

export const getChatHistory = async (req, res, next) => {
  try {
    const room = await getMeetingRoom(req.params.roomId)

    if (!room) {
      return res.status(404).json({ message: "Meeting room not found" })
    }

    res.status(200).json(room.chatHistory)
  } catch (error) {
    next(error)
  }
}

// Get active meetings for user
export const getActiveMeetings = async (req, res, next) => {
  try {
    const userId = req.user.id

    const meetings = await MeetingRoom.find({
      "participants.userId": userId,
      status: { $in: ["waiting", "in-progress"] },
    })
      .populate("participants.userId", "name email")
      .populate("activeParticipants.userId", "name")
      .sort({ createdAt: -1 })

    res.status(200).json({ meetings })
  } catch (error) {
    next(error)
  }
}
