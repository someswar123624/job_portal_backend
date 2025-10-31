const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");

// Path to your .env file
const envPath = path.join(__dirname, "../.env");

const generateToken = (id, role) => {
  let secret = process.env.JWT_SECRET;

  // Generate a new secret if missing
  if (!secret) {
    secret = crypto.randomBytes(64).toString("hex");
    fs.appendFileSync(envPath, `\nJWT_SECRET=${secret}\n`, "utf-8");
    process.env.JWT_SECRET = secret;
    console.log("Generated new JWT_SECRET:", secret);
  }

  // Generate JWT token
  return jwt.sign({ id, role }, secret, { expiresIn: "1h" });
};

module.exports = generateToken;
