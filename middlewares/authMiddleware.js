// middlewares/authMiddleware.js
import jwt from "jsonwebtoken"
import User from "../models/user.js"

/**
 * 🔐 Protect Middleware
 * Ensures request has valid JWT and attaches user to req.user
 */
export const protect = async (req, res, next) => {
  let token

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      token = req.headers.authorization.split(" ")[1]

      const decoded = jwt.verify(token, process.env.JWT_SECRET || "secret")

      req.user = await User.findById(decoded.id).select("-password")

      if (!req.user) {
        return res.status(401).json({ message: "User not found" })
      }

      next()
    } catch (err) {
      console.error("JWT verification error:", err)
      return res.status(401).json({ message: "Token is invalid or expired" })
    }
  }

  if (!token) {
    return res.status(401).json({ message: "No authentication token found" })
  }
}
/**
 * 🧩 Authorize Middleware
 * Restricts access based on user roles
 *
 * Example usage:
 * router.post('/doctor', protect, authorize('doctor'), handler)
 */
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Not authenticated" })
    }

    // Normalized role field (in case you use `userType` instead of `role`)
    const userRole = req.user.userType

    if (!roles.includes(userRole)) {
      return res.status(403).json({
        message: `Access denied: ${userRole} role not authorized for this action`,
      })
    }

    next()
  }
}
