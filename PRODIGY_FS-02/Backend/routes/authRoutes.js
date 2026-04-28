const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../config/db");

const router = express.Router();

router.post("/login", (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required" });
    }

    const sql = "SELECT * FROM admins WHERE username = ?";

    db.query(sql, [username], async (err, result) => {
        if (err) {
            return res.status(500).json({ message: "Database error" });
        }

        if (result.length === 0) {
            return res.status(401).json({ message: "Invalid username or password" });
        }

        const admin = result[0];
        const isMatch = await bcrypt.compare(password, admin.password);

        if (!isMatch) {
            return res.status(401).json({ message: "Invalid username or password" });
        }

        const token = jwt.sign(
            { id: admin.id, username: admin.username },
            process.env.JWT_SECRET,
            { expiresIn: "1h" }
        );

        res.json({
            message: "Login successful",
            token: token
        });
    });
});

module.exports = router;
