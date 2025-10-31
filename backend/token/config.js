// config.js
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
require("dotenv").config();

// Ensure correct path to .env
const envPath = 'C:\\Users\\ADMIN\\OneDrive\\Desktop\\fullstack_job - Copy\\backend\\.env';

const generateToken = (user) => {
  let jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    // generate random 64-byte secret
    jwtSecret = crypto.randomBytes(64).toString("hex");

    // append to .env file (create file if it doesn't exist)
    fs.appendFileSync(envPath, `\nJWT_SECRET=${jwtSecret}\n`, "utf-8");

    // update process.env
    process.env.JWT_SECRET = jwtSecret;
    console.log("Generated new JWT_SECRET:", jwtSecret);
  }

  // Generate token
  const token = jwt.sign(
    user,
    jwtSecret,
    { expiresIn: "1h" }
  );

  console.log("Generated JWT Token:", token);
};

// Test call
generateToken({ name: "somesh" });
