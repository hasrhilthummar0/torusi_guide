const express = require('express');
const router = express.Router();
const db = require('../../database/db');
const util = require('util');
const query = util.promisify(db.query).bind(db);

// List with pagination
router.get('/', async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const offset = (page - 1) * limit;

    try {
        const countResult = await query('SELECT COUNT(*) AS count FROM associates');
        const totalRows = countResult[0].count;
        const totalPages = Math.ceil(totalRows / limit);

        const results = await query(
            `SELECT * FROM associates ORDER BY created_at DESC LIMIT ? OFFSET ?`,
            [limit, offset]
        );

        res.render('associates', {
            title: 'Manage Associates',
            associates: results,
            currentPage: page,
            totalPages: totalPages
        });
    } catch (err) {
        console.error(err);
        res.send('Database error');
    }
});

// View associate details
router.get('/view/:id', async (req, res) => {
    const id = req.params.id;
    try {
        const results = await query('SELECT * FROM associates WHERE id = ?', [id]);
        if (!results[0]) return res.send('Associate not found');

        res.render('associate_view', {
            title: 'Associate Details',
            associate: results[0]
        });
    } catch (err) {
        console.error(err);
        res.send('Database error');
    }
});

// Update associate details (editable form submit)
router.post('/view/:id', async (req, res) => {
    const id = req.params.id;
    const { name, biography, email, organizationType, status } = req.body;

    try {
        await query(
            'UPDATE associates SET name=?, biography=?, email=?, organizationType=?, status=? WHERE id=?',
            [name, biography, email, organizationType, status, id]
        );

        res.redirect('/admin/associates/view/' + id);
    } catch (err) {
        console.error(err);
        res.send('Database error');
    }
});

// Delete associate
router.get('/delete/:id', async (req, res) => {
    const id = req.params.id;
    try {
        await query('DELETE FROM associates WHERE id = ?', [id]);
        res.redirect('/admin/associates');
    } catch (err) {
        console.error(err);
        res.send('Database error');
    }
});

// Show pending associates
router.get('/pending', async (req, res) => {
    try {
        const results = await query(
            `SELECT * FROM associates WHERE status = 'pending' ORDER BY created_at DESC`
        );

        res.render('associates_pending', {
            title: 'Pending Associates',
            associates: results
        });
    } catch (err) {
        console.error(err);
        res.send('Database error');
    }
});

// Approve associate
router.post('/approve/:id', async (req, res) => {
    const id = req.params.id;
    try {
        await query('UPDATE associates SET status="registered" WHERE id=?', [id]);
        res.redirect('/admin/associates/pending');
    } catch (err) {
        console.error(err);
        res.send('Database error');
    }
});

// Reject associate
router.post('/reject/:id', async (req, res) => {
    const id = req.params.id;
    try {
        await query('UPDATE associates SET status="rejected" WHERE id=?', [id]);
        res.redirect('/admin/associates/pending');
    } catch (err) {
        console.error(err);
        res.send('Database error');
    }
});

module.exports = router;
