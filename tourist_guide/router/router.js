const express = require("express");
const router = express.Router();
const db = require("../database/db");
const multer = require("multer");
const path = require("path");
const bcrypt = require('bcrypt');




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

router.get("/membership", async (req, res) => {
  res.render("member/membership")
})


const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

// abhi sirf jpeg , png , jpg
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png/;
  const isExtValid = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const isMimeValid = allowedTypes.test(file.mimetype);

  if (isExtValid && isMimeValid) {
    cb(null, true);
  } else {
    cb(new Error('માત્ર .jpg, .png, અથવા .pdf ફાઇલો માન્ય છે!'), false);
  }
};


const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: fileFilter
}).fields([
  { name: 'passport_photo', maxCount: 1 },
  { name: 'aadhaar_card', maxCount: 1 },
  { name: 'identity_card', maxCount: 1 },
  { name: 'govt_cert', maxCount: 1 },
  { name: 'qualification_cert', maxCount: 1 }
]);




const util = require("util");
const query = util.promisify(db.query).bind(db);

router.post("/submit_membership", async (req, res) => {
  try {
    upload(req, res, async (error) => {
      try {
        if (error) {
          console.error("Upload Error:", error);
          return res.status(400).json({
            success: false,
            message: error.message || "File upload failed"
          });
        }



        const mobilenocheck = "SELECT id FROM tgc_users WHERE mobile = ?";
        const checkmobile = await query(mobilenocheck, [req.body.mobile]);

        if (checkmobile.length > 0) {
          return res.status(400).json({
            success: false,
            message: "This mobile number is already registered",
            field: "mobile"
          });
        }



        const checkEmailQuery = "SELECT id FROM tgc_users WHERE email = ?";
        const existingUser = await query(checkEmailQuery, [req.body.email]);

        if (existingUser.length > 0) {
          return res.status(400).json({
            success: false,
            message: "This email is already registered",
            field: "email"
          });
        }




        const {
          name, dob, gender, bloodgroup: blood_group, state, district,
          pincode, address, category: membership_cat, type: membership_type,
          bio, email, mobile, password
        } = req.body;

        if (!name || !dob || !blood_group || !state || !district || !pincode || !address ||
          !membership_cat || !membership_type || !bio || !email || !mobile || !password) {
          return res.status(400).json({
            success: false,
            message: "Missing required fields"
          });
        }


        const dobDate = new Date(dob);
        const today = new Date();

        if (isNaN(dobDate.getTime())) {
          return res.status(400).json({
            success: false,
            message: "Invalid date of birth",
            field: "dob"
          });
        }

        if (dobDate > today) {
          return res.status(400).json({
            success: false,
            message: "Date of birth cannot be in the future",
            field: "dob"
          });
        }


        const mobileRegex = /^[0-9]{10}$/;
        if (!mobileRegex.test(mobile)) {
          return res.status(400).json({
            success: false,
            message: "Mobile number must be exactly 10 digits",
            field: "mobile"
          });
        }


        const pincodeRegex = /^[0-9]{6}$/;
        if (!pincodeRegex.test(pincode)) {
          return res.status(400).json({
            success: false,
            message: "Pincode must be exactly 6 digits",
            field: "pincode"
          });
        }


        const requiredFiles = [
          'passport_photo',
          'aadhaar_card',
          'identity_card',
          'govt_cert',
          'qualification_cert'
        ];

        const missingFiles = requiredFiles.filter(file => {
          return !req.files || !req.files[file] || req.files[file].length === 0;
        });

        if (missingFiles.length > 0) {
          return res.status(400).json({
            success: false,
            message: 'Missing required files',
            missingFiles: missingFiles
          });
        }


        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        if (!passwordRegex.test(password)) {
          return res.status(400).json({
            success: false,
            message: "Password must be at least 8 characters and contain:",
            requirements: {
              minLength: 8,
              uppercase: "At least one uppercase letter (A-Z)",
              lowercase: "At least one lowercase letter (a-z)",
              number: "At least one number (0-9)",
              specialChar: "At least one special character (@$!%*?&)"
            }
          });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const files = req.files || {};
        const passport_photo = files['passport_photo']?.[0]?.filename || null;
        const aadhaar_card = files['aadhaar_card']?.[0]?.filename || null;
        const identity_card = files['identity_card']?.[0]?.filename || null;
        const govt_cert = files['govt_cert']?.[0]?.filename || null;
        const qualification_cert = files['qualification_cert']?.[0]?.filename || null;


        const insertQuery = `
                    INSERT INTO tgc_users (
                        name, dob, gender, blood_group, state, district, pincode, address,
                        membership_cat, membership_type, bio, aadhaar, photo, guide_idcard,
                        govt_cert, qualification_cert, email, mobile, password
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `;

        const values = [
          name, dob, gender, blood_group, state, district, pincode, address,
          membership_cat, membership_type, bio, aadhaar_card, passport_photo,
          identity_card, govt_cert, qualification_cert, email, mobile, hashedPassword
        ];

        const result = await query(insertQuery, values);
        const generatedEmpid = `TGC${String(result.insertId).padStart(3, '0')}`;

        const updateEmpidQuery = `
                    UPDATE tgc_users
                    SET empid = ?
                    WHERE id = ?
                `;

        await query(updateEmpidQuery, [generatedEmpid, result.insertId]);

        return res.json({
          success: true,
          message: "Membership submitted successfully",
          data: { id: result.insertId }
        });

      } catch (error) {
        console.error("Inner Error:", error);
        return res.status(500).json({
          message: "Server Error",
          success: false,
          error: error.message
        });
      }
    });
  } catch (error) {
    console.error("Outer Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
});


router.get("/origin_history", (req, res) => {
  res.render("member/origin_history")
})


router.get("/aims_objectives", async (req, res) => {
  res.render("member/aeims_objective")
})


router.get("/about/about_the_founder", async (req, res) => {
  res.render("member/about_founder")
})

router.get("/about/about_membership", async (req, res) => {
  res.render("member/about_member")
})


router.get("/publications", (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = 4;
  const offset = (page - 1) * limit;


  db.query("SELECT COUNT(*) AS count FROM tgc_news WHERE status = 'active'", (err, countResult) => {
    if (err) {
      console.error("Count error:", err);
      return res.status(500).send("Internal Server Error");
    }

    const totalRecords = countResult[0].count;
    const totalPages = Math.ceil(totalRecords / limit);


    db.query(
      "SELECT * FROM tgc_news WHERE status = 'active' ORDER BY created_at DESC LIMIT ? OFFSET ?",
      [limit, offset],
      (err, result) => {
        if (err) {
          console.error("Data error:", err);
          return res.status(500).send("Internal Server Error");
        }

        res.render("member/publication", {
          enquiry: result,
          currentPage: page,
          totalPages: totalPages,
        });
      }
    );
  });
});

// router.get("/panindia_level", async (req, res) => {
//     res.render("member/panindia_level")
// })
router.get('/panindia_level', (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = 6;
  const offset = (page - 1) * limit;

  // First, get total count
  const countQuery = `
    SELECT COUNT(*) AS total FROM tgc_users
    WHERE membership_cat = 'Pan India Level' AND status = 'Active'
  `;

  db.query(countQuery, (err, countResult) => {
    if (err) return res.status(500).send('Count error');

    const total = countResult[0].total;
    const totalPages = Math.ceil(total / limit);

    const dataQuery = `
      SELECT * FROM tgc_users
      WHERE membership_cat = 'Pan India Level' AND status = 'Active'
      LIMIT ${limit} OFFSET ${offset}
    `;

    db.query(dataQuery, (err, results) => {
      if (err) return res.status(500).send('Data error');

      res.render('member/panindia_level', {
        guides: results,
        currentPage: page,
        totalPages
      });
    });
  });
});




router.get('/regional_level', (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = 6;
  const offset = (page - 1) * limit;

  const countQuery = `
    SELECT COUNT(*) AS total FROM tgc_users
    WHERE membership_cat = 'Regional Guide' AND status = 'Active'
  `;

  db.query(countQuery, (err, countResult) => {
    if (err) return res.status(500).send('Count error');

    const total = countResult[0].total;
    const totalPages = Math.ceil(total / limit);

    const dataQuery = `
      SELECT * FROM tgc_users
      WHERE membership_cat = 'Regional Guide' AND status = 'Active'
      LIMIT ${limit} OFFSET ${offset}
    `;

    db.query(dataQuery, (err, results) => {
      if (err) return res.status(500).send('Data error');

      res.render('member/regional_level', {
        guides: results,
        currentPage: page,
        totalPages
      });
    });
  });
});



router.get('/state_level', (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = 6;
  const offset = (page - 1) * limit;


  const countQuery = `
    SELECT COUNT(*) AS total FROM tgc_users
    WHERE membership_cat = 'State Level' AND status = 'Active'
  `;

  db.query(countQuery, (err, countResult) => {
    if (err) return res.status(500).send('Count error');

    const total = countResult[0].total;
    const totalPages = Math.ceil(total / limit);

    const dataQuery = `
      SELECT * FROM tgc_users
      WHERE membership_cat = 'State Level' AND status = 'Active'
      LIMIT ${limit} OFFSET ${offset}
    `;

    db.query(dataQuery, (err, results) => {
      if (err) return res.status(500).send('Data error');

      res.render('member/state_level', {
        guides: results,
        currentPage: page,
        totalPages
      });
    });
  });
});



router.get('/eco_guide', (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = 6;
  const offset = (page - 1) * limit;


  const countQuery = `
    SELECT COUNT(*) AS total FROM tgc_users
    WHERE membership_cat = 'Eco Guide' AND status = 'Active'
  `;

  db.query(countQuery, (err, countResult) => {
    if (err) return res.status(500).send('Count error');

    const total = countResult[0].total;
    const totalPages = Math.ceil(total / limit);

    const dataQuery = `
      SELECT * FROM tgc_users
      WHERE membership_cat = 'Eco Guide' AND status = 'Active'
      LIMIT ${limit} OFFSET ${offset}
    `;

    db.query(dataQuery, (err, results) => {
      if (err) return res.status(500).send('Data error');

      res.render('member/eco_guide', {
        guides: results,
        currentPage: page,
        totalPages
      });
    });
  });
});




router.get('/konark', (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = 6;
  const offset = (page - 1) * limit;


  const countQuery = `
    SELECT COUNT(*) AS total FROM tgc_users
    WHERE membership_cat = 'Konark Guide' AND status = 'Active'
  `;

  db.query(countQuery, (err, countResult) => {
    if (err) return res.status(500).send('Count error');

    const total = countResult[0].total;
    const totalPages = Math.ceil(total / limit);

    const dataQuery = `
      SELECT * FROM tgc_users
      WHERE membership_cat = 'Konark Guide' AND status = 'Active'
      LIMIT ${limit} OFFSET ${offset}
    `;

    db.query(dataQuery, (err, results) => {
      if (err) return res.status(500).send('Data error');

      res.render('member/konark', {
        guides: results,
        currentPage: page,
        totalPages
      });
    });
  });
});


router.get('/nandankanan_guide', (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = 6;
  const offset = (page - 1) * limit;


  const countQuery = `
    SELECT COUNT(*) AS total FROM tgc_users
    WHERE membership_cat = 'Nandankanan Guide' AND status = 'Active'
  `;

  db.query(countQuery, (err, countResult) => {
    if (err) return res.status(500).send('Count error');

    const total = countResult[0].total;
    const totalPages = Math.ceil(total / limit);

    const dataQuery = `
      SELECT * FROM tgc_users
      WHERE membership_cat = 'Nandankanan Guide' AND status = 'Active'
      LIMIT ${limit} OFFSET ${offset}
    `;

    db.query(dataQuery, (err, results) => {
      if (err) return res.status(500).send('Data error');

      res.render('member/nandankanan_guide', {
        guides: results,
        currentPage: page,
        totalPages
      });
    });
  });
});


router.get('/similipal_guide', (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = 6; // itne container add he abhi change kar sakte he 
  const offset = (page - 1) * limit;

  
  const countQuery = `
    SELECT COUNT(*) AS total FROM tgc_users
    WHERE membership_cat = 'Similipal Guide' AND status = 'Active'
  `;

  db.query(countQuery, (err, countResult) => {
    if (err) return res.status(500).send('Count error');

    const total = countResult[0].total;
    const totalPages = Math.ceil(total / limit);

    const dataQuery = `
      SELECT * FROM tgc_users
      WHERE membership_cat = 'Similipal Guide' AND status = 'Active'
      LIMIT ${limit} OFFSET ${offset}
    `;

    db.query(dataQuery, (err, results) => {
      if (err) return res.status(500).send('Data error');

      res.render('member/similipal', {
        guides: results,
        currentPage: page,
        totalPages
      });
    });
  });
});




router.get('/top_tourist_guide', (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = 6;
  const offset = (page - 1) * limit;

  const countQuery = `
      SELECT COUNT(*) AS total 
      FROM tgc_users
      WHERE status = 'active' AND isbest_guide = 1
    `;

  db.query(countQuery, (err, countResult) => {
    if (err) return res.status(500).send('Count error');

    const total = countResult[0].total;
    const totalPages = Math.ceil(total / limit);

    const dataQuery = `
        SELECT * FROM tgc_users
        WHERE status = 'active' AND isbest_guide = 1
        ORDER BY id DESC
        LIMIT ${limit} OFFSET ${offset}
      `;

    db.query(dataQuery, (err, results) => {
      if (err) return res.status(500).send('Data error');

      res.render('member/top_touristguide', {
        guides: results,
        currentPage: page,
        totalPages: totalPages
      });
    });
  });
});

function runQuery(sql, params) {
  return new Promise((resolve, reject) => {
    db.query(sql, params, (err, results) => {
      if (err) {
        return reject(err);
      }
      resolve(results);
    });
  });
}

router.get("/guide_profile/:id", async (req, res) => {
  try {
    const guideId = req.params.id;


    const guideQuery = "SELECT * FROM tgc_users WHERE id = ?";
    const guideRows = await runQuery(guideQuery, [guideId]);


    if (guideRows.length === 0) {
      return res.status(404).send("Guide not found");
    }
    const guide = guideRows[0];


    const photosQuery = "SELECT * FROM guide_gallery_photos WHERE guide_id = ?";
    const photoRows = await runQuery(photosQuery, [guideId]);

    const reviewsQuery = "SELECT * FROM reviews WHERE user_id = ? ORDER BY created_at DESC";
    const reviewRows = await runQuery(reviewsQuery, [guideId]);

    res.render("member/guide_profile", {
      guide: guide,
      galleryPhotos: photoRows,
      reviews: reviewRows
    });

  } catch (error) {
    console.error("Route Error:", error);
    res.status(500).send("Internal Server Error");
  }
});

router.post("/api/guides/:id/toggle_favorite", async (req, res) => {
  try {
    const guideId = req.params.id;

    const selectQuery = "SELECT isfavorite FROM tgc_users WHERE id = ?";
    const rows = await runQuery(selectQuery, [guideId]);

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: "Guide not found" });
    }

    const currentStatus = rows[0].isfavorite;
    const newStatus = currentStatus ? 0 : 1;

    const updateQuery = "UPDATE tgc_users SET isfavorite = ? WHERE id = ?";
    await runQuery(updateQuery, [newStatus, guideId]);

    res.json({ success: true, isfavorite: newStatus });

  } catch (error) {
    console.error("Favorite toggle error:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});

router.post("/guides/:id/reviews", async (req, res) => {
  try {
    const userId = req.params.id;

    const { name, email, rating, review_text } = req.body;


    const insertQuery = `
            INSERT INTO reviews (user_id, reviewer_name, reviewer_email, rating, review_text) 
            VALUES (?, ?, ?, ?, ?)
        `;


    await runQuery(insertQuery, [userId, name, email, rating, review_text]);


    res.redirect(`/guide_profile/${userId}`);

  } catch (error) {
    console.error("Review Submission Error:", error);
    res.status(500).send("Internal Server Error");
  }
});

router.post('/profile/views/:profileId', async (req, res) => {
    const profileId = req.params.profileId;
    const visitorIp = req.ip; // Get the visitor's IP address

    try {
        // Insert visit only if not already recorded
        await db.query(
            "INSERT IGNORE INTO profile_visits (profile_id, visitor_ip, visit_time) VALUES (?, ?, NOW())",
            [profileId, visitorIp]
        );

        // Get updated unique views count
        const [viewResult] = await db.query(
            "SELECT COUNT(DISTINCT visitor_ip) AS views FROM profile_visits WHERE profile_id = ?",
            [profileId]
        );

        const uniqueViews = viewResult[0].views || 0;

        res.json({
            success: true,
            views: uniqueViews
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
});


router.get('/photos', async (req, res) => {
  try {
    const perPage = 9;
    const page = parseInt(req.query.page) || 1;
    const offset = (page - 1) * perPage;


    const totalCount = await new Promise((resolve, reject) => {
      db.query('SELECT COUNT(*) AS count FROM gallery_categories', (err, result) => {
        if (err) return reject(err);
        resolve(result[0].count);
      });
    });


    const categories = await new Promise((resolve, reject) => {
      db.query(
        'SELECT * FROM gallery_categories LIMIT ? OFFSET ?',
        [perPage, offset],
        (err, results) => {
          if (err) return reject(err);
          resolve(results);
        }
      );
    });

    const totalPages = Math.ceil(totalCount / perPage);


    res.render('member/photo', {
      categories,
      currentPage: page,
      totalPages,
    });
  } catch (err) {
    console.error('Gallery query failed:', err);
    res.status(500).send('Server error');
  }
});

router.get('/gallery/:slug', async (req, res) => {
  const slug = req.params.slug;
  const perPage = 6;
  const page = parseInt(req.query.page) || 1;
  const offset = (page - 1) * perPage;

  try {
    const [catRows] = await new Promise((resolve, reject) => {
      db.query('SELECT * FROM gallery_categories WHERE slug = ?', [slug], (err, result) => {
        if (err) return reject(err);
        resolve([result]);
      });
    });

    const category = catRows[0];
    if (!category) return res.status(404).send('Category not found');

    const [countRows] = await new Promise((resolve, reject) => {
      db.query('SELECT COUNT(*) AS count FROM gallery_images WHERE category_id = ?', [category.id], (err, result) => {
        if (err) return reject(err);
        resolve(result);
      });
    });

    const totalCount = countRows.count || countRows[0]?.count || 0;

    const [images] = await new Promise((resolve, reject) => {
      db.query('SELECT * FROM gallery_images WHERE category_id = ? LIMIT ? OFFSET ?', [category.id, perPage, offset], (err, result) => {
        if (err) return reject(err);
        resolve([result]);
      });
    });

    const totalPages = Math.ceil(totalCount / perPage);


    res.render('member/gallery_detail', {
      category,
      images,
      currentPage: page,
      totalPages
    });

  } catch (err) {
    console.error('Gallery error:', err);
    res.status(500).send('Server error');
  }
});





module.exports = router;