const express = require("express");
const router = express.Router();
const passport = require("../config/passport");
const jwt = require("jsonwebtoken");

// Helper function to generate JWT
const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: "1h" });
};

// Step 1: Redirect to Google for OAuth login
router.get(
  "/google",
  (req, res, next) => {
    req.session.role = req.query.role || "student"; // store role from frontend
    next();
  },
  passport.authenticate("google", {
    scope: ["profile", "email"],
    prompt: "consent",      // always ask permissions
    accessType: "offline",  // get refresh token
  })
);

// Step 2: Google callback
router.get(
  "/google/callback",
  passport.authenticate("google", { session: false, failureRedirect: "/auth/failure" }),
  (req, res) => {
    try {
      const { id, role } = req.user; // user object returned from passport strategy

      // Generate JWT
      const token = generateToken(id, role);

      // Send token and role to frontend (or redirect with token)
      const frontendURL = `http://localhost:5173/oauth/success?token=${token}&role=${role}`;
      res.redirect(frontendURL);
    } catch (err) {
      console.error("OAuth callback error:", err);
      res.status(500).json({ success: false, message: "OAuth callback failed" });
    }
  }
);

// OAuth failure
router.get("/failure", (req, res) => {
  res.status(401).json({ success: false, message: "Google login failed" });
});

module.exports = router;
