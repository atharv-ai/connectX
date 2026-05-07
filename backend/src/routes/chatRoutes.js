const express = require("express");
const chatRoutes = express.Router();

const { sendMessage, getMessages, markMessagesAsSeen } = require("../controllers/messageController");
const authMiddleware = require("../middleware/authMiddleware");

chatRoutes.post("/send", authMiddleware, sendMessage);
chatRoutes.patch("/seen/:userId", authMiddleware, markMessagesAsSeen);
chatRoutes.get("/messages/:userId", authMiddleware, getMessages);

module.exports = chatRoutes;
