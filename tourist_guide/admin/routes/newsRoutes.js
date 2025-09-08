const express = require("express");
const router = express.Router();
const db = require("../../database/db");
const { title } = require("process");

// ✅ Manage page with pagination
router.get("/news/manage", (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = 10; // per page
    const offset = (page - 1) * limit;

    // Count total
    db.query("SELECT COUNT(*) AS count FROM news_info", (err, countResult) => {
        if (err) throw err;
        const totalItems = countResult[0].count;
        const totalPages = Math.ceil(totalItems / limit);

        // Fetch paginated data
        db.query("SELECT * FROM news_info ORDER BY id DESC LIMIT ? OFFSET ?", [limit, offset], (err, rows) => {
            if (err) throw err;
            res.render("manage_news", {
                newsList: rows,
                title: "Manage News",
                currentPage: page,
                totalPages: totalPages
            });
        });
    });
});


// ✅ Add form
router.get("/news/add", (req, res) => {
    res.render("news_form", { news: null , title: "Add News"});
});

// ✅ Insert news (only title, description, link)
router.post("/news/insert", (req, res) => {
    const { title, description, link } = req.body;

    const sql = "INSERT INTO news_info (title, description, link, created_at) VALUES (?, ?, ?, NOW())";
    db.query(sql, [title, description, link], (err) => {
        if (err) throw err;
        res.redirect("/admin/news/add");
    });
});

// ✅ Edit form
router.get("/news/edit/:id", (req, res) => {
    const id = req.params.id;
    db.query("SELECT * FROM news_info WHERE id = ?", [id], (err, rows) => {
        if (err) throw err;
        res.render("news_form", { news: rows[0] ,title: "Edit News"});
    });
});

// ✅ Update
router.post("/news/update/:id", (req, res) => {
    const { title, description, link } = req.body;
    const id = req.params.id;

    const sql = "UPDATE news_info SET title=?, description=?, link=? WHERE id=?";
    db.query(sql, [title, description, link, id], (err) => {
        if (err) throw err;
        res.redirect("/admin/news/manage");
    });
});

// ✅ Delete
router.get("/news/delete/:id", (req, res) => {
    const id = req.params.id;
    db.query("DELETE FROM news_info WHERE id = ?", [id], (err) => {
        if (err) throw err;
        res.redirect("/admin/news/manage");
    });
});

module.exports = router;
