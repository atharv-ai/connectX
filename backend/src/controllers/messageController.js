const Message = require("../model/message");

const sendMessage = async (req, res) => {
    try {
        const { receiverId, message } = req.body;

        if (!receiverId || !message) {
            return res.status(400).json({ message: "All fields are required" });
        }

        const senderId = req.userID;

        const newMessage = await Message.create({
            sender: senderId,
            receiver: receiverId,
            message
        });

        res.status(201).json({
            message: "Message sent successfully",
            data: newMessage
        });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


const getMessages = async (req, res) => {
    try {
        const userId = req.params.userId;   
        const myId = req.userID;            

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
        res.status(500).json({ message: error.message });
    }
};

const markMessagesAsSeen = async (req, res) => {
    try {
        const otherUserId = req.params.userId;
        const myId = req.userID;

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
            message: "Messages marked as seen"
        });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { sendMessage, getMessages, markMessagesAsSeen };