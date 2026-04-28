const express = require("express");
const db = require("../config/db");
const verifyToken = require("../middleware/auth");

const router = express.Router();

router.get("/", verifyToken, (req, res) => {
    const sql = "SELECT * FROM employees ORDER BY id DESC";

    db.query(sql, (err, result) => {
        if (err) {
            return res.status(500).json({ message: "Database error" });
        }

        res.json(result);
    });
});

router.post("/", verifyToken, (req, res) => {
    const { name, email, phone, department, salary } = req.body;

    if (!name || !email || !phone || !department || !salary) {
        return res.status(400).json({ message: "All fields are required" });
    }

    if (!email.includes("@")) {
        return res.status(400).json({ message: "Invalid email format" });
    }

    if (phone.length < 10) {
        return res.status(400).json({ message: "Phone number must be at least 10 digits" });
    }

    if (salary <= 0) {
        return res.status(400).json({ message: "Salary must be greater than 0" });
    }

    const sql = "INSERT INTO employees (name, email, phone, department, salary) VALUES (?, ?, ?, ?, ?)";

    db.query(sql, [name, email, phone, department, salary], (err) => {
        if (err) {
            return res.status(500).json({ message: "Email already exists or database error" });
        }

        res.json({ message: "Employee added successfully" });
    });
});

router.put("/:id", verifyToken, (req, res) => {
    const { id } = req.params;
    const { name, email, phone, department, salary } = req.body;

    if (!name || !email || !phone || !department || !salary) {
        return res.status(400).json({ message: "All fields are required" });
    }

    const sql = `
        UPDATE employees 
        SET name = ?, email = ?, phone = ?, department = ?, salary = ?
        WHERE id = ?
    `;

    db.query(sql, [name, email, phone, department, salary, id], (err) => {
        if (err) {
            return res.status(500).json({ message: "Database error" });
        }

        res.json({ message: "Employee updated successfully" });
    });
});

router.delete("/:id", verifyToken, (req, res) => {
    const { id } = req.params;

    const sql = "DELETE FROM employees WHERE id = ?";

    db.query(sql, [id], (err) => {
        if (err) {
            return res.status(500).json({ message: "Database error" });
        }

        res.json({ message: "Employee deleted successfully" });
    });
});

module.exports = router;
