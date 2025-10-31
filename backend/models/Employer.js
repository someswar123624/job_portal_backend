const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const employerSchema = new mongoose.Schema(
  {
    companyName: { type: String, required: true },
    email: { type: String, unique: true, required: true },
    password: { type: String }, // optional for Google OAuth
    googleId: { type: String, unique: true, sparse: true }, // allow null for non-Google users
  },
  { timestamps: true }
);

// Hash password only if it exists
employerSchema.pre("save", async function (next) {
  if (!this.isModified("password") || !this.password) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Match password
employerSchema.methods.matchPassword = async function (enteredPassword) {
  if (!this.password) return false; // Google users have no password
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model("Employer", employerSchema);
