const mongoose = require("mongoose");

const jobSchema = new mongoose.Schema({
  employerId: { type: mongoose.Schema.Types.ObjectId, ref: "Employer", required: true },
  title: { type: String, required: true },
  company: { type: String, required: true },
  location: { type: String, required: true },
  description: { type: String, required: true },
  salary: { type: String },
  status: { type: String, default: "Open" },
}, { timestamps: true });

module.exports = mongoose.model("Job", jobSchema);
 