const express = require("express");
const router = express.Router();
const db = require("../../database/db");
// console.log(db);

const multer = require("multer");
const path = require("path");

// Storage config
const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, "public/uploads/");
    },
    filename: function(req, file, cb) {
        cb(null, Date.now() + "-" + file.originalname);
    }
});

const upload = multer({ storage: storage });

// 🔐 Fixed admin credentials
const ADMIN_EMAIL = "touristguide@gmail.com";
const ADMIN_PASSWORD = "touristGuide@123";

// Login page
// Login page
router.get("/login", (req, res) => {
    res.render("../admin/views/admin_login", {
        error: null,
        title: 'Admin Dashboard'
    });
});

// Login form submit
router.post("/login", (req, res) => {
    const { email, password } = req.body;

    if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
        // Store session
        req.session.admin = { email };
        return res.redirect("/admin/dashboard");
    } else {
        return res.render("../admin/views/admin_login", {
            error: "Invalid email or password",
            title: 'Admin Dashboard'
        });
    }
});

// Dashboard (protected route)
// Dashboard (protected route)
router.get("/dashboard", (req, res) => {
    if (!req.session.admin) {
        return res.redirect("/admin/login");
    }

    const queryGuides = "SELECT COUNT(*) AS totalGuides FROM tgc_users";
    const queryAssociates = "SELECT COUNT(*) AS totalAssociates FROM associates";
    const queryBlogs = "SELECT COUNT(*) AS totalBlogs FROM tgc_news";
    const queryEnquiries = "SELECT COUNT(*) AS totalEnquiries FROM enquiries";
    const queryRegisteredGuides = `
        SELECT id, name, bio, email, photo 
        FROM tgc_users 
        WHERE status = 'registered' 
        ORDER BY created_at DESC 
        LIMIT 5
    `;

    db.query(queryGuides, (err, guideResult) => {
        const totalGuides = !err && guideResult[0] ? guideResult[0].totalGuides : 0;

        db.query(queryAssociates, (err2, associateResult) => {
            const totalAssociates = !err2 && associateResult[0] ? associateResult[0].totalAssociates : 0;

            db.query(queryBlogs, (err3, blogResult) => {
                const totalBlogs = !err3 && blogResult[0] ? blogResult[0].totalBlogs : 0;

                db.query(queryEnquiries, (err4, enquiryResult) => {
                    const totalEnquiries = !err4 && enquiryResult[0] ? enquiryResult[0].totalEnquiries : 0;

                    // 🔹 Registered Guides fetch
                    db.query(queryRegisteredGuides, (err5, registeredGuides) => {
                        if (err5) {
                            console.log("Registered guides fetch error:", err5);
                            return res.send("Database error");
                        }

                        res.render("../admin/views/index", {
                            totalGuides,
                            totalAssociates,
                            totalBlogs,
                            totalEnquiries,
                            registeredGuides,   // 👈 Pass to EJS
                            title: 'Admin Dashboard',
                            admin: req.session.admin
                        });
                    });
                });
            });
        });
    });
});



router.get("/guides", (req, res) => {
    if (!req.session.admin) return res.redirect("/admin/login");

    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const offset = (page - 1) * limit;

    // Count total guides
    db.query("SELECT COUNT(*) AS total FROM tgc_users", (err, countResult) => {
        if (err) return res.send("Database error");

        const totalGuides = countResult[0].total;
        const totalPages = Math.ceil(totalGuides / limit);

        // Fetch paginated guides
        db.query(
            `SELECT * FROM tgc_users ORDER BY id DESC LIMIT ? OFFSET ?`,
            [limit, offset],
            (err, guides) => {
                if (err) return res.send("Database error");

                res.render("../admin/views/guides", {
                    guides,
                    currentPage: page,
                    totalPages,
                    title: "Manage Guides",
                    admin: req.session.admin
                });
            }
        );
    });
});

// Add guide page
router.get("/guides/add", (req, res) => {
    if (!req.session.admin) return res.redirect("/admin/login");
    res.render("../admin/views/add_guide", { title: "Add Guide" });
});

