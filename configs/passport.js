// configs/passport.js
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import User from "../models/user.js";
import Doctor from "../models/doctor.js";
import Organisation from "../models/organisation.js";
import dotenv from 'dotenv'


dotenv.config()


passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "/api/auth/google/callback",
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;
        let existingUser = await User.findOne({ email });

        if (!existingUser) {
          // Determine userType — e.g., based on email domain or query param
          const userType =
            (profile._json && profile._json.hd === "primehealth.org")
              ? "organisation"
              : "doctor";

          existingUser =
            userType === "doctor"
              ? await Doctor.create({
                  googleId: profile.id,
                  email,
                  fullName: profile.displayName,
                  isVerified: true,
                })
              : await Organisation.create({
                  googleId: profile.id,
                  email,
                  fullName: profile.displayName,
                  organisationName: profile.displayName,
                  isVerified: true,
                });

          // Optionally also create a base user record
          await User.create({
            email,
            userType,
            isVerified: true,
          });
        }

        done(null, existingUser);
      } catch (err) {
        done(err, null);
      }
    }
  )
);

// ✅ Correct capitalization!
passport.serializeUser((user, done) => done(null, user.id));

passport.deserializeUser(async (id, done) => {
  try {
    const foundUser = await User.findById(id);
    done(null, foundUser);
  } catch (err) {
    done(err, null);
  }
});
