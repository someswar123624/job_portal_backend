const mongoose = require("mongoose");

const applicationSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true },
  employerId: { type: mongoose.Schema.Types.ObjectId, ref: "Employer", required: true },
  jobId: { type: mongoose.Schema.Types.ObjectId, ref: "Job", required: true },
  formData: {
    name: String,
    srn: String,
    college: String,
    class10: String,
    class12: String,
    degree: String,
    degreeCgpa: String,
    skills: String,
    projects: String,
    resume: String, // just store filename
  },
  status: { type: String, default: "Pending" },
}, { timestamps: true });

module.exports = mongoose.model("Application", applicationSchema);
