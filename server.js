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

// ✅ FIXED CORS CONFIG
const allowedOrigins = [
  "http://localhost:5173", // Vite local dev
  "https://prime-client-app.vercel.app", // Production client
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true); // allow REST tools or mobile apps
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      console.warn("❌ Blocked by CORS:", origin);
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true, // needed for cookies/session-based auth
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
