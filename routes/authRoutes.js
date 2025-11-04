// routes/authRoutes.js
import express from "express";
import passport from "passport";
import {
  register,
  verifyOTP,
  login,
  getCurrentUser,
} from "../controllers/authController.js";
import { protect, authorize } from "../middlewares/authMiddleware.js";

const router = express.Router();

// 🆕 Public routes
router.post("/register", register);
router.post("/verify-otp", verifyOTP);
router.post("/login", login);

// 🟢 Google OAuth with dynamic redirect based on userType
router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

router.get(
  "/google/callback",
  passport.authenticate("google", { failureRedirect: "/login" }),
  (req, res) => {
    // Determine redirect path based on role
    const role = req.user?.userType; // assuming userType = "doctor" or "organization"
    let redirectPath = "/login";

    if (role === "doctor") redirectPath = "/doctor/dashboard";
    if (role === "organization") redirectPath = "/organization/dashboard";

    res.redirect(redirectPath);
  }
);

// 🧍‍♂️ Protected route example
router.get("/me", protect, getCurrentUser);

// 🧱 Role-based example
router.get(
  "/restricted",
  protect,
  authorize("doctor", "organization"),
  (req, res) => {
    res.json({
      success: true,
      message: `Welcome ${req.user.name}, you have access to this protected route.`,
    });
  }
);

export default router;
