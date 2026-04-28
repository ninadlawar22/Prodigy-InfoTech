const jwt = require("jsonwebtoken");

function verifyToken(req, res, next) {
    const token = req.headers["authorization"];

    if (!token) {
        return res.status(403).json({ message: "Token required" });
    }

    try {
        const actualToken = token.split(" ")[1];
        const decoded = jwt.verify(actualToken, process.env.JWT_SECRET);
        req.admin = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ message: "Invalid or expired token" });
    }
}

module.exports = verifyToken;
