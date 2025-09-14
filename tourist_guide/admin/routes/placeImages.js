const express = require("express");
const router = express.Router();
const db = require("../../database/db");
const multer = require("multer");
const path = require("path");

// Multer setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/places"); // Ensure this folder exists
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + "_" + Math.round(Math.random() * 1e9);
    cb(null, uniqueName + path.extname(file.originalname));
  },
});

const upload = multer({ storage: storage });

// GET page to show upload form
router.get("/:placeId", (req, res) => {
  const placeId = req.params.placeId;
  const sql = "SELECT * FROM tourist_places WHERE id = ?";
  db.query(sql, [placeId], (err, results) => {
    if (err) return res.send("DB Error");
    if (results.length === 0) return res.send("Place not found");
    res.render("upload_place_images", { place: results[0] });
  });
});

// POST: Upload multiple images
router.post("/:placeId", upload.array("images", 3), (req, res) => {
  const placeId = req.params.placeId;
  const files = req.files;

  if (!files || files.length === 0) return res.send("No files uploaded");

  // First, get existing images
  const selectSql = "SELECT image_1, image_2, image_3 FROM tourist_places WHERE id = ?";
  db.query(selectSql, [placeId], (err, results) => {
    if (err) return res.send("DB error");
    if (results.length === 0) return res.send("Place not found");

    const currentImages = results[0]; // { image_1, image_2, image_3 }

    // Prepare updated images
    const updatedImages = { ...currentImages };

    // Fill empty slots first
    let fileIndex = 0;
    for (let key of ["image_1", "image_2", "image_3"]) {
      if (!currentImages[key] && files[fileIndex]) {
        updatedImages[key] = files[fileIndex].filename;
        fileIndex++;
      }
    }

    // Optional: If all slots are filled, replace starting from image_1
    while (fileIndex < files.length) {
      updatedImages["image_1"] = files[fileIndex].filename;
      fileIndex++;
    }

    const sql = `
      UPDATE tourist_places SET
        image_1 = ?, image_2 = ?, image_3 = ?
      WHERE id = ?
    `;
    db.query(
      sql,
      [updatedImages.image_1, updatedImages.image_2, updatedImages.image_3, placeId],
      (err, result) => {
        if (err) return res.send("Database error");
        res.render("upload_place_images", { place: { ...updatedImages, id: placeId } });
      }
    );
  });
});


module.exports = router;
