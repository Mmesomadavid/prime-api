import user from "../models/user.js";
import organisation from "../models/organisation.js";
import doctor from "../models/doctor.js";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: "30d",
  });
};

// Send OTP mail
const sendOTPEmail = async (email, otp) => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_user, // make sure this matches your .env
      pass: process.env.EMAIL_PASS,
    },
  });

  await transporter.sendMail({
    from: `"PrimeHealth" <${process.env.EMAIL_user}>`,
    to: email,
    subject: "Verify Your Account - PrimeHealth",
    html: `
      <h2>Verify Your Account</h2>
      <p>Your OTP code is:</p>
      <h1 style="letter-spacing: 3px;">${otp}</h1>
      <p>This code expires in 10 minutes.</p>
    `,
  });
};

// 🟢 REGISTER user (organisation / doctor)
export const register = async (req, res, next) => {
  try {
    const { userType, password, email } = req.body;

    if (!userType || !email)
      return res.status(400).json({ message: "Missing userType or email" });

    // Check existing user
    const existing = await user.findOne({ email });
    if (existing)
      return res.status(400).json({ message: "user already exists" });

    // Create OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = Date.now() + 10 * 60 * 1000;

    const newuser = await user.create({
      email,
      password,
      userType,
      otp,
      otpExpires,
    });

    if (userType === "organisation") {
      await organisation.create({
        user: newuser._id,
        organisationName: req.body.organisationName,
        registrationNumber: req.body.registrationNumber,
        adminFirstName: req.body.adminFirstName,
        adminLastName: req.body.adminLastName,
        adminEmail: req.body.adminEmail,
        companyEmail: req.body.companyEmail,
        companyPhone: req.body.companyPhone,
        country: req.body.country,
      });
    }

    if (userType === "doctor") {
      await doctor.create({
        user: newuser._id,
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        licenseNumber: req.body.licenseNumber,
        specialization: req.body.specialization,
        email: req.body.email,
        phone: req.body.phone,
        country: req.body.country,
      });
    }

    await sendOTPEmail(email, otp);

    res.status(201).json({
      message: "Registration successful! Please verify your email with OTP.",
    });
  } catch (err) {
    next(err);
  }
};

// 🟡 VERIFY OTP
export const verifyOTP = async (req, res, next) => {
  try {
    const { email, otp } = req.body;
    const existinguser = await user.findOne({ email });

    if (!existinguser)
      return res.status(404).json({ message: "user not found" });
    if (existinguser.isVerified)
      return res.status(400).json({ message: "user already verified" });
    if (existinguser.otp !== otp || existinguser.otpExpires < Date.now())
      return res.status(400).json({ message: "Invalid or expired OTP" });

    existinguser.isVerified = true;
    existinguser.otp = undefined;
    existinguser.otpExpires = undefined;
    await existinguser.save();

    res.status(200).json({ message: "Account verified successfully!" });
  } catch (err) {
    next(err);
  }
};

// 🟠 RESEND OTP
export const resendOTP = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email)
      return res.status(400).json({ message: "Email is required" });

    const existingUser = await user.findOne({ email });
    if (!existingUser)
      return res.status(404).json({ message: "User not found" });

    if (existingUser.isVerified)
      return res.status(400).json({ message: "Account already verified" });

    // Generate a new OTP
    const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

    existingUser.otp = newOtp;
    existingUser.otpExpires = otpExpires;
    await existingUser.save();

    // Send email
    await sendOTPEmail(email, newOtp);

    res.status(200).json({
      message: "A new OTP has been sent to your email.",
    });
  } catch (err) {
    console.error("Resend OTP Error:", err);
    next(err);
  }
};

// 🔵 LOGIN
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const existingUser = await user.findOne({ email });
    if (!existingUser)
      return res.status(400).json({ message: "Invalid credentials" });

    const isMatch = await existingUser.matchPassword(password);
    if (!isMatch)
      return res.status(400).json({ message: "Invalid credentials" });

    if (!existingUser.isVerified)
      return res.status(403).json({ message: "Please verify your account" });

    const token = generateToken(existingUser._id);

    res.status(200).json({
      token,
      user: {
        _id: existingUser._id, // use consistent naming
        email: existingUser.email,
        userType: existingUser.userType,
        isVerified: existingUser.isVerified, // ✅ ADD THIS LINE
      },
    });
  } catch (err) {
    next(err);
  }
};

// 🟣 GET CURRENT user (for protected routes)
export const getCurrentUser = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const existingUser = await User.findById(userId).select("-password");

    if (!existingUser) return res.status(404).json({ message: "User not found" });

    res.status(200).json(existingUser);
  } catch (err) {
    next(err);
  }
};
