require('dotenv').config();

const express = require('express');
const mysql = require('mysql2');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const helmet = require('helmet');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json());
app.use(cors());
app.use(helmet());

// MySQL Connection
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: 3306
});
db.connect((err) => {
    if (err) {
        console.log("Database connection failed:", err);
    } else {
        console.log("Database connected successfully");
    }
});

// Test Route
app.get('/', (req, res) => {
    res.send('Server is running...');
});

// Register Route
app.post('/api/auth/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // Validation
        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: 'All fields are required'
            });
        }

        // Check existing user
        const checkUser = "SELECT * FROM users WHERE email = ?";

        db.query(checkUser, [email], async (err, result) => {
            if (err) {
                return res.status(500).json({
                    success: false,
                    message: 'Database error'
                });
            }

            if (result.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Email already registered'
                });
            }

            // Hash password
            const hashedPassword = await bcrypt.hash(password, 10);

            // Insert user
            const insertUser = `
                INSERT INTO users (name, email, password)
                VALUES (?, ?, ?)
            `;

            db.query(
                insertUser,
                [name, email, hashedPassword],
                (err, result) => {
                    if (err) {
                        return res.status(500).json({
                            success: false,
                            message: 'Registration failed'
                        });
                    }

                    // Generate JWT
                    const token = jwt.sign(
                        {
                            id: result.insertId,
                            email: email,
                            role: 'user'
                        },
                        process.env.JWT_SECRET,
                        { expiresIn: '1d' }
                    );

                    res.status(201).json({
                        success: true,
                        message: 'Registration successful',
                        token,
                        user: {
                            id: result.insertId,
                            name,
                            email,
                            role: 'user'
                        }
                    });
                }
            );
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

// Login Route
app.post('/api/auth/login', (req, res) => {
    try {
        const { email, password } = req.body;

        // Validation
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email and password are required'
            });
        }

        // Find user by email
        const findUser = "SELECT * FROM users WHERE email = ?";

        db.query(findUser, [email], async (err, result) => {
            if (err) {
                return res.status(500).json({
                    success: false,
                    message: 'Database error'
                });
            }

            if (result.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid email or password'
                });
            }

            const user = result[0];

            // Compare password
            const isMatch = await bcrypt.compare(password, user.password);

            if (!isMatch) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid email or password'
                });
            }

            // Generate JWT
            const token = jwt.sign(
                {
                    id: user.id,
                    email: user.email,
                    role: user.role
                },
                process.env.JWT_SECRET,
                { expiresIn: '1d' }
            );

            res.status(200).json({
                success: true,
                message: 'Login successful',
                token,
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role
                }
            });
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});