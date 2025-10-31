const express = require("express");
const router = express.Router();
const Job = require("../models/Job");
const Application = require("../models/Application");
const authenticateToken = require("../middleware/auth");

// ======================
// Get all jobs (for students)
// ======================
router.get("/", async (req, res) => {
  try {
    const jobs = await Job.find().sort({ createdAt: -1 }); // latest jobs first
    res.json({ success: true, jobs });
  } catch (err) {
    console.error("Error fetching jobs:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ======================
// Get single job by ID (optional for student view)
// ======================
router.get("/:jobId", async (req, res) => {
  try {
    const job = await Job.findById(req.params.jobId);
    if (!job) return res.status(404).json({ success: false, message: "Job not found" });

    res.json({ success: true, job });
  } catch (err) {
    console.error("Error fetching job:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ======================
// Get all applications for a specific job (for employer)
// ======================
router.get("/applications/:jobId", authenticateToken, async (req, res) => {
  try {
    const job = await Job.findById(req.params.jobId);
    if (!job) return res.status(404).json({ success: false, message: "Job not found" });

    // Only the employer who posted the job can see applications
    if (req.user.role !== "employer" || job.employerId.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: "Forbidden: Not allowed to view applications" });
    }

    const applications = await Application.find({ jobId: job._id })
      .populate("studentId", "name email")
      .sort({ createdAt: -1 }); // latest first

    res.json({ success: true, applications });
  } catch (err) {
    console.error("Error fetching applications for job:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

module.exports = router;
