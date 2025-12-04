// WebSocket handlers for real-time appointment updates
export const setupAppointmentEvents = (io, socket) => {
  // Subscribe to appointment updates
  socket.on("subscribe-appointments", (data) => {
    const { userId } = data
    socket.join(`appointments-${userId}`)
  })

  // New appointment scheduled
  socket.on("appointment-scheduled", (data) => {
    const { appointmentId, doctorId, patientId, participantIds } = data

    participantIds.forEach((participantId) => {
      io.to(`appointments-${participantId}`).emit("appointment-updated", {
        type: "scheduled",
        appointmentId,
        data,
        timestamp: new Date(),
      })
    })
  })

  // Appointment updated
  socket.on("appointment-updated", (data) => {
    const { appointmentId, participantIds } = data

    participantIds.forEach((participantId) => {
      io.to(`appointments-${participantId}`).emit("appointment-updated", {
        type: "updated",
        appointmentId,
        data,
        timestamp: new Date(),
      })
    })
  })

  // Appointment cancelled
  socket.on("appointment-cancelled", (data) => {
    const { appointmentId, participantIds } = data

    participantIds.forEach((participantId) => {
      io.to(`appointments-${participantId}`).emit("appointment-updated", {
        type: "cancelled",
        appointmentId,
        data,
        timestamp: new Date(),
      })
    })
  })

  // Appointment reminder
  socket.on("send-reminder", (data) => {
    const { appointmentId, participantIds } = data

    participantIds.forEach((participantId) => {
      io.to(`appointments-${participantId}`).emit("appointment-reminder", {
        appointmentId,
        message: "Your appointment is starting soon",
        timestamp: new Date(),
      })
    })
  })
}
