// routes/users.js
const express = require('express');
const router = express.Router();
const db = require('../database/db');

// 🔍 Search by empid or name
router.get('/search', (req, res) => {
  const term = req.query.q;
  if (!term) return res.status(400).json({ error: 'Query is required' });

  const sql = `
    SELECT id, empid, name, email, mobile, photo
    FROM tgc_users
    WHERE empid LIKE ? OR name LIKE ?
    LIMIT 20
  `;

  const like = `%${term}%`;
  db.query(sql, [like, like], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

module.exports = router;
