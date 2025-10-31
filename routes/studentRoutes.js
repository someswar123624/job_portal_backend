const express = require("express");
const router = express.Router();
const Student = require("../models/Student");
const Job = require("../models/Job");
const Application = require("../models/Application");
const multer = require("multer");
const path = require("path");
const generateToken = require("../utils/jwt");
const authenticateToken = require("../middleware/auth");
const { OAuth2Client } = require("google-auth-library");

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// ----------------- Multer config for resume upload -------------------
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname)),
});
const upload = multer({ storage });

// ----------------- REGISTER -------------------
router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const existing = await Student.findOne({ email });
    if (existing) return res.status(400).json({ success: false, message: "Email exists" });

    const student = await Student.create({ name, email, password });
    const token = generateToken(student._id, "student");
    res.status(201).json({ success: true, student, token });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// ----------------- LOGIN -------------------
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const student = await Student.findOne({ email });
    if (!student || !(await student.matchPassword(password)))
      return res.status(401).json({ success: false, message: "Invalid credentials" });

    const token = generateToken(student._id, "student");
    res.json({ success: true, student, token });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// ----------------- GOOGLE LOGIN -------------------
router.post("/google-login", async (req, res) => {
  try {
    const { token } = req.body;
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { sub: googleId, email, name } = payload;

    let student = await Student.findOne({ googleId });
    if (!student) student = await Student.create({ name, email, googleId });

    const jwtToken = generateToken(student._id, "student");
    res.json({ success: true, token: jwtToken, student });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Google login failed" });
  }
});

// ----------------- GET ALL JOBS -------------------
router.get("/jobs", async (req, res) => {
  try {
    const jobs = await Job.find();
    res.json({ success: true, jobs });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// ----------------- APPLY FOR A JOB -------------------
router.post("/apply/:jobId", authenticateToken, upload.single("resume"), async (req, res) => {
  try {
    const { jobId } = req.params;
    const job = await Job.findById(jobId);
    if (!job) return res.status(404).json({ success: false, message: "Job not found" });

    const studentId = req.user.id;
    const existing = await Application.findOne({ studentId, jobId });
    if (existing) return res.status(400).json({ success: false, message: "Already applied" });

    const application = await Application.create({
      studentId,
      employerId: job.employerId,
      jobId,
      formData: {
        name: req.body.name,
        srn: req.body.srn,
        college: req.body.college,
        class10: req.body.class10,
        class12: req.body.class12,
        degree: req.body.degree,
        degreeCgpa: req.body.degreeCgpa,
        skills: req.body.skills,
        projects: req.body.projects,
        resume: req.file ? req.file.filename : null,
      },
      status: "Pending",
    });

    res.json({ success: true, application });
  } catch (err) {
    console.error(err);
    res.status(400).json({ success: false, message: err.message });
  }
});

// ----------------- GET STUDENT APPLICATIONS -------------------
router.get("/applications", authenticateToken, async (req, res) => {
  try {
    const studentId = req.user.id;
    const applications = await Application.find({ studentId })
      .populate("jobId", "title company location salary description")
      .populate("employerId", "companyName email");

    res.json({ success: true, applications });
  } catch (err) {
    console.error(err);
    res.status(400).json({ success: false, message: err.message });
  }
});

module.exports = router;
