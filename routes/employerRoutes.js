const express = require("express");
const router = express.Router();
const { OAuth2Client } = require("google-auth-library");
const Employer = require("../models/Employer");
const Job = require("../models/Job");
const Application = require("../models/Application");
const generateToken = require("../utils/jwt");
const authenticateToken = require("../middleware/auth");

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// -------------------
// Employer Registration
// -------------------
router.post("/register", async (req, res) => {
  try {
    const { companyName, email, password } = req.body;
    const existing = await Employer.findOne({ email });
    if (existing)
      return res.status(400).json({ success: false, message: "Email already exists" });

    const employer = await Employer.create({ companyName, email, password });
    const token = generateToken(employer._id, "employer");

    res.status(201).json({ success: true, employer, token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// -------------------
// Employer Login (Email/Password)
// -------------------
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const employer = await Employer.findOne({ email });
    if (!employer || !(await employer.matchPassword(password)))
      return res.status(401).json({ success: false, message: "Invalid credentials" });

    const token = generateToken(employer._id, "employer");
    res.json({ success: true, employer, token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// -------------------
// Google OAuth Login
// -------------------
router.post("/google-login", async (req, res) => {
  try {
    const { token: idToken } = req.body;
    if (!idToken)
      return res.status(400).json({ success: false, message: "No token provided" });

    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { email, name, sub: googleId } = payload;

    let employer = await Employer.findOne({ email });
    if (!employer) {
      employer = await Employer.create({
        companyName: name,
        email,
        googleId,
      });
    } else if (!employer.googleId) {
      employer.googleId = googleId;
      await employer.save();
    }

    const jwtToken = generateToken(employer._id, "employer");
    res.json({ success: true, token: jwtToken, employer });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Google login failed" });
  }
});

// -------------------
// Post a Job
// -------------------
router.post("/jobs", authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== "employer")
      return res.status(403).json({ success: false, message: "Forbidden: Not an employer" });

    const { title, company, location, description, salary } = req.body;
    const job = await Job.create({
      employerId: req.user.id,
      title,
      company,
      location,
      description,
      salary,
    });

    res.status(201).json({ success: true, job });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// -------------------
// Get all jobs posted by this employer
// -------------------
router.get("/jobs", authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== "employer")
      return res.status(403).json({ success: false, message: "Forbidden: Not an employer" });

    const jobs = await Job.find({ employerId: req.user.id }).sort({ createdAt: -1 });
    res.json({ success: true, jobs });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// -------------------
// Get applications for this employer
// -------------------
router.get("/applications", authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== "employer")
      return res.status(403).json({ success: false, message: "Forbidden: Not an employer" });

    const applications = await Application.find({ employerId: req.user.id })
      .populate("studentId", "name email")
      .populate("jobId", "title company")
      .sort({ createdAt: -1 });

    res.json({ success: true, applications });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// -------------------
// Update application status
// -------------------
router.put("/applications/:appId/status", authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== "employer")
      return res.status(403).json({ success: false, message: "Forbidden: Not an employer" });

    const { status } = req.body;
    const allowedStatuses = ["Pending", "Accepted", "Rejected"];
    if (!status || !allowedStatuses.includes(status))
      return res.status(400).json({ success: false, message: `Invalid status. Must be one of: ${allowedStatuses.join(", ")}` });

    // ✅ populate directly in query
    const application = await Application.findById(req.params.appId)
      .populate("studentId", "name email")
      .populate("jobId", "title company");

    if (!application)
      return res.status(404).json({ success: false, message: "Application not found" });

    if (application.employerId.toString() !== req.user.id)
      return res.status(403).json({ success: false, message: "Forbidden: You do not own this application" });

    application.status = status;
    await application.save();

    res.json({ success: true, message: `Status updated to '${status}'`, application });
  } catch (err) {
    console.error("Error updating application status:", err);
    res.status(500).json({ success: false, message: "Server error: " + err.message });
  }
});


module.exports = router;
