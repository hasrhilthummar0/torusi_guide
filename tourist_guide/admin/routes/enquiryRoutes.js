const express = require("express");
const router = express.Router();
const db = require("../../database/db");

// ✅ Enquiries List
// ✅ Enquiries List with pagination
router.get("/enquiries/manage", (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = 10; // 10 records per page
    const offset = (page - 1) * limit;

    db.query("SELECT COUNT(*) AS count FROM contacts", (err, countResult) => {
        if (err) throw err;
        const totalRecords = countResult[0].count;
        const totalPages = Math.ceil(totalRecords / limit);

        db.query("SELECT * FROM contacts ORDER BY id DESC LIMIT ? OFFSET ?", [limit, offset], (err, rows) => {
            if (err) throw err;
            res.render("manage_enquiries", {
                enquiries: rows,
                title: "Manage Enquiries",
                currentPage: page,
                totalPages: totalPages
            });
        });
    });
    console.log("Enquiries route accessed");
    
});


module.exports = router;
