const express = require("express");
const userRoutes = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const { getUsers } = require("../controllers/userController");

userRoutes.get("/", authMiddleware, getUsers);

module.exports = userRoutes;
