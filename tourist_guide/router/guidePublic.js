const express = require("express");
const db = require("../database/db");
const router = express.Router();

// GET guide by empid with gallery photos (frontend-friendly)
router.get("/guides/:empid", (req, res) => {
    const empid = req.params.empid;

    // Select only required fields
    const guideQuery = `
        SELECT id, empid, name, dob, gender, blood_group, state, district, address, photo, is_verified
        FROM tgc_users
        WHERE empid = ?
    `;

    db.query(guideQuery, [empid], (err, guides) => {
        if (err) return res.status(500).json({ error: "DB error" });
        if (guides.length === 0) return res.status(404).json({ error: "Guide not found" });

        const guide = guides[0];

        // Fetch guide photos
        const photosQuery = "SELECT file_name FROM guide_photos WHERE guide_id = ?";
        db.query(photosQuery, [guide.id], (err2, photosRows) => {
            if (err2) return res.status(500).json({ error: "DB error" });

            guide.photos = photosRows.map(p => p.file_name);

            // Format DOB
            guide.dob = guide.dob ? guide.dob.toISOString().split('T')[0] : null;

            res.json(guide);
        });
    });
});

// DELETE guide photo by file_name
router.delete("/guides/photos/:fileName", (req, res) => {
    const fileName = req.params.fileName;

    // First, find the photo to get guide_id
    const selectQuery = "SELECT id, guide_id FROM guide_photos WHERE file_name = ?";
    db.query(selectQuery, [fileName], (err, rows) => {
        if (err) return res.status(500).json({ error: "DB error" });
        if (rows.length === 0) return res.status(404).json({ error: "Photo not found" });

        const photoId = rows[0].id;

        // Delete photo record from DB
        const deleteQuery = "DELETE FROM guide_photos WHERE id = ?";
        db.query(deleteQuery, [photoId], (err2) => {
            if (err2) return res.status(500).json({ error: "DB error on delete" });

            // Optionally, delete file from filesystem if you want
            const fs = require("fs");
            const path = require("path");
            const filePath = path.join(__dirname, "../public/uploads/", fileName);
            fs.unlink(filePath, (err3) => {
                if (err3) console.log("File delete error:", err3.message);
            });

            res.json({ message: "Photo deleted successfully" });
        });
    });
});


module.exports = router;
