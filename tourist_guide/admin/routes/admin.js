const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const db = require('../../database/db'); // your MySQL connection
const { title } = require('process');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // 👇 admin/routes thi ek level pacho jayi ne public/uploads/blog ma
    cb(null, path.join(__dirname, '../public/uploads/blog')); 
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

router.get("/add", (req, res) => {
  res.render("blog_form", { title: "Add Blog" ,news: null});
});

// Handle POST request
router.post('/add', upload.single('image'), (req, res) => {
  const { title, description, status } = req.body;
  const image = req.file ? req.file.filename : null;

  const sql = 'INSERT INTO tgc_news (title, description, image, status) VALUES (?, ?, ?, ?)';
  db.query(sql, [title, description, image, status], (err, result) => {
    if (err) throw err;
   res.redirect('/blogs/add'); // redirect to blog list in admin
  });
});


router.get("/news", (req, res) => {
  const page = parseInt(req.query.page) || 1; // current page
  const limit = 10; // rows per page
  const offset = (page - 1) * limit;

  const countSql = "SELECT COUNT(*) AS count FROM tgc_news";
  const dataSql = "SELECT id, title, description, image, status, created_at FROM tgc_news ORDER BY created_at DESC LIMIT ? OFFSET ?";

  db.query(countSql, (err, countResult) => {
    if (err) {
      console.error("Error counting news:", err);
      return res.status(500).send("Database error");
    }

    const totalItems = countResult[0].count;
    const totalPages = Math.ceil(totalItems / limit);

    db.query(dataSql, [limit, offset], (err, results) => {
      if (err) {
        console.error("Error fetching news:", err);
        return res.status(500).send("Database error");
      }

      res.render("news_list", { 
        title: "Manage News",
        news: results,
        currentPage: page,
        totalPages: totalPages
      });
    });
  });
});


// Delete news
router.get("/delete/:id", (req, res) => {
  const { id } = req.params;
  const sql = "DELETE FROM tgc_news WHERE id = ?";
  db.query(sql, [id], (err) => {
    if (err) {
      console.error("Error deleting news:", err);
      return res.status(500).send("Database error");
    }
    res.redirect("/blogs/news");
  });
});

// GET edit page
router.get("/edit/:id", (req, res) => {
  const { id } = req.params;
  const sql = "SELECT * FROM tgc_news WHERE id = ?";
  db.query(sql, [id], (err, results) => {
    if (err) return res.status(500).send("Database error");
    if (results.length === 0) return res.send("Blog not found");

    res.render("edit_blog", {
      title: "Edit Blog - " + results[0].title,
      news: results[0]  // pass existing blog
    });
  });
});

// POST update blog
router.post("/edit/:id", upload.single('image'), (req, res) => {
  const { id } = req.params;
  const { title, description, status } = req.body;

  let sql = "UPDATE tgc_news SET title = ?, description = ?, status = ?";
  let params = [title, description, status];

  if (req.file) {
    sql += ", image = ?";
    params.push(req.file.filename);
  }

  sql += " WHERE id = ?";
  params.push(id);

  db.query(sql, params, (err) => {
    if (err) return res.status(500).send("Database error");
    res.redirect("/blogs/news");
  });
});


module.exports = router;
