// WebSocket handlers for real-time meeting events
export const setupMeetingEvents = (io, socket) => {
  // Join meeting room
  socket.on("join-meeting", (data) => {
    const { roomId, userId, name } = data
    socket.join(`meeting-${roomId}`)

    io.to(`meeting-${roomId}`).emit("participant-joined", {
      userId,
      name,
      timestamp: new Date(),
    })
  })

  // Leave meeting room
  socket.on("leave-meeting", (data) => {
    const { roomId, userId, name } = data
    socket.leave(`meeting-${roomId}`)

    io.to(`meeting-${roomId}`).emit("participant-left", {
      userId,
      name,
      timestamp: new Date(),
    })
  })

  // Share screen
  socket.on("screen-share-start", (data) => {
    const { roomId, userId, name } = data
    io.to(`meeting-${roomId}`).emit("screen-share-started", {
      userId,
      name,
      timestamp: new Date(),
    })
  })

  socket.on("screen-share-stop", (data) => {
    const { roomId, userId } = data
    io.to(`meeting-${roomId}`).emit("screen-share-stopped", {
      userId,
      timestamp: new Date(),
    })
  })

  // Chat message
  socket.on("send-chat", (data) => {
    const { roomId, userId, name, message } = data
    io.to(`meeting-${roomId}`).emit("receive-chat", {
      userId,
      name,
      message,
      timestamp: new Date(),
    })
  })

  // Mute/Unmute audio
  socket.on("toggle-audio", (data) => {
    const { roomId, userId, isAudioEnabled } = data
    io.to(`meeting-${roomId}`).emit("audio-toggled", {
      userId,
      isAudioEnabled,
      timestamp: new Date(),
    })
  })

  // Mute/Unmute video
  socket.on("toggle-video", (data) => {
    const { roomId, userId, isVideoEnabled } = data
    io.to(`meeting-${roomId}`).emit("video-toggled", {
      userId,
      isVideoEnabled,
      timestamp: new Date(),
    })
  })

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id)
  })
}
