const http = require("http");
const {WebSocketServer} = require("ws");
require('dotenv').config();
const express = require('express');
const cors = require("cors");
const app = express();
const mongoose = require("mongoose");
const Message = require("./src/models/Message");
const jwt = require("jsonwebtoken");

const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
    console.error("MONGO_URI is required. Set it in your environment (e.g. MongoDB Atlas connection string).");
    process.exit(1);
}

function buildAllowedOrigins() {
    const set = new Set([
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]);
    const raw = process.env.FRONTEND_URL;
    if (raw) {
        raw.split(",").forEach((part) => {
            const o = part.trim().replace(/\/$/, "");
            if (o) {
                set.add(o);
            }
        });
    }
    return Array.from(set);
}

const allowedOrigins = buildAllowedOrigins();

const server = http.createServer(app);
const wss = new WebSocketServer({server});

const corsOptions = {
    origin(origin, callback) {
        if (!origin) {
            return callback(null, true);
        }
        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        console.warn(`[CORS] Blocked origin: ${origin}`);
        return callback(null, false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "token"],
};

app.use(cors(corsOptions));
app.use(express.json());

const users = {};

function broadcastOnlineUsers() {
    const onlineUsers = Object.keys(users);

    Object.values(users).forEach((socket) => {
        socket.send(JSON.stringify({
            type: "online_users",
            users: onlineUsers
        }));
    });
}

wss.on("connection", (socket) => {
    console.log("User connected");

    socket.on("message", async (message) => {
        try {
            const data = JSON.parse(message.toString());

            if (data.type === "typing") {
                if (!socket.userId) return;
                const receiverId = String(data.receiverId ?? "").trim();
                const receiverSocket = users[receiverId];

                if (receiverSocket) {
                    receiverSocket.send(JSON.stringify({
                        type: "user_typing",
                        senderId: socket.userId
                    }));
                }
            }

            if (data.type === "stop_typing") {
                if (!socket.userId) return;
                const receiverId = String(data.receiverId ?? "").trim();
                const receiverSocket = users[receiverId];

                if (receiverSocket) {
                    receiverSocket.send(JSON.stringify({
                        type: "user_stop_typing",
                        senderId: socket.userId
                    }));
                }
            }

            if (data.type === "join") {
                if (!data.token) {
                    socket.close();
                    return;
                }

                try {
                    const decoded = jwt.verify(data.token, process.env.JWT_SECRET);
                    const userId = String(decoded.userId);

                    if (data.userId != null && String(data.userId) !== userId) {
                        socket.send(JSON.stringify({
                            type: "auth_error",
                            message: "User ID does not match token."
                        }));
                        socket.close();
                        return;
                    }

                    if (socket.userId && users[socket.userId] === socket) {
                        delete users[socket.userId];
                    }

                    users[userId] = socket;
                    socket.userId = userId;

                    console.log(`User ${userId} joined`);

                    broadcastOnlineUsers();
                } catch {
                    socket.send(JSON.stringify({
                        type: "auth_error",
                        message: "Invalid or expired token."
                    }));
                    socket.close();
                }
                return;
            }

            if (data.type === "send_message") {
                if (!socket.userId) {
                    return;
                }
                if (!data.receiverId || data.message == null || !String(data.message).trim()) {
                    return;
                }

                const receiverId = String(data.receiverId).trim();
                const text = String(data.message).trim();

                const newMessage = await Message.create({
                    sender: socket.userId,
                    receiver: receiverId,
                    message: text
                });

                const receiverSocket = users[receiverId];

                if (receiverSocket) {
                    const payload = newMessage.toObject
                        ? newMessage.toObject()
                        : newMessage;
                    receiverSocket.send(JSON.stringify({
                        type: "receive_message",
                        message: text,
                        senderId: socket.userId,
                        data: payload
                    }));
                }
            }

        } catch (err) {
            console.warn("Invalid WebSocket message:", err.message);
        }
    });

    socket.on("close", () => {
        console.log("User disconnected");

        if (socket.userId) {
            delete users[socket.userId];

            broadcastOnlineUsers();
        }
    });
});
const chatRoutes = require("./src/routes/chatRoutes");
app.use("/api/chat", chatRoutes);

const authRoutes = require("./src/routes/authRoutes");
app.use("/api/auth", authRoutes);

const userRoutes = require("./src/routes/userRoutes");
app.use("/api/users", userRoutes);


app.get("/", function (req, res) {
    res.send("ConnectX API is running.");
});

mongoose.connect(MONGO_URI)
    .then(() => {
        console.log("MongoDB connected.");
        server.listen(PORT, "0.0.0.0", () => {
            console.log(`HTTP and WebSocket server listening on port ${PORT}.`);
        });
    })
    .catch((err) => {
        console.error("MongoDB connection failed:", err.message);
        process.exit(1);
    });

