const express = require("express");
const router = express.Router();
const pool = require("../../database/db");
const multer = require("multer");
const path = require("path");

// Setup multer storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "uploads/"); // folder for uploads
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage });


router.get("/", async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM gallery_categories");
        let categories = [];

        // pool.query may return [rows, fields] or just rows
        if (Array.isArray(result)) {
            categories = Array.isArray(result[0]) ? result[0] : result;
        }

        res.render("admin_gallery", { categories });
    } catch (err) {
        console.error(err);
        res.status(500).send("Server Error");
    }
});

// ----- Get all categories -----
router.get("/categories", async (req, res) => {
    try {
        const [categories] = await pool.query("SELECT * FROM gallery_categories");
        res.json(categories);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server Error" });
    }
});

// ----- Add category -----
router.post("/categories", upload.single("cover_image"), async (req, res) => {
    try {
        const { title, slug } = req.body;
        const cover_image = req.file ? req.file.filename : null;

        await pool.query(
            "INSERT INTO gallery_categories (title, slug, cover_image) VALUES (?, ?, ?)",
            [title, slug, cover_image]
        );

        // redirect back to admin gallery page
        res.redirect("/admin/gallery");
    } catch (err) {
        console.error(err);
        res.status(500).send("Server Error");
    }
});

// ----- Delete category using POST (no method-override) -----
router.post("/categories/delete/:id", async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query("DELETE FROM gallery_categories WHERE id = ?", [id]);
        res.redirect("/admin/gallery"); // go back to admin gallery page
    } catch (err) {
        console.error(err);
        res.status(500).send("Server Error");
    }
});



module.exports = router;
