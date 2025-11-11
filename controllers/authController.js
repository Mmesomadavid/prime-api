import mongoose from "mongoose";
import User from "../models/user.js";
import Organization from "../models/organisation.js";
import Doctor from "../models/doctor.js";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

// 🔹 Generate JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || "secret", {
    expiresIn: "30d",
  });
};

// 🔹 Send OTP Email
const sendOTPEmail = async (email, otp) => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  await transporter.sendMail({
    from: `"PrimeHealth" <${process.env.EMAIL_USER}>`,
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

// 🔹 Register (Organization or Doctor)
export const register = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { userType, password, email } = req.body;

    if (!userType || !email)
      return res.status(400).json({ message: "Missing userType or email" });

    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ message: "User already exists" });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = Date.now() + 10 * 60 * 1000;

    // 1️⃣ Create Base User
    const [newUser] = await User.create(
      [
        {
          email,
          password,
          userType,
          otp,
          otpExpires,
        },
      ],
      { session }
    );

    const userId = newUser._id;

    // 2️⃣ Create Linked Profile
    if (userType === "organization") {
      await Organization.create(
        [
          {
            user: userId,
            organizationName: req.body.organizationName,
            registrationNumber: req.body.registrationNumber,
            adminFirstName: req.body.adminFirstName,
            adminLastName: req.body.adminLastName,
            adminEmail: req.body.adminEmail,
            companyEmail: req.body.companyEmail,
            companyPhone: req.body.companyPhone,
            country: req.body.country || "NG",
          },
        ],
        { session }
      );
    }

    if (userType === "doctor") {
      await Doctor.create(
        [
          {
            user: userId,
            firstName: req.body.firstName,
            lastName: req.body.lastName,
            licenseNumber: req.body.licenseNumber,
            specialization: req.body.specialization,
            email: req.body.email,
            phone: req.body.phone,
            country: req.body.country || "NG",
          },
        ],
        { session }
      );
    }

    // 3️⃣ Send OTP
    await sendOTPEmail(email, otp);

    await session.commitTransaction();
    session.endSession();

    res.status(201).json({
      message: "Registration successful! Please verify your email with OTP.",
      userId,
    });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    console.error("Registration Error:", err);
    next(err);
  }
};

// 🔹 Verify OTP
export const verifyOTP = async (req, res, next) => {
  try {
    const { email, otp } = req.body;
    const existingUser = await User.findOne({ email });

    if (!existingUser) return res.status(404).json({ message: "User not found" });
    if (existingUser.isVerified)
      return res.status(400).json({ message: "User already verified" });
    if (existingUser.otp !== otp || existingUser.otpExpires < Date.now())
      return res.status(400).json({ message: "Invalid or expired OTP" });

    existingUser.isVerified = true;
    existingUser.otp = undefined;
    existingUser.otpExpires = undefined;
    await existingUser.save();

    res.status(200).json({ message: "Account verified successfully!" });
  } catch (err) {
    next(err);
  }
};

// 🔹 Resend OTP
export const resendOTP = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required" });

    const existingUser = await User.findOne({ email });
    if (!existingUser) return res.status(404).json({ message: "User not found" });
    if (existingUser.isVerified)
      return res.status(400).json({ message: "Account already verified" });

    const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = Date.now() + 10 * 60 * 1000;

    existingUser.otp = newOtp;
    existingUser.otpExpires = otpExpires;
    await existingUser.save();

    await sendOTPEmail(email, newOtp);

    res.status(200).json({
      message: "A new OTP has been sent to your email.",
    });
  } catch (err) {
    console.error("Resend OTP Error:", err);
    next(err);
  }
};

// 🔹 Login (with extended data)
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const existingUser = await User.findOne({ email });
    if (!existingUser) return res.status(400).json({ message: "Invalid credentials" });

    const isMatch = await existingUser.matchPassword(password);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

    if (!existingUser.isVerified)
      return res.status(403).json({ message: "Please verify your account" });

    const token = generateToken(existingUser._id.toString());

    // 🔸 Merge doctor/org data
    let profileData = {};
    if (existingUser.userType === "doctor") {
      const doctor = await Doctor.findOne({ user: existingUser._id });
      if (doctor) {
        profileData = {
          firstName: doctor.firstName,
          lastName: doctor.lastName,
          specialization: doctor.specialization,
          phone: doctor.phone,
        };
      }
    } else if (existingUser.userType === "organization") {
      const org = await Organization.findOne({ user: existingUser._id });
      if (org) {
        profileData = {
          organizationName: org.organizationName,
          adminFirstName: org.adminFirstName,
          adminLastName: org.adminLastName,
          companyEmail: org.companyEmail,
          companyPhone: org.companyPhone,
        };
      }
    }

    res.status(200).json({
      token,
      user: {
        _id: existingUser._id,
        email: existingUser.email,
        userType: existingUser.userType,
        isVerified: existingUser.isVerified,
        ...profileData,
      },
    });
  } catch (err) {
    next(err);
  }
};

// 🔹 Get Current User (used by frontend AuthContext)
export const getCurrentUser = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const existingUser = await User.findById(userId).select("-password");
    if (!existingUser) return res.status(404).json({ message: "User not found" });

    let profileData = {};
    if (existingUser.userType === "doctor") {
      const doctor = await Doctor.findOne({ user: existingUser._id });
      if (doctor) {
        profileData = {
          firstName: doctor.firstName,
          lastName: doctor.lastName,
          specialization: doctor.specialization,
          phone: doctor.phone,
        };
      }
    } else if (existingUser.userType === "organization") {
      const org = await Organization.findOne({ user: existingUser._id });
      if (org) {
        profileData = {
          organizationName: org.organizationName,
          adminFirstName: org.adminFirstName,
          adminLastName: org.adminLastName,
          companyEmail: org.companyEmail,
          companyPhone: org.companyPhone,
        };
      }
    }

    res.status(200).json({
      ...existingUser.toObject(),
      ...profileData,
    });
  } catch (err) {
    next(err);
  }
};
