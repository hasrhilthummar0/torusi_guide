const express = require("express");
const router = express.Router();
const pool = require("../../database/db");
const multer = require("multer");
const path = require("path");

// Multer storage setup
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "uploads/"); // folder for uploads
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage });

router.get("/videos", async (req, res) => {
    try {
        const [videos] = await pool.query(`SELECT * FROM gallery_videos`);
        res.json(videos); // send the video list only
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server Error" });
    }
});

// --- Admin video page ---
router.get("/", async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM gallery_videos");
        const videos = Array.isArray(result[0]) ? result[0] : result;

        res.render("admin_videos", { videos });
    } catch (err) {
        console.error(err);
        res.status(500).send("Server Error");
    }
});

// --- Upload video ---
router.post("/", upload.single("video_file"), async (req, res) => {
    try {
        const { title } = req.body;
        const video_file = req.file ? req.file.filename : null;

        if (!video_file) return res.status(400).send("Video is required");

        await pool.query(
            "INSERT INTO gallery_videos (title, video_file) VALUES (?, ?)",
            [title, video_file]
        );

        res.redirect("/admin/videos");
    } catch (err) {
        console.error(err);
        res.status(500).send("Server Error");
    }
});

// --- Delete video ---
router.post("/delete/:id", async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query("DELETE FROM gallery_videos WHERE id = ?", [id]);
        res.redirect("/admin/videos");
    } catch (err) {
        console.error(err);
        res.status(500).send("Server Error");
    }
});

module.exports = router;
