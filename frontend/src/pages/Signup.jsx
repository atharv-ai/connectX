import { useState } from "react";
import API from "../services/api";
import { ThemeToggle } from "../components/ThemeToggle";

function Signup({ setPage }) {
  const [form, setForm] = useState({
    name: "",
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

  async function handleSignup(e) {
    e.preventDefault();
    setMessage("");

    try {
      await API.post("/auth/signup", form);
      setPage("login");
    } catch (error) {
      const msg =
        error.response?.data?.message ||
        (error.code === "ERR_NETWORK"
          ? "Cannot reach server. Is the backend running?"
          : "Signup failed. Please try again.");
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

        <main className="auth-card" aria-labelledby="auth-signup-title">
          <h1 id="auth-signup-title" className="auth-heading">
            Create account
          </h1>
          <p className="auth-sub">A few details and you&apos;re in.</p>

          <form className="auth-form" onSubmit={handleSignup} noValidate>
            <div className="auth-field">
              <label htmlFor="signup-name" className="auth-label">
                Name
              </label>
              <input
                id="signup-name"
                type="text"
                name="name"
                className="auth-input"
                placeholder="Your name"
                autoComplete="name"
                value={form.name}
                onChange={handleChange}
              />
            </div>

            <div className="auth-field">
              <label htmlFor="signup-email" className="auth-label">
                Email
              </label>
              <input
                id="signup-email"
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
              <label htmlFor="signup-password" className="auth-label">
                Password
              </label>
              <input
                id="signup-password"
                type="password"
                name="password"
                className="auth-input"
                placeholder="••••••••"
                autoComplete="new-password"
                value={form.password}
                onChange={handleChange}
              />
            </div>

            <button type="submit" className="auth-submit">
              Register
            </button>

            {message ? (
              <p className="auth-error" role="alert">
                {message}
              </p>
            ) : null}
          </form>

          <p className="auth-footer">
            Already have an account?{" "}
            <button
              type="button"
              className="auth-text-btn"
              onClick={() => setPage("login")}
            >
              Sign in
            </button>
          </p>
        </main>
      </div>
    </div>
  );
}

export default Signup;