// Edit guide page
// Update guide POST
router.post("/guides/edit/:id", upload.fields([
    { name: "photo", maxCount: 1 },
    { name: "guide_idcard", maxCount: 1 },
    { name: "govt_cert", maxCount: 1 },
    { name: "qualification_cert", maxCount: 1 }
]), (req, res) => {
    if (!req.session.admin) return res.redirect("/admin/login");

    const id = req.params.id;
    const {
        name, dob, gender, blood_group, email, mobile,
        status, role, membership_cat, membership_type, expertise,
        bio, address, district, state, pincode
    } = req.body;

    db.query("SELECT * FROM tgc_users WHERE id = ?", [id], (err, result) => {
        if (err || result.length === 0) return res.send("Guide not found");

        // Existing files
        let photo = result[0].photo;
        let guide_idcard = result[0].guide_idcard;
        let govt_cert = result[0].govt_cert;
        let qualification_cert = result[0].qualification_cert;

        // Replace if new files uploaded
        if (req.files["photo"]) photo = req.files["photo"][0].filename;
        if (req.files["guide_idcard"]) guide_idcard = req.files["guide_idcard"][0].filename;
        if (req.files["govt_cert"]) govt_cert = req.files["govt_cert"][0].filename;
        if (req.files["qualification_cert"]) qualification_cert = req.files["qualification_cert"][0].filename;

        // Update query
        const sql = `
            UPDATE tgc_users SET 
            name=?, dob=?, gender=?, blood_group=?, email=?, mobile=?,
            status=?, role=?, membership_cat=?, membership_type=?, expertise=?,
            bio=?, address=?, district=?, state=?, pincode=?,
            photo=?, guide_idcard=?, govt_cert=?, qualification_cert=?
            WHERE id=?
        `;

        db.query(sql, [
            name, dob, gender, blood_group, email, mobile,
            status, role, membership_cat, membership_type, expertise,
            bio, address, district, state, pincode,
            photo, guide_idcard, govt_cert, qualification_cert,
            id
        ], (err2) => {
            if (err2) return res.send("Database error");
            res.redirect("/admin/guides/view/" + id);
        });
    });
});


// Delete guide
router.get("/guides/delete/:id", (req, res) => {
    if (!req.session.admin) return res.redirect("/admin/login");
    const id = req.params.id;

    db.query("DELETE FROM tgc_users WHERE id = ?", [id], (err) => {
        if (err) return res.send("Database error");
        res.redirect("/admin/guides");
    });
});

// View guide page
router.get("/guides/view/:id", (req, res) => {
    if (!req.session.admin) return res.redirect("/admin/login");
    const id = req.params.id;

    db.query("SELECT * FROM tgc_users WHERE id = ?", [id], (err, result) => {
        if (err || result.length === 0) return res.send("Guide not found");

        res.render("../admin/views/view_guide", { 
            guide: result[0], 
            associate: result[0],
            title: "View Guide", 
            admin: req.session.admin 
        });
    });
});

// Approve guide
router.post("/guides/approve/:id", (req, res) => {
    const id = req.params.id;

    db.query("UPDATE tgc_users SET status='registered' WHERE id=?", [id], (err, result) => {
        if (err) return res.send("Database error");
        res.redirect("/admin/guides/pending");
    });
});
// Reject guidea
// Reject guide
router.post("/guides/reject/:id", (req, res) => {
    const id = req.params.id;
    db.query("UPDATE tgc_users SET status='cancelled' WHERE id=?", [id], (err, result) => {
        if (err) return res.send("Database error");
        res.redirect("/admin/guides/pending");
    });
});

// Pending guides list
router.get("/guides/pending", (req, res) => {
    if (!req.session.admin) return res.redirect("/admin/login");
    db.query("SELECT * FROM tgc_users WHERE status='pending' ORDER BY created_at DESC", (err, guides) => {
        if (err) return res.send("Database error");
        res.render("pending_guides", { guides, title: "Pending Guides", admin: req.session.admin });
    });
});



// Logout
router.get("/logout", (req, res) => {
    req.session.destroy(() => {
        res.redirect("/admin/login");
    });
});

module.exports = router;
