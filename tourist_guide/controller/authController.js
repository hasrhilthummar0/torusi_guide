const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const db = require("../database/db"); // mysql connection

exports.loginUser = (req, res) => {
  const { emailOrEmpid, password } = req.body;
  console.log(req.body);

  if (!emailOrEmpid || !password) {
    return res.status(400).json({ message: "Email/EmpID and password required" });
  }

  // Query check both
  const query = "SELECT * FROM tgc_users WHERE email = ? OR empid = ?";

  db.query(query, [emailOrEmpid, emailOrEmpid], async (err, results) => {
    if (err) return res.status(500).json({ message: "DB error", error: err });
    if (results.length === 0) return res.status(404).json({ message: "User not found" });

    const user = results[0];

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: "Invalid credentials" });

    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        empid: user.empid,
        role: user.role,
      },
    });
  });
};

// 👤 Get Profile
exports.getProfile = (req, res) => {
  const userId = req.user.id;
  db.query("SELECT id, empid, name, email, mobile, bio, photo FROM tgc_users WHERE id = ?", [userId],
    (err, results) => {
      if (err) return res.status(500).json({ message: "DB error" });
      if (results.length === 0) return res.status(404).json({ message: "User not found" });
      res.json(results[0]);
    }
  );
};

// ✏️ Update Profile
exports.updateProfile = (req, res) => {
  const userId = req.user.id;
  const { name, mobile, bio } = req.body;
  const photo = req.file ? req.file.filename : null;

  const sql = "UPDATE tgc_users SET name=?, mobile=?, bio=?, photo=? WHERE id=?";
  db.query(sql, [name, mobile, bio, photo, userId], (err, result) => {
    if (err) return res.status(500).json({ message: "DB error", error: err });
    res.json({ message: "Profile updated successfully" });
  });
};



// 🔒 Change Password
exports.changePassword = async (req, res) => {
  try {
    const userId = req.user.id; // from JWT
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ message: "Old and new passwords are required" });
    }

    // Get current hashed password
    db.query("SELECT password FROM tgc_users WHERE id = ?", [userId], async (err, results) => {
      if (err) return res.status(500).json({ message: "DB error", error: err });
      if (results.length === 0) return res.status(404).json({ message: "User not found" });

      const hashedPassword = results[0].password;

      // Compare old password
      const isMatch = await bcrypt.compare(oldPassword, hashedPassword);
      if (!isMatch) return res.status(400).json({ message: "Old password is incorrect" });

      // Hash new password
      const newHashedPassword = await bcrypt.hash(newPassword, 10);

      // Update password
      db.query("UPDATE tgc_users SET password = ? WHERE id = ?", [newHashedPassword, userId], (err2, result) => {
        if (err2) return res.status(500).json({ message: "DB error", error: err2 });
        res.json({ message: "Password changed successfully" });
      });
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};
