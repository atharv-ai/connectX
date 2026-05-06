import { useEffect, useRef, useState } from "react";
import API from "../services/api";

function Chat({ setPage }) {
  const socketRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const currentUser = JSON.parse(localStorage.getItem("user"));

  const [receiverId, setReceiverId] = useState("");
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [typingUser, setTypingUser] = useState(null);

  useEffect(() => {
    if (!currentUser?._id) return;

    const ws = new WebSocket("ws://localhost:3000");
    socketRef.current = ws;

    ws.onopen = () => {
      ws.send(
        JSON.stringify({
          type: "join",
          userId: currentUser._id,
        })
      );
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === "receive_message") {
        setMessages((prev) => [
          ...prev,
          {
            sender: data.senderId,
            message: data.message,
          },
        ]);
      }

      if (data.type === "online_users") {
        setOnlineUsers(data.users);
      }

      if (data.type === "user_typing") {
        setTypingUser(data.senderId);
      }

      if (data.type === "user_stop_typing") {
        setTypingUser(null);
      }
    };

    ws.onclose = () => {
      console.log("WebSocket disconnected");
    };

    return () => {
      ws.close();
    };
  }, []);

  async function loadMessages() {
    if (!receiverId) return;

    try {
      const res = await API.get(`/chat/messages/${receiverId}`);
      setMessages(res.data.messages);
    } catch (error) {
      console.log(error.response?.data?.message || "Failed to load messages");
    }
  }

  function sendMessage() {
    if (!message.trim() || !receiverId) return;

    socketRef.current.send(
      JSON.stringify({
        type: "send_message",
        receiverId,
        message,
      })
    );

    setMessages((prev) => [
      ...prev,
      {
        sender: currentUser._id,
        receiver: receiverId,
        message,
      },
    ]);

    setMessage("");
  }

  function handleTyping(e) {
    setMessage(e.target.value);

    if (!receiverId) return;

    socketRef.current.send(
      JSON.stringify({
        type: "typing",
        receiverId,
      })
    );

    clearTimeout(typingTimeoutRef.current);

    typingTimeoutRef.current = setTimeout(() => {
      socketRef.current.send(
        JSON.stringify({
          type: "stop_typing",
          receiverId,
        })
      );
    }, 1000);
  }

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setPage("login");
  }

  return (
    <div className="chat-container">
      <div className="sidebar">
        <h2>ConnectX</h2>

        <p className="user-info">Logged in as: {currentUser?.name}</p>

        <button onClick={logout}>Logout</button>

        <h3>Online Users</h3>

        <ul>
          {onlineUsers.map((id) => (
            <li key={id}>
              {id === currentUser?._id ? `${id} (You)` : id}
            </li>
          ))}
        </ul>

        <div className="receiver-box">
          <input
            type="text"
            placeholder="Enter receiver user ID"
            value={receiverId}
            onChange={(e) => setReceiverId(e.target.value)}
          />

          <button onClick={loadMessages}>Load Chat</button>
        </div>
      </div>

      <div className="chat-box">
        <div className="chat-header">
          <h3>Chat</h3>
          {typingUser && <p>{typingUser} is typing...</p>}
        </div>

        <div className="messages">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={
                msg.sender === currentUser?._id
                  ? "message my-message"
                  : "message other-message"
              }
            >
              <p>{msg.message}</p>
            </div>
          ))}
        </div>

        <div className="message-input">
          <input
            type="text"
            placeholder="Type message..."
            value={message}
            onChange={handleTyping}
            onKeyDown={(e) => {
              if (e.key === "Enter") sendMessage();
            }}
          />

          <button onClick={sendMessage}>Send</button>
        </div>
      </div>
    </div>
  );
}

export default Chat;