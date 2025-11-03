import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import passport from "passport";
import session from "express-session";
import morgan from "morgan";
import connectDB from "./configs/db.js";
import authRoutes from "./routes/authRoutes.js";
import "./configs/passport.js";
import { notFound, errorHandler } from "./middlewares/errorHandler.js";

dotenv.config();

const app = express();

// Connect DB
connectDB();

// Middleware
app.use(
  cors({
    origin: process.env.CLIENT_URL || "https://prime-client-app.vercel.app",
    credentials: true,
  })
);
app.use(express.json());
app.use(morgan("dev"));

// Sessions for Google OAuth
app.use(
  session({
    secret: process.env.SESSION_SECRET || "supersecret",
    resave: false,
    saveUninitialized: true,
  })
);

app.use(passport.initialize());
app.use(passport.session());

// ✅ ROUTES
app.use("/api/auth", authRoutes);

// Test route
app.get("/", (req, res) => res.send("✅ PrimeHealth API is running..."));

// ✅ ERROR HANDLERS
app.use(notFound);
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
