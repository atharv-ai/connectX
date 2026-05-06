import { useState } from "react";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Chat from "./pages/Chat";
import "./App.css";

function App() {
  const [page, setPage] = useState(() => {
    const token = localStorage.getItem("token");
    return token ? "chat" : "login";
  });

  if (page === "login") {
    return <Login setPage={setPage} />;
  }

  if (page === "signup") {
    return <Signup setPage={setPage} />;
  }

  return <Chat setPage={setPage} />;
}

export default App;