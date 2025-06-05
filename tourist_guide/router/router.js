const express = require("express");
const router = express.Router();
const db = require("../database/db")

router.get("/",(req,res)=>{
    res.render("index")
})

// NEWS DATA

router.get('/news', async (req, res) => {
  try {
    db.query("SELECT * FROM news_info WHERE status = 'active' ORDER BY created_at DESC", (err, result) => {
      if (err) throw err;
      res.render('index', { news: result });
    });
  } catch (error) {
    console.error("Error fetching news:", error);
    res.status(500).send("Internal Server Error");
  }
});


module.exports = router;