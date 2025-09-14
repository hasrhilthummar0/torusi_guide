  const express = require("express");
  const router = express.Router();
  const db = require("../database/db");
  const multer = require("multer");
  const path = require("path");
  const bcrypt = require('bcrypt');
  const nodemailer = require('nodemailer');
  const session = require('express-session');
  router.use(session({
    secret: 'TOUristGuide@#90##',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
  }));



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
      cb(new Error('invalid file'), false);
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
  const { error } = require("console");
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
                          govt_cert, qualification_cert, email, mobile, password,status
                      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,'Pending')
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


    db.query("SELECT COUNT(*) AS count FROM tgc_news WHERE status = 'registered'", (err, countResult) => {
      if (err) {
        console.error("Count error:", err);
        return res.status(500).send("Internal Server Error");
      }

      const totalRecords = countResult[0].count;
      const totalPages = Math.ceil(totalRecords / limit);


      db.query(
        "SELECT * FROM tgc_news WHERE status = 'registered' ORDER BY created_at DESC LIMIT ? OFFSET ?",
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
      WHERE membership_cat = 'Pan India Level' AND status = 'registered'
    `;

    db.query(countQuery, (err, countResult) => {
      if (err) return res.status(500).send('Count error');

      const total = countResult[0].total;
      const totalPages = Math.ceil(total / limit);

      const dataQuery = `
        SELECT * FROM tgc_users
        WHERE membership_cat = 'Pan India Level' AND status = 'registered'
        LIMIT ${limit} OFFSET ${offset}
      `;
      console.log(dataQuery);

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
      WHERE membership_cat = 'Regional Guide' AND status = 'registered'
    `;

    db.query(countQuery, (err, countResult) => {
      if (err) return res.status(500).send('Count error');

      const total = countResult[0].total;
      const totalPages = Math.ceil(total / limit);

      const dataQuery = `
        SELECT * FROM tgc_users
        WHERE membership_cat = 'Regional Guide' AND status = 'registered'
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
      WHERE membership_cat = 'State Level' AND status = 'registered'
    `;

    db.query(countQuery, (err, countResult) => {
      if (err) return res.status(500).send('Count error');

      const total = countResult[0].total;
      const totalPages = Math.ceil(total / limit);

      const dataQuery = `
        SELECT * FROM tgc_users
        WHERE membership_cat = 'State Level' AND status = 'registered'
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
      WHERE membership_cat = 'Eco Guide' AND status = 'registered'
    `;

    db.query(countQuery, (err, countResult) => {
      if (err) return res.status(500).send('Count error');

      const total = countResult[0].total;
      const totalPages = Math.ceil(total / limit);

      const dataQuery = `
        SELECT * FROM tgc_users
        WHERE membership_cat = 'Eco Guide' AND status = 'registered'
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
      WHERE membership_cat = 'Konark Guide' AND status = 'registered'
    `;

    db.query(countQuery, (err, countResult) => {
      if (err) return res.status(500).send('Count error');

      const total = countResult[0].total;
      const totalPages = Math.ceil(total / limit);

      const dataQuery = `
        SELECT * FROM tgc_users
        WHERE membership_cat = 'Konark Guide' AND status = 'registered'
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
      WHERE membership_cat = 'Nandankanan Guide' AND status = 'registered'
    `;

    db.query(countQuery, (err, countResult) => {
      if (err) return res.status(500).send('Count error');

      const total = countResult[0].total;
      const totalPages = Math.ceil(total / limit);

      const dataQuery = `
        SELECT * FROM tgc_users
        WHERE membership_cat = 'Nandankanan Guide' AND status = 'registered'
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
      WHERE membership_cat = 'Similipal Guide' AND status = 'registered'
    `;

    db.query(countQuery, (err, countResult) => {
      if (err) return res.status(500).send('Count error');

      const total = countResult[0].total;
      const totalPages = Math.ceil(total / limit);

      const dataQuery = `
        SELECT * FROM tgc_users
        WHERE membership_cat = 'Similipal Guide' AND status = 'registered'
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
        WHERE status = 'registered' AND isbest_guide = 1
      `;

    db.query(countQuery, (err, countResult) => {
      if (err) return res.status(500).send('Count error');

      const total = countResult[0].total;
      const totalPages = Math.ceil(total / limit);

      const dataQuery = `
          SELECT * FROM tgc_users
          WHERE status = 'registered' AND isbest_guide = 1
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

  router.get("/about/advisor", (req, res) => {
    res.render("member/advisor");
  })


  router.get("/top-tourist-places", async (req, res) => {
    try {
      const sqlQuery = "SELECT * FROM tourist_places ORDER BY id DESC";

      db.query(sqlQuery, (err, results) => {
        if (err) {
          console.error("Database query error:", err);

          return res.status(500).send("Server ma technical problem chhe.");
        }

        // 'results' ma aavelo data 'places' naam na variable tarike EJS ma moklo
        res.render("member/top_touristplace", {
          places: results
        });
      });

    } catch (error) {
      console.error("Route ma error:", error);
      res.status(500).send("Server ma technical problem chhe.");
    }
  });

  router.get("/tourist-places/:id", (req, res) => {
    try {
      // URL mathi 'id' prapt karo
      const placeId = req.params.id;

      // Database mathi te 'id' valo data shodho
      const sqlQuery = "SELECT * FROM tourist_places WHERE id = ?";

      db.query(sqlQuery, [placeId], (err, results) => {
        if (err) {
          console.error("Database query error:", err);
          return res.status(500).send("Server ma technical problem chhe.");
        }

        // Jo data male to 'tourist_place_detail.ejs' page render karo
        if (results.length > 0) {
          res.render("member/tourist_place_detail", {
            place: results[0] // Pahelo record 'place' variable tarike moklo
          });
        } else {
          // Jo data na male to 404 error moklo
          res.status(404).send("Aa ID valo koi place malyo nahi.");
        }
      });

    } catch (error) {
      console.error("Route ma error:", error);
      res.status(500).send("Server ma technical problem chhe.");
    }
  });


  router.get("/contact", (req, res) => {
    res.render("member/contact", { message: null });
  })


  router.post('/send-message', (req, res) => {


    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: "hthummar540@gmail.com",
        pass: "akmq qitg fcno cmya"
      },
      tls: {
        rejectUnauthorized: false
      }
    });


    const mailOptions = {
      from: req.body.email,
      to: "hthummar540@gmail.com",
      subject: `Contact Form Submission from ${req.body.firstName} ${req.body.lastName}`,
      html: `
              <h2>New Contact Form Inquiry</h2>
              <p><strong>Name:</strong> ${req.body.firstName} ${req.body.lastName}</p>
              <p><strong>Email:</strong> ${req.body.email}</p>
              <p><strong>Phone:</strong> ${req.body.phone || 'Not provided'}</p>
              <hr>
              <p><strong>Message:</strong></p>
              <p>${req.body.comment}</p>
          `
    };


    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error("Email send karvama error:", error);
        res.send("Please try again later.");
      } else {
        console.log('Email sent: ' + info.response);

        res.render('member/contact', {
          message: 'Thank you for your message! We will get back to you soon.'
        });
      }
    });
  });


  router.get("/api/user-count", async (req, res) => {
    try {
      const userCountResult = await db.query('SELECT COUNT(*) AS userCount FROM tgc_users');
      const totalUsers = userCountResult[0].userCount;
      res.json({ count: totalUsers });
    } catch (err) {
      console.error("API માં યુઝર કાઉન્ટ મેળવવામાં ભૂલ:", err);
      res.status(500).json({ error: "ડેટા મેળવવામાં નિષ્ફળતા મળી." });
    }
  });

  router.get("/api/review-count", async (req, res) => {
    try {
      const query = "SELECT COUNT(*) AS reviewCount FROM reviews";

      const reviewCountResult = await db.query(query);
      const totalReviews = reviewCountResult[0].reviewCount;

      res.json({ count: totalReviews });

    } catch (err) {
      console.error("API માં રિવ્યૂ કાઉન્ટ મેળવવામાં ભૂલ:", err);
      res.status(500).json({ error: "ડેટા મેળવવામાં નિષ્ફળતા મળી." });
    }
  });


  router.get("/api/state-count", async (req, res) => {
    try {

      const query = "SELECT COUNT(DISTINCT state) AS stateCount FROM tgc_users";

      const result = await db.query(query);
      const totalStates = result[0].stateCount;

      res.json({ count: totalStates });

    } catch (err) {
      console.error("API માં રાજ્ય કાઉન્ટ મેળવવામાં ભૂલ:", err);
      res.status(500).json({ error: "ડેટા મેળવવામાં નિષ્ફળતા મળી." });
    }
  });

  router.get("/login", (req, res) => {
    res.render("signin");
  })


  router.post("/login", async (req, res) => {
    const { email, password, loginRemember } = req.body;
    if (!email || !password) {
      return res.render('signin', { error: "Please enter both email and password." });
    }
    const query = "SELECT * FROM tgc_users WHERE email = ?";
    db.query(query, [email], async (err, results) => {
      if (err) {
        console.error('Database query error:', err);
        return res.status(500).render('signin', { error: 'An internal error occurred.' });
      }

      if (results.length === 0) {
        return res.status(401).render('signin', { error: 'Invalid email or password.' });
      }

      const user = results[0];
      try {
        const isMatch = await bcrypt.compare(password, user.password);
        if (isMatch) {
          if (loginRemember) {
            const sevenDays = 7 * 24 * 60 * 60 * 1000;
            req.session.cookie.maxAge = sevenDays;
          } else {
            req.session.cookie.expires = false;
          }
          req.session.isLoggedIn = true;
          req.session.user = { id: user.id, name: user.name, mobile: user.mobile, email: user.email, employee_id: user.empid };
          console.log(`User ${user.email} logged in successfully.`);

          res.redirect('/dashboard');
        } else {
          res.status(401).render('signin', { error: 'Invalid email or password.' });
        }
      } catch (bcryptError) {
        console.error('Bcrypt error:', bcryptError);
        res.status(500).render('signin', { error: 'An internal error occurred.' });
      }
    })
  })




  router.get("/dashboard", (req, res) => {
    // 1. Check if user is logged in
    if (!req.session.isLoggedIn || !req.session.user) {
      return res.redirect('/login');
    }

    let successMessage = null;
    let errorMessage = null;


    if (req.query.success === 'true') {
      successMessage = 'Profile updated successfully!';
    }


    if (req.query.error === 'wrongPassword') {
      errorMessage = 'The current password you entered is incorrect.';
    } else if (req.query.error) {
      errorMessage = 'An unexpected error occurred. Please try again.';
    }


    res.render('member/dashboard', {
      user: req.session.user,
      success: successMessage,
      error: errorMessage
    });
  });



  // router.post('/update-profile-action', async (req, res) => {
  //     try {
  //         const userId = req.session.user.id;
  //         if (!userId) {
  //             return res.redirect('/login');
  //         }

  //         const { full_name, email, phone_number, current_password, new_password } = req.body;

  //         // Start building the UPDATE query
  //         let updateQuery = 'UPDATE tgc_users SET name = ?, email = ?, mobile = ?';
  //         let queryParams = [full_name, email, phone_number];

  //         // --- Password Update Logic ---
  //         if (new_password && current_password) {
  //             // First, get the current password from DB to compare
  //             const selectQuery = 'SELECT password FROM tgc_users WHERE id = ?';
  //             db.query(selectQuery, [userId], async (err, results) => {
  //                 if (err || results.length === 0) {
  //                     console.error('Could not find user to update password:', err);
  //                     return res.redirect('/dashboard');
  //                 }

  //                 const user = results[0];
  //                 const isMatch = await bcrypt.compare(current_password, user.password);

  //                 if (isMatch) {
  //                     // If current password matches, hash the new one and add to query
  //                     const hashedNewPassword = await bcrypt.hash(new_password, 10);
  //                     updateQuery += ', password = ? WHERE id = ?';
  //                     queryParams.push(hashedNewPassword, userId);

  //                     // Execute the final update query with password
  //                     executeUpdate(updateQuery, queryParams);
  //                 } else {
  //                     console.log("Current password does not match.");
  //                     // If password doesn't match, just update other details without password
  //                     updateQuery += ' WHERE id = ?';
  //                     queryParams.push(userId);
  //                     executeUpdate(updateQuery, queryParams);
  //                 }
  //             });
  //         } else {
  //             // If no new password, just update other details
  //             updateQuery += ' WHERE id = ?';
  //             queryParams.push(userId);
  //             executeUpdate(updateQuery, queryParams);
  //         }

  //         // --- Helper function to execute the query ---
  //         function executeUpdate(sql, params) {
  //             db.query(sql, params, (err, result) => {
  //                 if (err) {
  //                     console.error('Error updating profile in DB:', err);
  //                     return res.status(500).send('An error occurred during profile update.');
  //                 }
  //                 console.log(`Profile for user ${userId} updated successfully. Affected rows: ${result.affectedRows}`);


  //                 req.session.user.email = email; 

  //                 res.redirect('/dashboard');
  //             });
  //         }

  //     } catch (error) {
  //         console.error('Error in /update-profile-action route:', error);
  //         res.status(500).send('An internal error occurred.');
  //     }
  // });


  router.post('/update-profile-action', async (req, res) => {
    try {
      const userId = req.session.user.id;
      if (!userId) {
        return res.redirect('/login');
      }

      const { full_name, email, phone_number, current_password, new_password } = req.body;

      if (new_password && current_password) {
        const selectQuery = 'SELECT password FROM tgc_users WHERE id = ?';
        db.query(selectQuery, [userId], async (err, results) => {
          if (err || results.length === 0) {
            return res.redirect('/dashboard?error=userNotFound');
          }

          const user = results[0];
          const isMatch = await bcrypt.compare(current_password, user.password);

          if (isMatch) {

            const hashedNewPassword = await bcrypt.hash(new_password, 10);
            const updateQuery = 'UPDATE tgc_users SET name = ?, email = ?, mobile = ?, password = ? WHERE id = ?';
            const queryParams = [full_name, email, phone_number, hashedNewPassword, userId];
            executeUpdate(updateQuery, queryParams);
          } else {

            console.log("Current password does not match.");
            return res.redirect('/dashboard?error=wrongPassword');
          }
        });
      } else {

        const updateQuery = 'UPDATE tgc_users SET name = ?, email = ?, mobile = ? WHERE id = ?';
        const queryParams = [full_name, email, phone_number, userId];
        executeUpdate(updateQuery, queryParams);
      }


      function executeUpdate(sql, params) {
        db.query(sql, params, (err, result) => {
          if (err) {
            console.error('Error updating profile in DB:', err);
            return res.redirect('/dashboard?error=dbError');
          }
          console.log(`Profile for user ${userId} updated successfully.`);
          req.session.user.email = email;
          res.redirect('/dashboard?success=true'); // Redirect with success
        });
      }

    } catch (error) {
      console.error('Error in /update-profile-action route:', error);
      res.status(500).send('An internal error occurred.');
    }
  });

  router.get('/logout', (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        console.error('Error destroying session:', err);
        return res.status(500).send('Could not log out, please try again.');
      }
      res.clearCookie('connect.sid');
      res.redirect('/login');
    });
  });

  router.get("/forgot-password", (req, res) => {
    res.render("forgotpassword", { error: null });
  });

  router.post('/forgot-password', async (req, res) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.render('forgotpassword', {
          error: 'Please enter your email address.'
        });
      }

      const rows = await new Promise((resolve, reject) => {
        db.query('SELECT id, email FROM tgc_users WHERE email = ?', [email], (err, results) => {
          if (err) {
            return reject(err);
          }
          resolve(results);
        });
      });


      if (rows.length > 0) {

        req.session.forgot_email = email;
        res.redirect('/otp');
      } else {

        res.render('forgotpassword', {
          error: 'Invalid email address. Please try again.'
        });
      }

    } catch (err) {
      console.error("Error during forgot password process:", err);

      res.render('forgotpassword', {
        error: 'An unexpected error occurred. Please try again later.'
      });
    }
  });


  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });

  router.get('/otp', (req, res) => {
    // Check if the user has an email in the session
    if (!req.session.forgot_email) {
      return res.redirect('/forgot-password');
    }
    // Render the OTP page you created earlier
    res.render('otp', { error: null });
  });

  router.get('/api/guides', async (req, res) => {
    try {
      // SQL ક્વેરી MySQL માટે પણ એ જ રહેશે.
      // ખાતરી કરો કે તમારા 'users' ટેબલમાં નીચે મુજબની કોલમ્સ હોય.
      const query = `
    SELECT
      empid,
      name,
      state,
      district,
      address,
      mobile,
      email,
      bio,
      photo,
      membership_cat,
      isbest_guide
    FROM
      tgc_users
  `;


      // ક્વેરી ચલાવો
      const guides = await db.query(query);

      // MySQL ડ્રાઈવર સીધું જ પરિણામોનો એરે આપે છે, એટલે .rows ની જરૂર નથી
      res.status(200).json(guides);

    } catch (err) {
      console.error("Error fetching guides:", err.message);
      res.status(500).json({ error: 'Failed to fetch guides from the database.' });
    }
  });

  // router.get('/api/guides/:empid', (req, res) => {
  //   const { empid } = req.params; // URL માંથી empid મેળવો
  //   const sql = "SELECT * FROM tgc_users WHERE empid = ?"; // empid દ્વારા ક્વેરી

  //   db.query(sql, [empid], (err, data) => {
  //     if (err) {
  //       console.error("Database error:", err);
  //       return res.status(500).json({ error: "Internal Server Error" });
  //     }
  //     if (data.length === 0) {
  //       // જો કોઈ ગાઇડ ન મળે તો
  //       return res.status(404).json({ error: "Guide not found" });
  //     }
  //     // જો ગાઇડ મળે તો તેની વિગતો મોકલો
  //     return res.json(data[0]);
  //   });
  // });

  // GET reviews for a guide
  router.get('/api/guides/:empid/reviews', (req, res) => {
    const { empid } = req.params;
    const getUserSql = 'SELECT id FROM tgc_users WHERE empid = ? LIMIT 1';
    db.query(getUserSql, [empid], (err, users) => {
      if (err) return res.status(500).json({ error: "Internal Server Error" });
      if (users.length === 0) return res.status(404).json({ error: "Guide not found." });

      const userId = users[0].id;
      const sql = 'SELECT * FROM reviews WHERE user_id = ? ORDER BY created_at DESC';
      db.query(sql, [userId], (err, data) => {
        if (err) return res.status(500).json({ error: "Internal Server Error" });
        res.json(data);
      });
    });
  });


  // POST new review
  router.post('/api/guides/:empid/reviews', (req, res) => {
    const { empid } = req.params; // e.g. 'TGC036'
    const { rating, name, email, review_text } = req.body;

    if (!rating || !name || !review_text) {
      return res.status(400).json({ error: "Rating, name, and review text are required." });
    }

    // First, get actual user id from tgc_users
    const getUserSql = 'SELECT id FROM tgc_users WHERE empid = ? LIMIT 1';
    db.query(getUserSql, [empid], (err, users) => {
      if (err) {
        console.error("Database error:", err);
        return res.status(500).json({ error: "Internal Server Error" });
      }
      if (users.length === 0) {
        return res.status(404).json({ error: "Guide not found." });
      }

      const userId = users[0].id; // integer

      const sql = `
        INSERT INTO reviews (user_id, reviewer_name, reviewer_email, rating, review_text, created_at)
        VALUES (?, ?, ?, ?, ?, NOW())
      `;

      db.query(sql, [userId, name, email || null, rating, review_text], (err, result) => {
        if (err) {
          console.error("Database error:", err);
          return res.status(500).json({ error: "Failed to submit review." });
        }
        return res.status(201).json({ message: "Review submitted successfully!", reviewId: result.insertId });
      });
    });
  });




  router.get('/api/places', (req, res) => {
    // લિસ્ટ પેજ માટે ફક્ત જરૂરી કોલમ જ લઈએ છીએ.
    const sql = "SELECT id, title, slogan, country, image FROM tourist_places";
    db.query(sql, (err, data) => {
      if (err) {
        console.error("Database error:", err);
        return res.status(500).json({ error: "Internal Server Error" });
      }
      return res.json(data);
    });
  });

  // >>> નવો રૂટ: એક જ સ્થળને તેના ID દ્વારા મેળવવા માટે <<<
  router.get('/api/places/:id', (req, res) => {
    const { id } = req.params; // URL માંથી ID મેળવો
    const sql = "SELECT * FROM tourist_places WHERE id = ?";

    db.query(sql, [id], (err, data) => {
      if (err) {
        console.error("Database error:", err);
        return res.status(500).json({ error: "Internal Server Error" });
      }
      if (data.length === 0) {
        // જો કોઈ સ્થળ ન મળે તો
        return res.status(404).json({ error: "Place not found" });
      }
      // જો સ્થળ મળે તો તેની સંપૂર્ણ વિગતો મોકલો
      return res.json(data[0]);
    });
  });

  router.get("/news", (req, res) => {
    const sql = "SELECT id, title, description, image, created_at FROM tgc_news WHERE status = 'active' ORDER BY created_at DESC";

    db.query(sql, (err, results) => {
      if (err) {
        console.error("Error fetching news:", err);
        return res.status(500).json({ error: "Database error" });
      }
      res.json(results);
    });
  });



  router.get("/news/:id", (req, res) => {
    const { id } = req.params;
    const sql = "SELECT id, title, description, image, created_at FROM tgc_news WHERE id = ? AND status = 'active' LIMIT 1";

    db.query(sql, [id], (err, results) => {
      if (err) {
        console.error("Error fetching news:", err);
        return res.status(500).json({ error: "Database error" });
      }
      if (results.length === 0) {
        return res.status(404).json({ error: "News not found" });
      }
      res.json(results[0]);
    });
  });




  const transporterdata = nodemailer.createTransport({
    service: 'gmail', // ઉદાહરણ તરીકે Gmail
    auth: {
      user: 'hthummar540@gmail.com', // તમારું ઈમેલ સરનામું
      pass: 'vqop ahbf abja jcgb'
    },
    tls: {
      rejectUnauthorized: false
    }
  });

  // API એન્ડપોઇન્ટ
  router.post('/contact', (req, res) => {
    const { name, email, message } = req.body;

    if (!name || !email || !message) {
      return res.status(400).send({ message: 'All fields are required.' });
    }

    const query = 'INSERT INTO contacts (name, email, message) VALUES (?, ?, ?)';
    db.query(query, [name, email, message], (err, result) => {
      if (err) {
        console.error('Error inserting data:', err);
        return res.status(500).send({ message: 'Error saving contact information.' });
      }
      console.log('Data inserted successfully:', result);

      // ઈમેલ મોકલવા માટેનું લોજિક
      const mailOptions = {
        from: req.body.email, // મોકલનારનું ઈમેલ સરનામું
        to: 'hthummar540@gmail.com', // જેને ઈમેલ મોકલવાનો છે તેનું સરનામું
        subject: `New Contact Form Submission from ${name}`,
        html: `
          <h3>New Contact Message</h3>
          <ul>
            <li><strong>Name:</strong> ${name}</li>
            <li><strong>Email:</strong> ${email}</li>
          </ul>
          <p><strong>Message:</strong></p>
          <p>${message}</p>
        `
      };

      transporterdata.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.error('Error sending email:', error);
          return res.status(500).send({ message: 'Error sending email.' });
        }
        console.log('Email sent:', info.response);
        res.status(201).send({ message: 'Message sent successfully!' });
      });
    });
  });

  const storagedata = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
      cb(null, `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`);
    }
  });

  const uploaddata = multer({ storage: storagedata });

  router.post('/api/associate', uploaddata.fields([
      { name: 'logo', maxCount: 1 },
      { name: 'companyVisitingCard', maxCount: 1 }
  ]), (req, res) => {
      const { name, biography, email, instagramLink, xLink, facebookLink, websiteLink, organizationType } = req.body;
      const logo = req.files['logo'] ? req.files['logo'][0].filename : null;
      const companyVisitingCard = req.files['companyVisitingCard'] ? req.files['companyVisitingCard'][0].filename : null;

      if (!name || !biography || !email || !logo || !companyVisitingCard) {
          return res.status(400).send({ message: 'All required fields must be filled out.' });
      }

      // ડુપ્લિકેટ ઈમેલ તપાસવા માટેની ક્વેરી
      const checkEmailQuery = 'SELECT COUNT(*) AS count FROM associates WHERE email = ?';
      db.query(checkEmailQuery, [email], (err, results) => {
          if (err) {
              console.error('Error checking email:', err);
              return res.status(500).send({ message: 'Internal server error.' });
          }

          if (results[0].count > 0) {
              // જો ઈમેલ પહેલાથી જ રજિસ્ટર થયેલ હોય
              return res.status(409).send({ message: 'Email already registered.' });
          }

          // જો ઈમેલ ડુપ્લિકેટ ન હોય તો ડેટા દાખલ કરો
          const insertQuery = 'INSERT INTO associates (name, biography, email, instagramLink, xLink, facebookLink, websiteLink, organizationType, logo, companyVisitingCard) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
          db.query(insertQuery, [name, biography, email, instagramLink, xLink, facebookLink, websiteLink, organizationType, logo, companyVisitingCard], (err, result) => {
              if (err) {
                  console.error('Error inserting data:', err);
                  return res.status(500).send({ message: 'Error saving associate information.' });
              }
              console.log('Data inserted successfully:', result);
              res.status(201).send({ message: 'Application submitted successfully!' });
          });
      });
  });

  router.get('/associates', (req, res) => {
    const query = 'SELECT * FROM associates';
    db.query(query, (err, results) => {
      if (err) {
        console.error('Error fetching data:', err);
        return res.status(500).send({ message: 'Error retrieving associates.' });
      }
      const associates = results.map(associate => ({
          id: associate.id,
          name: associate.name,
          biography: associate.biography, // Added biography
          email: associate.email, // Added email
          logo: associate.logo, // Added logo
          organizationType: associate.organizationType, // Added organizationType
          created_at: associate.created_at, // Added created_at
          socials: {
              instagramLink: associate.instagramLink, // Added Instagram link
              xLink: associate.xLink, // Added X link
              facebookLink: associate.facebookLink, // Added Facebook link
              websiteLink: associate.websiteLink // Added Website link
          }
      }));
      res.status(200).json(associates);
    });
  });

  const storagemembership = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, "uploads/"); // make sure uploads folder exists
    },
    filename: function (req, file, cb) {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname));
    },
  });

  // ===== Multer Fields =====
  // Uncomment this block and use it instead of .any()
  const uploadmembership = multer({ storage: storagemembership }).fields([
    { name: "aadhaar_card", maxCount: 1 },
    { name: "passport_photo", maxCount: 1 },
    { name: "qualification_cert", maxCount: 1 },
    { name: "guide_idcard", maxCount: 1 },
    { name: "govt_cert", maxCount: 1 },
  ]);
  // Helper function to find a file by its fieldname from the array
  function findFileByFieldname(files, fieldname) {
    return files.find(file => file.fieldname === fieldname);
  }

  // Submit membership
  router.post("/submit_membership", uploadmembership, async (req, res) => {
    try {
      const {
        fullName: name,
        dob,
        gender,
        bloodGroup: blood_group,
        state,
        district,
        pincode,
        address,
        membershipCategory: membership_cat,
        membershipType: membership_type,
        shortBio: bio,
        email,
        mobileNumber: mobile,
        password,
      } = req.body;

      // Corrected file handling for multer.any()
      const aadhaar_file = findFileByFieldname(req.files, "aadhaar_card");
      const photo_file = findFileByFieldname(req.files, "passport_photo");
      const qualification_file = findFileByFieldname(req.files, "qualification_cert");
      const guide_idcard_file = findFileByFieldname(req.files, "guide_idcard");
      const govt_cert_file = findFileByFieldname(req.files, "govt_cert");

      const aadhaar = aadhaar_file ? aadhaar_file.filename : null;
      const photo = photo_file ? photo_file.filename : null;
      const qualification_cert = qualification_file ? qualification_file.filename : null;
      const guide_idcard = guide_idcard_file ? guide_idcard_file.filename : null;
      const govt_cert = govt_cert_file ? govt_cert_file.filename : null;

      // Validation
      if (
        !name || !dob || !gender || !blood_group || !state ||
        !district || !pincode || !address || !membership_cat ||
        !membership_type || !bio || !email || !mobile || !password
      ) {
        return res.status(400).json({ success: false, message: "Missing required text fields" });
      }

      if (!aadhaar || !photo || !qualification_cert || !guide_idcard || !govt_cert) {
        return res.status(400).json({ success: false, message: "All files are required" });
      }

      // Insert into MySQL
      const sql = `INSERT INTO tgc_users 
        (name, dob, gender, blood_group, state, district, pincode, address, 
        membership_cat, membership_type, bio, email, mobile, password, 
        aadhaar_card, passport_photo, qualification_cert, guide_idcard, govt_cert) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

      db.query(
        sql,
        [
          name, dob, gender, blood_group, state, district, pincode, address, 
          membership_cat, membership_type, bio, email, mobile, password, 
          aadhaar, photo, qualification_cert, guide_idcard, govt_cert,
        ],
        (err, result) => {
          if (err) {
            console.error("DB Error:", err);
            return res.status(500).json({ success: false, message: "Database error" });
          }
          res.status(200).json({ success: true, message: "Membership submitted successfully!" });
        }
      );
    } catch (error) {
      console.error("Server error:", error);
      res.status(500).json({ success: false, message: "Server error" });
    }
  });


  router.get("/activities", (req, res) => {
    res.render("member/activities");
  })


  router.get("/associate_registration",(req,res)=>{
    res.render("member/associate_registration");
  })

  module.exports = router;