const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const db = require('../database/db'); // Adjust path as needed

// ===== Multer Storage Configuration =====
const storagemembership = multer.diskStorage({
    destination: function (req, file, cb) {
        // Ensure the 'uploads/' folder exists in your project root
        cb(null, "uploads/");
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname));
    },
});

// ===== Multer Fields =====
const uploadmembership = multer({ storage: storagemembership }).fields([
    { name: "aadhaar_card", maxCount: 1 },
    { name: "passport_photo", maxCount: 1 },
    { name: "qualification_cert", maxCount: 1 },
    { name: "guide_idcard", maxCount: 1 },
    { name: "govt_cert", maxCount: 1 },
]);

// Helper function (though not strictly necessary with fields(), good for clarity)
function findFileByFieldname(files, fieldname) {
    return files[fieldname]?.[0] || null;
}

// Submit membership
// Submit membership
router.post("/submit_membership", uploadmembership, async (req, res) => {
    try {
        const {
            fullName: name,
            dob,
            gender,
            bloodGroup: blood_group,
            state,
            district,
            pincode,
            address,
            membershipCategory: membership_cat,
            membershipType: membership_type,
            shortBio: bio,
            email,
            mobileNumber: mobile,
            password,
        } = req.body;

        // Access files directly by field name from req.files object
        const aadhaar_file = req.files.aadhaar_card?.[0];
        const photo_file = req.files.passport_photo?.[0];
        const qualification_file = req.files.qualification_cert?.[0];
        const guide_idcard_file = req.files.guide_idcard?.[0];
        const govt_cert_file = req.files.govt_cert?.[0];

        const aadhaar = aadhaar_file ? aadhaar_file.filename : null;
        const photo = photo_file ? photo_file.filename : null;
        const qualification_cert = qualification_file ? qualification_file.filename : null;
        const guide_idcard = guide_idcard_file ? guide_idcard_file.filename : null;
        const govt_cert = govt_cert_file ? govt_cert_file.filename : null;

        // Validation
        if (
            !name || !dob || !gender || !blood_group || !state ||
            !district || !pincode || !address || !membership_cat ||
            !membership_type || !bio || !email || !mobile || !password
        ) {
            return res.status(400).json({ success: false, message: "Missing required text fields" });
        }

        if (!aadhaar || !photo || !qualification_cert || !guide_idcard || !govt_cert) {
            return res.status(400).json({ success: false, message: "All files are required" });
        }

        // Check if email already exists
        const checkEmailSql = `SELECT * FROM tgc_users WHERE email = ?`;
        db.query(checkEmailSql, [email], (err, results) => {
            if (err) {
                console.error("DB Error:", err);
                return res.status(500).json({ success: false, message: "Database error" });
            }

            if (results.length > 0) {
                return res.status(400).json({ success: false, message: "Email is already registered" });
            }

            // Insert into MySQL
            const sql = `INSERT INTO tgc_users 
                (name, dob, gender, blood_group, state, district, pincode, address, membership_cat, membership_type, bio, email, mobile, password, aadhaar, photo, qualification_cert, guide_idcard, govt_cert) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

            db.query(
                sql,
                [
                    name, dob, gender, blood_group, state, district, pincode, address,
                    membership_cat, membership_type, bio, email, mobile, password,
                    aadhaar, photo, qualification_cert, guide_idcard, govt_cert,
                ],
                (err, result) => {
                    if (err) {
                        console.error("DB Error:", err);
                        return res.status(500).json({ success: false, message: "Database error" });
                    }
                    res.status(200).json({ success: true, message: "Membership submitted successfully!" });
                }
            );
        });

    } catch (error) {
        console.error("Server error:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

module.exports = router;