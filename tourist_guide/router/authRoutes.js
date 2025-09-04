const express = require("express");
const router = express.Router();
const { loginUser, getProfile, updateProfile } = require("../controller/authController");
const authMiddleware = require("../middleware/authMiddleware");

// Login
router.post("/login", loginUser);

// Profile (protected)
router.get("/profile", authMiddleware, getProfile);

// Update Profile (protected)
router.put("/profile", authMiddleware, updateProfile);

module.exports = router;
