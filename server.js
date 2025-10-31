const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const connectDB = require("./config/db");
const passport = require("passport");
const session = require("express-session");
require("dotenv").config();
const jwt = require("jsonwebtoken");

// Routes
const studentRoutes = require("./routes/studentRoutes");
const employerRoutes = require("./routes/employerRoutes");
const jobRoutes = require("./routes/jobRoutes");
const applicationRoutes = require("./routes/applicationRoutes");

// Google OAuth Strategy
const GoogleStrategy = require("passport-google-oauth20").Strategy;

// JWT generator
const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: "1h" });
};

const app = express();

// -------------------- Middleware --------------------
app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(bodyParser.json());
app.use("/uploads", express.static("uploads"));

// Express session (required for Passport)
app.use(
  session({
    secret: process.env.SESSION_SECRET || "myRandomSessionSecret",
    resave: false,
    saveUninitialized: true,
  })
);

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// -------------------- Database --------------------
connectDB();

// -------------------- Passport Google Strategy --------------------
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
      passReqToCallback: true,
    },
    async (req, accessToken, refreshToken, profile, done) => {
      try {
        const role = req.session.role || "student";
        let user;

        if (role === "student") {
          const Student = require("./models/Student");
          user = await Student.findOne({ googleId: profile.id });

          if (!user) {
            user = await Student.create({
              name: profile.displayName,
              email: profile.emails[0].value,
              googleId: profile.id,
            });
            console.log("🆕 New Student created:", user);
          } else {
            console.log("👤 Existing Student logged in:", user);
          }
        } else {
          const Employer = require("./models/Employer");
          user = await Employer.findOne({ googleId: profile.id });

          if (!user) {
            user = await Employer.create({
              companyName: profile.displayName,
              email: profile.emails[0].value,
              googleId: profile.id,
            });
            console.log("🆕 New Employer created:", user);
          } else {
            console.log("👤 Existing Employer logged in:", user);
          }
        }

        done(null, { id: user._id, role });
      } catch (err) {
        done(err, null);
      }
    }
  )
);

// Serialize & Deserialize
passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

// -------------------- API Routes --------------------
app.use("/api/students", studentRoutes);
app.use("/api/employers", employerRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/applications", applicationRoutes);

// Root route
app.get("/", (req, res) => res.send("🚀 Job Portal API is running"));

// -------------------- OAuth Routes --------------------
app.get(
  "/auth/google",
  (req, res, next) => {
    req.session.role = req.query.role || "student"; // store role from frontend
    next();
  },
  passport.authenticate("google", { 
    scope: ["profile", "email"], 
    prompt: "consent",
    accessType: "offline",
  })
);

app.get(
  "/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/auth/failure", session: false }),
  async (req, res) => {
    try {
      // Generate JWT token
      const token = generateToken(req.user.id, req.user.role);

      // Redirect to frontend with token
      const frontendURL = `http://localhost:5173/${req.user.role}/oauth?token=${token}`;
      res.redirect(frontendURL);
    } catch (err) {
      console.error("Callback error:", err);
      res.status(500).json({ success: false, message: "Callback failed" });
    }
  }
);

// OAuth failure
app.get("/auth/failure", (req, res) => {
  res.status(401).json({ success: false, message: "Google login failed" });
});

// -------------------- 404 Route --------------------
app.use((req, res) => res.status(404).json({ success: false, message: "Route not found" }));

// -------------------- Global Error Handler --------------------
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: "Internal Server Error" });
});

// -------------------- Start Server --------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
