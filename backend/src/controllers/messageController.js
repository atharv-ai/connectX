const Message = require("../models/Message");

const sendMessage = async (req, res) => {
    try {
        const { receiverId, message } = req.body;

        if (!receiverId || !message) {
            return res.status(400).json({ message: "All fields are required." });
        }

        const senderId = req.userId;

        const newMessage = await Message.create({
            sender: senderId,
            receiver: receiverId,
            message
        });

        res.status(201).json({
            message: "Message sent successfully.",
            data: newMessage
        });

    } catch (error) {
        console.error("[sendMessage]", error);
        res.status(500).json({ message: "Something went wrong. Please try again." });
    }
};


const getMessages = async (req, res) => {
    try {
        const userId = req.params.userId;
        const myId = req.userId;

        const messages = await Message.find({
            $or: [
                { sender: myId, receiver: userId },
                { sender: userId, receiver: myId }
            ]
        }).sort({ createdAt: 1 });

        res.status(200).json({
            messages
        });

    } catch (error) {
        console.error("[getMessages]", error);
        res.status(500).json({ message: "Something went wrong. Please try again." });
    }
};

const markMessagesAsSeen = async (req, res) => {
    try {
        const otherUserId = req.params.userId;
        const myId = req.userId;

        await Message.updateMany(
            {
                sender: otherUserId,
                receiver: myId,
                seen: false
            },
            {
                seen: true,
                seenAt: new Date()
            }
        );

        res.status(200).json({
            message: "Messages marked as seen."
        });

    } catch (error) {
        console.error("[markMessagesAsSeen]", error);
        res.status(500).json({ message: "Something went wrong. Please try again." });
    }
};

module.exports = { sendMessage, getMessages, markMessagesAsSeen };
