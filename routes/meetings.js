import express from "express"
import MeetingRoom from "../models/MeetingRoom.js"
import {
  getMeetingRoom,
  addParticipant,
  removeParticipant,
  startMeeting,
  endMeeting,
  addChatMessage,
} from "../utils/meetingRoomService.js"
import auth from "../middleware/auth.js"

const router = express.Router()

// Get Meeting Room Details
router.get("/:roomId", auth, async (req, res, next) => {
  try {
    const room = await getMeetingRoom(req.params.roomId)

    if (!room) {
      return res.status(404).json({ message: "Meeting room not found" })
    }

    res.status(200).json(room)
  } catch (error) {
    next(error)
  }
})

// Join Meeting
router.post("/:roomId/join", auth, async (req, res, next) => {
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

    res.status(200).json({
      message: "Joined meeting",
      room: updatedRoom,
    })
  } catch (error) {
    next(error)
  }
})

// Leave Meeting
router.post("/:roomId/leave", auth, async (req, res, next) => {
  try {
    const room = await removeParticipant(req.params.roomId, req.user.id)

    res.status(200).json({
      message: "Left meeting",
      room,
    })
  } catch (error) {
    next(error)
  }
})

// Start Meeting (Host only)
router.post("/:roomId/start", auth, async (req, res, next) => {
  try {
    const room = await MeetingRoom.findOne({ roomId: req.params.roomId })

    if (!room) {
      return res.status(404).json({ message: "Meeting room not found" })
    }

    if (room.hostId.toString() !== req.user.id) {
      return res.status(403).json({ message: "Only host can start meeting" })
    }

    const updatedRoom = await startMeeting(req.params.roomId)

    res.status(200).json({
      message: "Meeting started",
      room: updatedRoom,
    })
  } catch (error) {
    next(error)
  }
})

// End Meeting (Host only)
router.post("/:roomId/end", auth, async (req, res, next) => {
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

    res.status(200).json({
      message: "Meeting ended",
      room: updatedRoom,
    })
  } catch (error) {
    next(error)
  }
})

// Add Chat Message
router.post("/:roomId/chat", auth, async (req, res, next) => {
  try {
    const { message } = req.body

    if (!message) {
      return res.status(400).json({ message: "Message is required" })
    }

    const room = await addChatMessage(req.params.roomId, req.user.id, req.user.email, message)

    res.status(200).json({
      message: "Message added",
      room,
    })
  } catch (error) {
    next(error)
  }
})

// Get Chat History
router.get("/:roomId/chat", auth, async (req, res, next) => {
  try {
    const room = await getMeetingRoom(req.params.roomId)

    if (!room) {
      return res.status(404).json({ message: "Meeting room not found" })
    }

    res.status(200).json(room.chatHistory)
  } catch (error) {
    next(error)
  }
})

export default router
