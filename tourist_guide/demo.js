const sharp = require('sharp');
const qrcode = require('qrcode');
const fs = require('fs');
const path = require('path');

/**
 * Simulate fetching user data
 */
async function getUserData(userId) {
    console.log(`Simulating database query for user ID: ${userId}`);
    const userData = {
        id: 'C-12345',
        name: 'Alex Johnson',
        role: 'Data Scientist',
        mobile: '+91 9876543210',
        email: 'alex.johnson@example.com',
        bloodGroup: 'O+',
        issueDate: Date.now(),
        expiryDate: Date.now() + (365 * 24 * 60 * 60 * 1000),
        photoPath: path.join(__dirname, 'uploads', 'user-photo.jpg')
    };
    console.log('User data:', userData);
    return userData;
}

/**
 * Create SVG overlay for text (name, role, and other dummy data)
 * Existing CSS for name & role is unchanged
 */
function createTextSVG(userData, width = 1200, height = 2000) {
    return Buffer.from(`
        <svg width="${width}" height="${height}">
            <style>
                .name { fill: black; font-size: 50px; font-weight: bold; }
                .role { fill: black; font-size: 40px; }
                .info-label { fill: black; font-size: 30px; font-weight: bold; }
                .info-value { fill: black; font-size: 35px; }
            </style>

            <!-- Existing name & role -->
            <text x="54%" y="1250" text-anchor="middle" class="name">${userData.name}</text>
            <text x="54%" y="1355" text-anchor="middle" class="role">${userData.role}</text>

            

            <!-- Additional dummy data -->
            
            <text x="45%" y="1565" text-anchor="start" class="info-value">${userData.id}</text>

            <text x="45%" y="1644" text-anchor="start" class="info-value">${userData.mobile}</text>
            <text x="45%" y="1820" text-anchor="start" class="info-value">${userData.email}</text>


            <text x="45%" y="1735" text-anchor="start" class="info-value">${userData.bloodGroup}</text>
            <text x="45%" y="1820" text-anchor="start" class="info-value">${userData.email}</text>

            <text x="99%" y="200" text-anchor="start" class="info-value">${userData.issueDate}</text>



        </svg>
        
    `);
}

/**
 * Main function to generate ID card
 */
async function generateIdCard(userId) {
    try {
        const uploadsDir = path.join(__dirname, 'uploads');
        const templateFrontPath = path.join(uploadsDir, 'idcard.jpg');

        if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

        if (!fs.existsSync(templateFrontPath)) {
            console.error(`Template file not found: ${templateFrontPath}`);
            return;
        }

        const userData = await getUserData(userId);

        // Create mock user photo if missing
        if (!fs.existsSync(userData.photoPath)) {
            console.log('Creating mock user photo...');
            const buffer = await sharp({
                create: { width: 300, height: 300, channels: 4, background: { r: 255, g: 192, b: 203, alpha: 1 } }
            }).png().toBuffer();
            fs.writeFileSync(userData.photoPath, buffer);
        }

        // Generate QR code (contains full dummy data)
        const qrCodeData = JSON.stringify(userData);
        const qrCodeBuffer = await qrcode.toBuffer(qrCodeData, { type: 'png', width: 217 });

        // Create SVG overlay with full info
        const textOverlay = createTextSVG(userData);

        // Composite all elements
        const finalFrontPath = path.join(uploadsDir, `idcard_front_${userId}.jpg`);
        await sharp(templateFrontPath)
            .composite([
                { input: userData.photoPath, left: 500, top: 600 }, // adjust photo position
                { input: qrCodeBuffer, left: 2294, top: 1605 },     // adjust QR position
                { input: textOverlay, top: 0, left: 0 }             // overlay all text
            ])
            .jpeg()
            .toFile(finalFrontPath);

        console.log(`ID card generated successfully at: ${finalFrontPath}`);
    } catch (error) {
        console.error('Error generating ID card:', error);
    }
}

// Call the main function
generateIdCard('C-12345');
