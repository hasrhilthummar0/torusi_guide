// routes/gallery.js
const express = require("express");
const router = express.Router();
const pool = require("../database/db");

// get all categories
router.get("/categories", async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM gallery_categories");
        let categories = [];

        // result may be [rows, fields]
        if (Array.isArray(result) && Array.isArray(result[0])) {
            categories = result[0]; // rows array
        } else {
            categories = result;
        }

        res.json(categories);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server Error" });
    }
});


// // get images by category
// router.get("/images/:categoryId", async (req, res) => {
//     try {
//         const { categoryId } = req.params;
//         const [rows] = await pool.query(
//             "SELECT * FROM gallery_images WHERE category_id = ?",
//             [categoryId]
//         );
//         console.log(rows);
        
//         res.json(rows); // send the full array, not just first item
//     } catch (err) {
//         console.error(err);
//         res.status(500).json({ message: "Server Error" });
//     }
// });


module.exports = router;
