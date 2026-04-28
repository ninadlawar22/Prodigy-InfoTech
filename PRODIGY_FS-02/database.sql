CREATE DATABASE IF NOT EXISTS employee_crud_db;

USE employee_crud_db;

CREATE TABLE IF NOT EXISTS admins (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS employees (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    phone VARCHAR(15) NOT NULL,
    department VARCHAR(100) NOT NULL,
    salary DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Default admin login
-- Username: admin
-- Password: admin123
INSERT IGNORE INTO admins (username, password)
VALUES (
    'admin',
    '$2b$10$uXHyqdftM8VnTAz7jDkiSe9tqhspFbVN4DYbLJQmErg6imZD4eg6O'
);
