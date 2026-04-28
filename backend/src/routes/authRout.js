const express = require("express");
const {signup,signin} = require("../controllers/authControllers");
const authMiddleware = require("../middleware/authMiddleware");
const route = express.Router();

route.post("/signup",signup);
route.post("/signin",signin);

route.get("/protected", authMiddleware, (req, res) => {
    res.json({
        message: "You are authorized",
        userID: req.userID
    });
});

module.exports = route;