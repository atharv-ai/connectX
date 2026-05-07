import { useState } from "react";
import API from "../services/api";
import { ThemeToggle } from "../components/ThemeToggle";

function Login({ setPage }) {
  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const [message, setMessage] = useState("");

  function handleChange(e) {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  }

  async function handleLogin(e) {
    e.preventDefault();
    setMessage("");

    try {
      const res = await API.post("/auth/signin", form);
      const { token, user } = res.data ?? {};

      if (!token || !user || typeof user !== "object" || !user._id) {
        setMessage("Invalid response from server. Please try again.");
        return;
      }

      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));

      setPage("chat");
    } catch (error) {
      const msg =
        error.response?.data?.message ||
        (error.code === "ERR_NETWORK"
          ? "Cannot reach server. Is the backend running?"
          : "Login failed. Please check your details.");
      setMessage(msg);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-theme-corner">
        <ThemeToggle />
      </div>
      <div className="auth-shell">
        <header className="auth-brand-block">
          <span className="auth-logo-mark" aria-hidden />
          <span className="auth-logo-text">ConnectX</span>
        </header>

        <main className="auth-card" aria-labelledby="auth-login-title">
          <h1 id="auth-login-title" className="auth-heading">
            Sign in
          </h1>
          <p className="auth-sub">Welcome back — use your account email.</p>

          <form className="auth-form" onSubmit={handleLogin} noValidate>
            <div className="auth-field">
              <label htmlFor="login-email" className="auth-label">
                Email
              </label>
              <input
                id="login-email"
                type="email"
                name="email"
                className="auth-input"
                placeholder="you@example.com"
                autoComplete="email"
                value={form.email}
                onChange={handleChange}
              />
            </div>

            <div className="auth-field">
              <label htmlFor="login-password" className="auth-label">
                Password
              </label>
              <input
                id="login-password"
                type="password"
                name="password"
                className="auth-input"
                placeholder="••••••••"
                autoComplete="current-password"
                value={form.password}
                onChange={handleChange}
              />
            </div>

            <button type="submit" className="auth-submit">
              Continue
            </button>

            {message ? (
              <p className="auth-error" role="alert">
                {message}
              </p>
            ) : null}
          </form>

          <p className="auth-footer">
            New here?{" "}
            <button
              type="button"
              className="auth-text-btn"
              onClick={() => setPage("signup")}
            >
              Create an account
            </button>
          </p>
        </main>
      </div>
    </div>
  );
}

export default Login;
