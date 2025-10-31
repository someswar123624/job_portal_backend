const express = require("express");
const router = express.Router();
const authenticateToken = require("../middleware/auth");
const Application = require("../models/Application");
const Student = require("../models/Student");

// Create a new application
router.post("/", authenticateToken, async (req, res) => {
  try {
    const { jobId } = req.body;
    if (!jobId) return res.status(400).json({ success: false, message: "Job ID is required" });

    // Find the student in DB
    const student = req.user.googleId
      ? await Student.findOne({ googleId: req.user.googleId })
      : await Student.findById(req.user.id);

    if (!student) return res.status(404).json({ success: false, message: "Student not found" });

    // Prevent duplicate application
    const existing = await Application.findOne({ studentId: student._id, jobId });
    if (existing) return res.status(400).json({ success: false, message: "Already applied for this job" });

    const newApplication = new Application({
      studentId: student._id,
      jobId,
      status: "Applied",
    });

    await newApplication.save();

    res.json({ success: true, application: newApplication });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

// Get all applications for logged-in student
router.get("/", authenticateToken, async (req, res) => {
  try {
    const student = req.user.googleId
      ? await Student.findOne({ googleId: req.user.googleId })
      : await Student.findById(req.user.id);

    if (!student) return res.status(404).json({ success: false, message: "Student not found" });

    const applications = await Application.find({ studentId: student._id })
      .populate("jobId", "title company location salary");

    res.json({ success: true, applications });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

module.exports = router;
