const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const bcrypt = require('bcrypt');
const db = require('../database/db'); // Adjust path as needed

// ===== Multer Storage Configuration =====
const storagemembership = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "uploads/"); // Ensure this folder exists
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

        // Access files
        const aadhaar = req.files.aadhaar_card?.[0]?.filename || null;
        const photo = req.files.passport_photo?.[0]?.filename || null;
        const qualification_cert = req.files.qualification_cert?.[0]?.filename || null;
        const guide_idcard = req.files.guide_idcard?.[0]?.filename || null;
        const govt_cert = req.files.govt_cert?.[0]?.filename || null;

        // Basic Validation
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
        const checkEmailSql = `SELECT id FROM tgc_users WHERE email = ?`;
        db.query(checkEmailSql, [email], async (err, results) => {
            if (err) {
                console.error("DB Error:", err);
                return res.status(500).json({ success: false, message: "Database error" });
            }

            if (results.length > 0) {
                return res.status(400).json({ success: false, message: "Email is already registered" });
            }

            try {
                // ✅ Hash password
                const hashedPassword = await bcrypt.hash(password, 10);

                // Insert user
                const insertSql = `INSERT INTO tgc_users 
    (name, dob, gender, blood_group, state, district, pincode, address, membership_cat, membership_type, bio, email, mobile, password, aadhaar, photo, qualification_cert, guide_idcard, govt_cert, status) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

                db.query(
                    insertSql,
                    [
                        name, dob, gender, blood_group, state, district, pincode, address,
                        membership_cat, membership_type, bio, email, mobile, hashedPassword,
                        aadhaar, photo, qualification_cert, guide_idcard, govt_cert,'pending'
                    ],
                    (err, result) => {
                        if (err) {
                            console.error("DB Error:", err);
                            return res.status(500).json({ success: false, message: "Database error" });
                        }

                        const insertId = result.insertId;
                        const empid = `TGC${String(insertId).padStart(3, '0')}`;

                        // ✅ Update empid
                        const updateSql = `UPDATE tgc_users SET empid = ? WHERE id = ?`;
                        db.query(updateSql, [empid, insertId], (err) => {
                            if (err) {
                                console.error("DB Error (empid):", err);
                                return res.status(500).json({ success: false, message: "Failed to update empid" });
                            }

                            res.status(200).json({
                                success: true,
                                message: "Membership submitted successfully!",
                                data: { id: insertId, empid }
                            });
                        });
                    }
                );
            } catch (err) {
                console.error("Hash Error:", err);
                return res.status(500).json({ success: false, message: "Password hashing failed" });
            }
        });

    } catch (error) {
        console.error("Server error:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

module.exports = router;
