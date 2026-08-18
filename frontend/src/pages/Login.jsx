import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import RouteLine from "../components/RouteLine";
import PasswordField from "../components/PasswordField";
import { generateTicketId } from "../utils/ticket";
import "../css/auth.css";

export default function Login() {
  const navigate = useNavigate();
  const ticketId = useRef(generateTicketId());

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState({ text: "", type: "" });
  const [loading, setLoading] = useState(false);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    document.title = "Login | KLICKIT Job Operations";
    if (localStorage.getItem("access_token")) {
      navigate("/", { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ text: "", type: "" });

    const trimmedUsername = username.trim();
    if (!trimmedUsername || !password) {
      setMessage({ text: "Enter your username and password to continue.", type: "error" });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/auth/login/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: trimmedUsername, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage({ text: data.detail || "Invalid username or password.", type: "error" });
        return;
      }

      localStorage.setItem("access_token", data.data.access);
      localStorage.setItem("refresh_token", data.data.refresh);
      localStorage.setItem("username", trimmedUsername);
      localStorage.setItem("branch", data.data.branch || "");
      localStorage.setItem("role", data.data.role || "");
      localStorage.setItem("klickit-theme", "dark");

      setMessage({ text: "Login successful. Redirecting...", type: "success" });
      setAuthorized(true);

      setTimeout(() => {
        navigate("/", { replace: true });
      }, 700);
    } catch (error) {
      console.error(error);
      setMessage({ text: "Unable to connect to server.", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="shell">
      {/* ================= LEFT: the ticket stub ================= */}
      <div className="stub">
        <div className="stub-top">
          <div className="brand">
            <div className="brand-mark">KJ</div>
            <div className="brand-text">
              <div className="brand-name">KLICKIT</div>
              <div className="brand-sub">Job Operations</div>
            </div>
          </div>

          <div className="ticket-id">
            <div className="label">Work Order</div>
            <div className="value" id="ticketId">
              {ticketId.current}
            </div>
          </div>
        </div>

        <div className="stub-mid">
          <h1 className="stub-headline">One platform for every job.</h1>

          <p className="stub-copy">
            Manage job sheets, track status, monitor ETAs, and coordinate branch operations from one centralized
            workspace.
          </p>

          <div className="route">
            <div className="route-label">Branch Operations</div>
            <RouteLine ambient />
          </div>
        </div>

        <div className="stub-bottom">
          <div className={`stamp${authorized ? "" : " stamp-pending"}`} id="stubStamp">
            {authorized ? "Authorized" : "Operations Ready"}
          </div>

          <div className="stub-quote">
            Track. Assign.
            <br />
            Complete.
          </div>
        </div>
      </div>

      {/* ================= RIGHT: the form panel ================= */}
      <div className="docket">
        <div className="docket-card">
          <div className="docket-eyebrow">Secure Access</div>

          <h2 className="docket-title">Welcome back</h2>

          <p className="docket-sub">Sign in to manage job sheets, assignments, approvals, and branch operations.</p>

          <form id="loginForm" noValidate onSubmit={handleSubmit}>
            <div id="loginMessage" className={`message${message.type ? ` ${message.type}` : ""}`}>
              {message.text}
            </div>

            <div className="field">
              <div className="field-head">
                <span className="field-code">F01</span>
                <label htmlFor="username">Employee Username</label>
              </div>

              <input
                type="text"
                id="username"
                name="username"
                placeholder="Enter your username"
                autoComplete="username"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>

            <div className="field">
              <div className="field-head">
                <span className="field-code">F02</span>
                <label htmlFor="password">Password</label>
              </div>

              <PasswordField
                id="password"
                name="password"
                placeholder="Enter your password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button type="submit" className={`submit-btn${loading ? " is-loading" : ""}`} id="loginButton" disabled={loading}>
              <span className="spinner"></span>
              <span className="btn-label">Access Dashboard</span>
              <span className="arrow">&rarr;</span>
            </button>
          </form>

          <div className="docket-footer">
            New to KLICKIT? <Link to="/register">Create an account</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
