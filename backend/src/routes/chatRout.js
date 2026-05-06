const express = require("express");
const router = express.Router();

const { sendMessage, getMessages, markMessagesAsSeen  } = require("../controllers/messageController");
const authMiddleware = require("../middleware/authMiddleware");

router.post("/send", authMiddleware, sendMessage);
router.patch("/seen/:userId", authMiddleware, markMessagesAsSeen);
router.get("/messages/:userId", authMiddleware, getMessages);

module.exports = router;