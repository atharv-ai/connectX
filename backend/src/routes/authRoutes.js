const express = require("express");
const { signup, signin } = require("../controllers/authControllers");
const authMiddleware = require("../middleware/authMiddleware");
const authRoutes = express.Router();

authRoutes.post("/signup", signup);
authRoutes.post("/signin", signin);

authRoutes.get("/protected", authMiddleware, (req, res) => {
    res.json({
        message: "Authorized.",
        userId: req.userId
    });
});

module.exports = authRoutes;
