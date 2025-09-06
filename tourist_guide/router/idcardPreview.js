const express = require('express');
const router = express.Router();
const path = require('path');
const sharp = require('sharp');
const qrcode = require('qrcode');
const db = require("../database/db");
const fs = require('fs');

// 🔹 Common function to fetch user data
async function getUserData(userId) {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT id, name, role, mobile, email, blood_group, created_at AS issueDate, updated_at AS expiryDate, photo 
            FROM tgc_users 
            WHERE id=?
        `;
        db.query(query, [userId], (err, results) => {
            if (err) return reject(err);
            if (results.length === 0) return reject(new Error("User not found"));

            const user = results[0];

            let photoPath;
            if (user.photo && fs.existsSync(path.join(__dirname, '..', 'uploads', user.photo))) {
                photoPath = path.join(__dirname, '..', 'uploads', user.photo);
            } else {
                photoPath = path.join(__dirname, '..', 'uploads', 'user-photo.jpg');
            }

            resolve({
                id: user.id,
                name: user.name,
                role: user.role,
                mobile: user.mobile,
                email: user.email,
                bloodGroup: user.blood_group,
                issueDate: user.issueDate ? user.issueDate.toISOString().split('T')[0] : '',
                expiryDate: user.expiryDate ? user.expiryDate.toISOString().split('T')[0] : '',
                photoPath
            });
        });
    });
}

// 🔹 Create text overlay SVG
async function createTextSVG(userData, templatePath) {
    const metadata = await sharp(templatePath).metadata();
    const width = metadata.width;
    const height = metadata.height;

    return Buffer.from(`
        <svg width="${width}" height="${height}">
            <style>
                .name { fill: black; font-size: 50px; font-weight: bold; }
                .role { fill: black; font-size: 40px; }
                .info-value { fill: black; font-size: 35px; }
            </style>

            <text x="25%" y="1250" text-anchor="middle" class="name">${userData.name}</text>
            <text x="25%" y="1355" text-anchor="middle" class="role">${userData.role}</text>

            <text x="20%" y="1565" text-anchor="start" class="info-value">${userData.id}</text>
            <text x="20%" y="1644" text-anchor="start" class="info-value">${userData.mobile}</text>
            <text x="20%" y="1735" text-anchor="start" class="info-value">${userData.bloodGroup}</text>
            <text x="20%" y="1820" text-anchor="start" class="info-value">${userData.email}</text>

            <text x="61%" y="1473" text-anchor="start" class="info-value">${userData.issueDate}</text>
            <text x="61.11%" y="1526.50" text-anchor="start" class="info-value">${userData.expiryDate}</text>
        </svg>
    `);
}

// 🔹 Preview route
router.get('/preview/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;
        const userData = await getUserData(userId);
        const templatePath = path.join(__dirname, '..', 'uploads', 'idcard.jpg');

        const textOverlay = await createTextSVG(userData, templatePath);

        // Resize profile photo
        const profilePhotoBuffer = await sharp(userData.photoPath)
            .resize({ width: 580, height: 660 }) // <-- adjust width & height
            .toBuffer();

        // QR Code
        const qrData = {
            url: `http://localhost:3000/guide-view/${userData.id}`,
            id: userData.id,
            name: userData.name,
            mobile: userData.mobile,
            email: userData.email,
            bloodGroup: userData.bloodGroup,
            issueDate: userData.issueDate,
            expiryDate: userData.expiryDate
        };
        const qrCodeBuffer = await qrcode.toBuffer(JSON.stringify(qrData), { width: 217 });

        // Composite all layers
        const finalBuffer = await sharp(templatePath)
            .composite([
                { input: profilePhotoBuffer, left: 363, top: 434 }, // resized profile photo
                { input: qrCodeBuffer, left: 2294, top: 1605 },
                { input: textOverlay, top: 0, left: 0 }
            ])
            .jpeg()
            .toBuffer();

        const base64Image = finalBuffer.toString("base64");

        res.render("member/idcard-preview", {
            image: base64Image,
            user: userData
        });
    } catch (err) {
        console.error(err);
        res.status(500).send("Failed to generate preview");
    }
});

router.get('/api/idcard/preview/download/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    const userData = await getUserData(userId);
    const templatePath = path.join(__dirname, '..', 'uploads', 'idcard.jpg');

    const textOverlay = await createTextSVG(userData, templatePath);

    const qrData = {
      url: `http://localhost:3000/guide-view/${userData.id}`,
      id: userData.id,
      name: userData.name,
      mobile: userData.mobile,
      email: userData.email,
      bloodGroup: userData.bloodGroup,
      issueDate: userData.issueDate,
      expiryDate: userData.expiryDate
    };
    const qrCodeBuffer = await qrcode.toBuffer(JSON.stringify(qrData), { width: 217 });

    const finalBuffer = await sharp(templatePath)
      .composite([
        { input: userData.photoPath, left: 470, top: 590 },
        { input: qrCodeBuffer, left: 2294, top: 1605 },
        { input: textOverlay, top: 0, left: 0 }
      ])
      .jpeg()
      .toBuffer();

    // Set headers to download
    res.set({
      'Content-Disposition': `attachment; filename="ID_Card_${userData.name}.jpg"`,
      'Content-Type': 'image/jpeg'
    });

    res.send(finalBuffer);

  } catch (err) {
    console.error(err);
    res.status(500).send("Failed to generate/download ID Card");
  }
});

module.exports = router;
