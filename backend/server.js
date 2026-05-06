const http = require("http");
const {WebSocketServer} = require("ws");
require('dotenv').config();
const express = require('express');
const app = express();
const mongoose = require("mongoose");
const Message = require("./src/model/message");

const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI;

const server = http.createServer(app);
const wss = new WebSocketServer({server});

const cors = require("cors");

app.use(express.json());
app.use(cors({
    origin: "http://localhost:5173",
    credentials: true
}));

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
                const receiverSocket = users[data.receiverId];

                if (receiverSocket) {
                    receiverSocket.send(JSON.stringify({
                        type: "user_typing",
                        senderId: socket.userId
                    }));
                }
            }

            if (data.type === "stop_typing") {
                const receiverSocket = users[data.receiverId];

                if (receiverSocket) {
                    receiverSocket.send(JSON.stringify({
                        type: "user_stop_typing",
                        senderId: socket.userId
                    }));
                }
            }

            if (data.type === "join") {
                users[data.userId] = socket;
                socket.userId = data.userId;

                console.log(`User ${data.userId} joined`);

                broadcastOnlineUsers();
            }

            if (data.type === "send_message") {
                if (!data.receiverId || !data.message) {
                    return;
                }

                const newMessage = await Message.create({
                    sender: socket.userId,
                    receiver: data.receiverId,
                    message: data.message
                });

                const receiverSocket = users[data.receiverId];

                if (receiverSocket) {
                    receiverSocket.send(JSON.stringify({
                        type: "receive_message",
                        message: data.message,
                        senderId: socket.userId,
                        data: newMessage
                    }));
                }
            }

        } catch (err) {
            console.log("Invalid message format", err.message);
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
const chatRout = require("./src/routes/chatRout");
app.use("/api/chat",chatRout);

const authantic = require("./src/routes/authRout");
app.use('/api/auth',authantic);


app.get("/",function(req,res){
    res.send("hi there");
})

mongoose.connect(MONGO_URI)
.then(()=>{
    console.log("server connected");
    server.listen(PORT, () => {
        console.log("Server running on port", PORT);
    });
})
.catch((err)=>{
    console.log(err);
})

