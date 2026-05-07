import { useEffect, useRef, useState, useMemo } from "react";
import API from "../services/api";
import { ThemeToggle } from "../components/ThemeToggle";

function readStoredUser() {
  try {
    const token = localStorage.getItem("token");
    if (!token) return null;
    const raw = localStorage.getItem("user");
    if (!raw) return null;
    const user = JSON.parse(raw);
    if (!user || typeof user !== "object" || !user._id) return null;
    return user;
  } catch {
    return null;
  }
}

function senderKey(sender) {
  if (sender == null) return "";

  if (typeof sender === "object") {
    const id = sender._id ?? sender.id;
    if (id != null) return String(id);
  }

  return String(sender);
}

function isSentByMe(msgSender, currentUserId) {
  return senderKey(msgSender) === senderKey(currentUserId);
}

function normalizeWsMessage(data, peerUserId) {
  const doc = data.data;
  if (doc != null && typeof doc === "object") {
    return {
      _id: doc._id,
      sender: doc.sender,
      receiver: doc.receiver,
      message: doc.message ?? data.message,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }
  return {
    sender: data.senderId,
    receiver: peerUserId,
    message: data.message,
  };
}

function format12Hour(isoOrDate) {
  const d = new Date(isoOrDate);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/** createdAt / updatedAt from API, or _localSentAt for optimistic sends; 10:45 PM style */
function getMessageDisplayTime(msg) {
  const raw = msg.createdAt ?? msg.updatedAt ?? msg._localSentAt;
  if (raw == null) return null;
  return format12Hour(raw);
}

function Chat({ setPage }) {
  const socketRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const selectedUserRef = useRef(null);

  const [currentUser] = useState(readStoredUser);

  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  selectedUserRef.current = selectedUser;

  const [searchQuery, setSearchQuery] = useState("");

  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [typingUser, setTypingUser] = useState(null);

  const myId = senderKey(currentUser?._id);

  const isOnline = (userId) => onlineUsers.some((id) => senderKey(id) === senderKey(userId));

  const filteredUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        String(u.name ?? "").toLowerCase().includes(q) ||
        String(u.email ?? "").toLowerCase().includes(q)
    );
  }, [users, searchQuery]);

  useEffect(() => {
    if (!currentUser?._id) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      setPage("login");
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const res = await API.get("/users");
        if (!cancelled) setUsers(res.data.users ?? []);
      } catch (error) {
        console.log(error.response?.data?.message || "Failed to load users");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [currentUser?._id, setPage]);

  useEffect(() => {
    if (!selectedUser?._id) {
      setMessages([]);
      return;
    }

    setTypingUser(null);

    let cancelled = false;

    (async () => {
      try {
        const res = await API.get(`/chat/messages/${selectedUser._id}`);
        if (!cancelled) setMessages(res.data.messages ?? []);
      } catch (error) {
        console.log(error.response?.data?.message || "Failed to load messages");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedUser?._id]);

  useEffect(() => {
    if (!currentUser?._id) {
      return;
    }

    const ws = new WebSocket("ws://localhost:3000");
    socketRef.current = ws;

    ws.onopen = () => {
      const token = localStorage.getItem("token");
      if (!token) {
        ws.close();
        return;
      }
      ws.send(
        JSON.stringify({
          type: "join",
          token,
          userId: String(currentUser._id),
        })
      );
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === "receive_message") {
        const sel = selectedUserRef.current;
        if (!sel || senderKey(data.senderId) !== senderKey(sel._id)) return;
        const incoming = normalizeWsMessage(data, String(sel._id));
        setMessages((prev) => {
          const incomingId = incoming._id;
          if (
            incomingId != null &&
            prev.some((m) => m._id != null && senderKey(m._id) === senderKey(incomingId))
          ) {
            return prev;
          }
          return [...prev, incoming];
        });
      }

      if (data.type === "online_users") {
        setOnlineUsers(data.users);
      }

      if (data.type === "user_typing") {
        const sel = selectedUserRef.current;
        if (sel && senderKey(data.senderId) === senderKey(sel._id)) {
          setTypingUser(data.senderId);
        }
      }

      if (data.type === "user_stop_typing") {
        const sel = selectedUserRef.current;
        if (sel && senderKey(data.senderId) === senderKey(sel._id)) {
          setTypingUser(null);
        }
      }

      if (data.type === "auth_error") {
        console.warn(data.message || "WebSocket auth failed");
        try {
          socketRef.current?.close();
        } catch {
          /* ignore */
        }
        socketRef.current = null;
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        setPage("login");
      }
    };

    ws.onclose = () => {
      console.log("WebSocket disconnected");
    };

    return () => {
      ws.close();
    };
  }, [currentUser?._id, setPage]);

  function sendMessage() {
    if (!message.trim() || !selectedUser?._id) return;
    const ws = socketRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;

    const receiverId = String(selectedUser._id);

    ws.send(
      JSON.stringify({
        type: "send_message",
        receiverId,
        message: message.trim(),
      })
    );

    const clientKey = `c_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

    const stamp = new Date().toISOString();

    setMessages((prev) => [
      ...prev,
      {
        _clientKey: clientKey,
        sender: myId,
        receiver: receiverId,
        message: message.trim(),
        createdAt: stamp,
        _localSentAt: stamp,
      },
    ]);

    setMessage("");
  }

  function handleTyping(e) {
    setMessage(e.target.value);

    if (!selectedUser?._id) return;

    const ws = socketRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;

    const receiverId = String(selectedUser._id);

    ws.send(
      JSON.stringify({
        type: "typing",
        receiverId,
      })
    );

    clearTimeout(typingTimeoutRef.current);

    typingTimeoutRef.current = setTimeout(() => {
      if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) return;
      socketRef.current.send(
        JSON.stringify({
          type: "stop_typing",
          receiverId,
        })
      );
    }, 1000);
  }

  function logout() {
    clearTimeout(typingTimeoutRef.current);
    try {
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
    } catch {
      /* ignore */
    }
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setPage("login");
  }

  if (!currentUser) {
    return (
      <div className="auth-page">
        <div className="auth-shell">
          <p className="auth-error auth-session-notice" role="status">
            Invalid or missing session. Returning to login…
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="cx-app">
      <aside className="cx-sidebar" aria-label="Contacts and search">
        <header className="cx-sidebar-top">
          <h1 className="cx-brand">ConnectX</h1>
          <div className="cx-sidebar-actions">
            <ThemeToggle />
            <button type="button" className="cx-logout" onClick={logout}>
              Log out
            </button>
          </div>
        </header>

        <p className="cx-me-line">
          <span className="cx-me-label">Logged in as</span>
          <span className="cx-me-name">{currentUser.name}</span>
        </p>

        <div className="cx-search-wrap">
          <span className="cx-search-icon" aria-hidden>
            ⌕
          </span>
          <input
            type="search"
            className="cx-search-input"
            placeholder="Search by name or email"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoComplete="off"
          />
        </div>

        <ul className="cx-user-list">
          {filteredUsers.map((u) => {
            const idKey = senderKey(u._id);
            const selected = selectedUser && senderKey(selectedUser._id) === idKey;
            const online = isOnline(u._id);
            return (
              <li key={idKey}>
                <button
                  type="button"
                  className={`cx-user-card${selected ? " cx-user-card--active" : ""}`}
                  onClick={() => setSelectedUser(u)}
                >
                  <div className="cx-user-card-avatar" aria-hidden>
                    {String(u.name ?? "?").charAt(0).toUpperCase()}
                    <span
                      className={`cx-presence-dot${online ? " cx-presence-dot--on" : " cx-presence-dot--off"}`}
                      title={online ? "Online" : "Offline"}
                    />
                  </div>
                  <div className="cx-user-card-main">
                    <div className="cx-user-card-row">
                      <span className="cx-user-card-name">{u.name}</span>
                    </div>
                    <span className="cx-user-card-email">{u.email}</span>
                    <span className="cx-user-card-preview">Tap to chat · messages appear here</span>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </aside>

      <section className="cx-chat" aria-label="Conversation">
        <header className="cx-chat-header">
          {selectedUser ? (
            <>
              <div className="cx-chat-header-peer">
                <div className="cx-chat-header-avatar" aria-hidden>
                  {String(selectedUser.name ?? "?").charAt(0).toUpperCase()}
                </div>
                <div className="cx-chat-header-text">
                  <h2 className="cx-chat-header-name">{selectedUser.name}</h2>
                  <p className={`cx-chat-header-status${isOnline(selectedUser._id) ? " cx-chat-header-status--online" : ""}`}>
                    {isOnline(selectedUser._id) ? "Online" : "Offline"}
                  </p>
                </div>
              </div>
              {typingUser ? (
                <div className="cx-typing-indicator" role="status">
                  <span className="cx-typing-dots" aria-hidden>
                    <span />
                    <span />
                    <span />
                  </span>
                  <span>{selectedUser.name} is typing…</span>
                </div>
              ) : (
                <div className="cx-typing-placeholder" aria-hidden />
              )}
            </>
          ) : (
            <div className="cx-chat-header-empty">
              <h2 className="cx-chat-header-name">Welcome to ConnectX</h2>
              <p className="cx-chat-header-status">Pick a conversation to start messaging</p>
            </div>
          )}
        </header>

        <div className="cx-messages">
          {!selectedUser ? (
            <div className="cx-empty-chat">
              <p>Select a contact from the list</p>
            </div>
          ) : (
            messages.map((msg, index) => {
              const mine = isSentByMe(msg.sender, currentUser?._id);
              const displayTime = getMessageDisplayTime(msg);
              const dateTimeAttr =
                msg.createdAt ?? msg.updatedAt ?? msg._localSentAt ?? undefined;
              const rowKey =
                msg._id != null
                  ? senderKey(msg._id)
                  : msg._clientKey != null
                    ? msg._clientKey
                    : `row-${index}`;
              return (
                <div
                  key={rowKey}
                  className={`cx-msg-row${mine ? " cx-msg-row--mine" : " cx-msg-row--other"}`}
                >
                  <div className={`cx-bubble${mine ? " cx-bubble--mine" : " cx-bubble--other"}`}>
                    <p className="cx-bubble-text">{msg.message}</p>
                    {displayTime ? (
                      <time
                        className="cx-bubble-time"
                        {...(dateTimeAttr ? { dateTime: String(dateTimeAttr) } : {})}
                      >
                        {displayTime}
                      </time>
                    ) : null}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <footer className="cx-composer">
          <div className="cx-composer-inner">
            <div className="cx-composer-input-wrap">
              <input
                type="text"
                className="cx-composer-input"
                placeholder={selectedUser ? "Type a message" : "Select a chat to type"}
                disabled={!selectedUser}
                value={message}
                onChange={handleTyping}
                onKeyDown={(e) => {
                  if (e.key === "Enter") sendMessage();
                }}
              />
            </div>
            <button
              type="button"
              className="cx-composer-send"
              onClick={sendMessage}
              disabled={!selectedUser}
              aria-label="Send message"
            >
              Send
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}

export default Chat;
