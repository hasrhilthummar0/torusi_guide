const express = require("express");
const multer = require("multer");
const path = require("path");
const pool = require("../database/db");
const router = express.Router();
const { loginUser, getProfile, updateProfile, changePassword } = require("../controller/authController");
const authMiddleware = require("../middleware/authMiddleware");

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, "uploads/"),
    filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname)),
});
const upload = multer({ storage });

// Login
router.post("/login", loginUser);

// Profile (protected)
router.get("/profile", authMiddleware, getProfile);

// // Update Profile (protected)
// router.put("/profile-update", upload.single("photo"), authMiddleware, updateProfile);


router.put(
    "/profile-update",
    authMiddleware,
    upload.fields([
        { name: "photo", maxCount: 1 },
        { name: "guidePhotos", maxCount: 10 },
    ]),
    updateProfile
);

router.put("/change-password", authMiddleware, changePassword);

router.get('/profile/:id', async (req, res) => {
    try {
        const userId = req.params.id;
        const query = `
            SELECT id, name, role, mobile, email, blood_group, created_at AS issueDate, updated_at AS expiryDate
            FROM tgc_users
            WHERE id=?
        `;
        db.query(query, [userId], (err, results) => {
            if (err) return res.status(500).json({ error: 'DB error' });
            if (results.length === 0) return res.status(404).json({ error: 'User not found' });

            const user = results[0];
            res.json({
                id: user.id,
                name: user.name,
                role: user.role,
                mobile: user.mobile,
                email: user.email,
                bloodGroup: user.blood_group,
                issueDate: user.issueDate ? user.issueDate.toISOString().split('T')[0] : '',
                expiryDate: user.expiryDate ? user.expiryDate.toISOString().split('T')[0] : ''
            });
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});




module.exports = router;
