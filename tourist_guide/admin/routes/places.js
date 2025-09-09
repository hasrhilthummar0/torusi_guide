const express = require("express");
const router = express.Router();
const db = require("../../database/db");
const multer = require("multer");
const path = require("path");

// 🔹 Storage setup
    const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // Use absolute path to your admin/public/uploads/places
        cb(null, path.join(__dirname, '../../admin/public/uploads/places'));
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
    });
const upload = multer({ storage });

// =======================
// Admin Panel - Add Place
// =======================
router.get("/add", (req, res) => {
  res.render("places_form", { title: "Add Tourist Place" });
});

router.post("/add", upload.single("image"), (req, res) => {
  const { title, slogan, country, description } = req.body;
  const image = req.file ? "/uploads/places/" + req.file.filename : "";

  const sql = "INSERT INTO tourist_places (title, slogan, country, image, description) VALUES (?, ?, ?, ?, ?)";
  db.query(sql, [title, slogan, country, image, description], (err) => {
    if (err) {
      console.error(err);
      return res.status(500).send("Error inserting place.");
    }
    res.redirect("/places/add");
  });
});

// =======================
// Admin Panel - List Places
// =======================
router.get("/manage", (req, res) => {
  const perPage = 5; // ek page ma ketla rows
  const page = parseInt(req.query.page) || 1;

  db.query("SELECT COUNT(*) as count FROM tourist_places", (err, countResult) => {
    if (err) {
      console.error(err);
      return res.status(500).send("Error fetching places count.");
    }

    const totalPlaces = countResult[0].count;
    const totalPages = Math.ceil(totalPlaces / perPage);

    db.query(
      "SELECT * FROM tourist_places ORDER BY id DESC LIMIT ? OFFSET ?",
      [perPage, (page - 1) * perPage],
      (err, results) => {
        if (err) {
          console.error(err);
          return res.status(500).send("Error fetching places.");
        }

        res.render("../admin/views/places_manage", {
          places: results,
          title: "Manage Places",
          currentPage: page,
          totalPages: totalPages,
        });
      }
    );
  });
});


router.post("/delete/:id", (req, res) => {
  const placeId = req.params.id;
  db.query("DELETE FROM tourist_places WHERE id = ?", [placeId], (err) => {
    if (err) {
      console.error(err);
      return res.status(500).send("Error deleting place.");
    }
    res.redirect("/places/manage");
  });
});

module.exports = router;
