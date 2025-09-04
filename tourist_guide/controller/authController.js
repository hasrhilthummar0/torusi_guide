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
  const userId = req.user.id; // from middleware
  db.query("SELECT id, empid, name, email, mobile, bio, photo, cover_photo FROM tgc_users WHERE id = ?", [userId],
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
  const { name, mobile, bio, photo, cover_photo } = req.body;

  db.query(
    "UPDATE tgc_users SET name=?, mobile=?, bio=?, photo=?, cover_photo=? WHERE id=?",
    [name, mobile, bio, photo, cover_photo, userId],
    (err, result) => {
      if (err) return res.status(500).json({ message: "DB error" });
      res.json({ message: "Profile updated successfully" });
    }
  );
};
