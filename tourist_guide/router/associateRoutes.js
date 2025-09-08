    const express = require("express");
    const router = express.Router();
    const multer = require("multer");
    const path = require("path");
    const db = require("../database/db"); // Your MySQL connection

    // --------------------- Multer Setup ---------------------
    const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "uploads/"); // folder to save files
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    },
    });

    const upload = multer({ storage: storage }).any(); // accept multiple files

    // --------------------- Helper ---------------------
    function findFileByFieldname(files, fieldname) {
    if (!files) return null;
    return files.find((f) => f.fieldname === fieldname);
    }

    // --------------------- Routes ---------------------
    router.post("/submit", upload, async (req, res) => {
    try {
        const {
        name,
        email,
        biography: bio,
        instagram: instagramLink,
        x_link: xLink,
        facebook: facebookLink,
        website: websiteLink,
        organization_type: organizationType,
        } = req.body;

        // Files
        const logo_file = findFileByFieldname(req.files, "logo");
        const visiting_card_file = findFileByFieldname(req.files, "visiting_card");

        const logo = logo_file ? logo_file.filename : null;
        const companyVisitingCard = visiting_card_file ? visiting_card_file.filename : null;

        // Validation
        if (!name || !email || !bio || !organizationType) {
        return res.status(400).json({ success: false, message: "Please fill all required fields!" });
        }

        if (!logo || !companyVisitingCard) {
        return res.status(400).json({ success: false, message: "Please upload both Logo and Visiting Card!" });
        }

        // Insert into MySQL
        const sql = `INSERT INTO associates 
        (name, biography, email, instagramLink, xLink, facebookLink, websiteLink, organizationType, logo, companyVisitingCard,status, created_at) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?,  'pending', NOW())`;

        const values = [
        name,
        bio,
        email,
        instagramLink || null,
        xLink || null,
        facebookLink || null,
        websiteLink || null,
        organizationType,
        logo,
        companyVisitingCard,
        ];

        db.query(sql, values, (err, result) => {
        if (err) {
            console.error("DB Error:", err);
            return res.status(500).json({ success: false, message: "Failed to submit registration. Please try again." });
        }
        return res.status(200).json({ success: true, message: "Registration submitted successfully!" });
        });
    } catch (error) {
        console.error("Server Error:", error);
        return res.status(500).json({ success: false, message: "Server error. Please try again later." });
    }
    });

    module.exports = router;
