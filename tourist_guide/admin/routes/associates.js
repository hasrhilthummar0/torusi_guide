const express = require('express');
const router = express.Router();
const db = require('../../database/db'); // your db connection

router.get('/', (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = 10; // rows per page
    const offset = (page - 1) * limit;

    // Get total count first
    db.query('SELECT COUNT(*) AS count FROM associates', (err, countResult) => {
        if (err) return res.send('Database error');

        const totalRows = countResult[0].count;
        const totalPages = Math.ceil(totalRows / limit);

        // Get paginated data
        const query = `SELECT * FROM associates ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`;
        db.query(query, (err, results) => {
            if (err) return res.send('Database error');

            res.render('associates', {
                title: 'Manage Associates',
                associates: results,
                currentPage: page,
                totalPages: totalPages
            });
        });
    });
});

router.get('/view/:id', (req, res) => {
    const id = req.params.id;

    const query = 'SELECT * FROM associates WHERE id = ?';
    db.query(query, [id], (err, results) => {
        if (err) return res.send('Database error');
        if (results.length === 0) return res.send('Associate not found');

        res.render('associate_view', {
            title: 'View Associate',
            associate: results[0]
        });
    });
});

// Delete associate
router.get('/delete/:id', (req, res) => {
    const id = req.params.id;

    db.query('DELETE FROM associates WHERE id = ?', [id], (err, result) => {
        if (err) return res.send('Database error');
        res.redirect('/admin/associates');
    });
}); 

// Show Pending Associates
router.get('/pending', (req, res) => {
    const query = `SELECT * FROM associates WHERE status = 'pending' ORDER BY created_at DESC`;
    db.query(query, (err, results) => {
        if (err) return res.send('Database error');

        res.render('associates_pending', {
            title: 'Pending Associates',
            associates: results
        });
    });
});


// Approve Associate
router.post('/approve/:id', (req, res) => {
    const id = req.params.id;
    db.query('UPDATE associates SET status = "registered" WHERE id = ?', [id], (err) => {
        if (err) return res.send('Database error');
        res.redirect('/admin/associates/pending');
    });
});

// Reject Associate
router.post('/reject/:id', (req, res) => {
    const id = req.params.id;
    db.query('UPDATE associates SET status = "rejected" WHERE id = ?', [id], (err) => {
        if (err) return res.send('Database error');
        res.redirect('/admin/associates/pending');
    });
});

// View Associate Details
router.get("/associates/view/:id", async (req, res) => {
    const id = req.params.id;
    try {
        const associate = await query("SELECT * FROM associates WHERE id=?", [id]);

        if (associate.length === 0) {
            return res.send("Associate not found");
        }

        res.render("admin/view_associate", {
            title: "View Associate Details",
            associate: associate[0],
        });
    } catch (err) {
        console.error(err);
        res.send("Database error");
    }
});


module.exports = router;
