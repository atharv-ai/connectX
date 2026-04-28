const express = require("express");
const {signup} = require("../controllers/authControllers");

const route = express.Router();

route.post("/signup",signup);

module.exports = route;