const express = require("express");
const router = express.Router();
const db = require("../database/db")

// router.get("/", (req, res) => {
//   res.render("index", { news: [] }); // ✅ empty array to avoid crash
// });


// // NEWS DATA

// router.get('/news', async (req, res) => {
//   try {
//     db.query("SELECT * FROM news_info WHERE status = 'active' ORDER BY created_at DESC", (err, result) => {
//       if (err) throw err;
//       res.render('index', { news: result });
//     });
//   } catch (error) {
//     console.error("Error fetching news:", error);
//     res.status(500).send("Internal Server Error");
//   }
// });


router.get("/", (req, res) => {
  db.query("SELECT * FROM news_info WHERE status = 'active' ORDER BY created_at DESC", (err, result) => {
    if (err) {
      console.error("Error fetching news:", err);
      return res.status(500).send("Internal Server Error");
    }
    res.render("index", { news: result });
  });
});



// membership

router.get("/membership",async(req,res)=>{
    res.render("member/membership")
})


module.exports = router;