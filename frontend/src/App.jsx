import { useState } from "react";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Chat from "./pages/Chat";
import "./App.css";

function hasValidSession() {
  const token = localStorage.getItem("token");
  const raw = localStorage.getItem("user");

  if (!token || !raw) {
    if (!token && raw) localStorage.removeItem("user");
    if (token && !raw) localStorage.removeItem("token");
    return false;
  }

  try {
    const user = JSON.parse(raw);
    if (!user || typeof user !== "object" || !user._id) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      return false;
    }
    return true;
  } catch {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    return false;
  }
}

function App() {
  const [page, setPage] = useState(() => (hasValidSession() ? "chat" : "login"));

  if (page === "login") {
    return <Login setPage={setPage} />;
  }

  if (page === "signup") {
    return <Signup setPage={setPage} />;
  }

  return <Chat setPage={setPage} />;
}

export default App;