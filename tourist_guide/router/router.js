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




// router.post("/submit_membership", async (req, res) => {
//     try {
//         upload(req, res, async (error) => {
//             try {
//                 if (error) {
//                     console.error("Upload Error:", error);
//                     return res.status(400).json({
//                         success: false,
//                         message: error.message || "File upload failed"
//                     });
//                 }

//                 const checkEmailQuery = "SELECT id FROM tgc_users WHERE email = ?";
//                 const existingUser = await query(checkEmailQuery, [req.body.email]);

//                 if (existingUser.length > 0) {
//                     return res.status(400).json({
//                         success: false,
//                         message: "This email is already registered",
//                         field: "email"
//                     });
//                 }
//                 if (!req.body.name || !req.body.dob || !req.body.bloodgroup || !req.body.state ||
//                     !req.body.district || !req.body.pincode || !req.body.address || !req.body.category ||
//                     !req.body.type || !req.body.bio || !req.body.email || !req.body.mobile || !req.body.password) {
//                     return res.status(400).json({
//                         success: false,
//                         message: "Missing required fields"
//                     });
//                 }


//                 const dob = new Date(req.body.dob);
//                 const today = new Date();

//                 if (isNaN(dob.getTime())) {
//                     return res.status(400).json({
//                         success: false,
//                         message: "Invalid date of birth",
//                         field: "dob"
//                     });
//                 }

//                 if (dob > today) {
//                     return res.status(400).json({
//                         success: false,
//                         message: "Date of birth cannot be in the future",
//                         field: "dob"
//                     });
//                 }


//                 const mobile = req.body.mobile;
//                 const mobileRegex = /^[0-9]{10}$/;

//                 if (!mobileRegex.test(mobile)) {
//                     return res.status(400).json({
//                         success: false,
//                         message: "Mobile number must be exactly 10 digits",
//                         field: "mobile"
//                     });
//                 }


//                 const pincode = req.body.pincode;
//                 const pincodeRegex = /^[0-9]{6}$/;

//                 if (!pincodeRegex.test(pincode)) {
//                     return res.status(400).json({
//                         success: false,
//                         message: "Pincode must be exactly 6 digits",
//                         field: "pincode"
//                     });
//                 }


//                 const requiredFiles = [
//                     'passport_photo',
//                     'aadhaar_card',
//                     'identity_card',
//                     'govt_cert',
//                     'qualification_cert'
//                 ];

//                 const missingFiles = requiredFiles.filter(file => {
//                     return !req.files || !req.files[file] || req.files[file].length === 0;
//                 });

//                 if (missingFiles.length > 0) {
//                     return res.status(400).json({
//                         success: false,
//                         message: 'Missing required files',
//                         missingFiles: missingFiles
//                     });
//                 }


//                 const password = req.body.password;
//                 const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

//                 if (!passwordRegex.test(password)) {
//                     return res.status(400).json({
//                         success: false,
//                         message: "Password must be at least 8 characters and contain:",
//                         requirements: {
//                             minLength: 8,
//                             uppercase: "At least one uppercase letter (A-Z)",
//                             lowercase: "At least one lowercase letter (a-z)",
//                             number: "At least one number (0-9)",
//                             specialChar: "At least one special character (@$!%*?&)"
//                         }
//                     });
//                 }


//                 const {
//                     name, gender, bloodgroup: blood_group, state, district,
//                     address, category: membership_cat, type: membership_type,
//                     bio, email
//                 } = req.body;

//                 const files = req.files || {};
//                 const passport_photo = files['passport_photo']?.[0]?.filename || null;
//                 const aadhaar_card = files['aadhaar_card']?.[0]?.filename || null;
//                 const identity_card = files['identity_card']?.[0]?.filename || null;
//                 const govt_cert = files['govt_cert']?.[0]?.filename || null;
//                 const qualification_cert = files['qualification_cert']?.[0]?.filename || null;

//                 const insertQuery = `
//                     INSERT INTO tgc_users (
//                         name, dob, gender, blood_group, state, district, pincode, address,
//                         membership_cat, membership_type, bio, aadhaar, photo, guide_idcard,
//                         govt_cert, qualification_cert, email, mobile, password
//                     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
//                 `;

//                 const values = [
//                     name, req.body.dob, gender, blood_group, state, district, pincode, address,
//                     membership_cat, membership_type, bio, aadhaar_card, passport_photo,
//                     identity_card, govt_cert, qualification_cert, email, mobile, password
//                 ];

//                 const result = await db.query(insertQuery, values);

//                 return res.json({
//                     success: true,
//                     message: "Membership submitted successfully",
//                     data: { id: result.insertId }
//                 });

//             } catch (error) {
//                 return res.status(500).json({
//                     message: "Server Error",
//                     success: false,
//                     error: error.message
//                 });
//             }
//         });
//     } catch (error) {
//         console.error("Server Error:", error);
//         return res.status(500).json({
//             success: false,
//             message: "Internal server error",
//             error: error.message
//         });
//     }
// });


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


router.get("/origin_history",(req,res)=>{
    res.render("member/origin_history")
})


router.get("/aims_objectives",async(req,res)=>{
    res.render("member/aims_objectives")
})

module.exports = router;