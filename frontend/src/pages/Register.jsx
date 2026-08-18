import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import RouteLine from "../components/RouteLine";
import PasswordField from "../components/PasswordField";
import { generateTicketId } from "../utils/ticket";
import { BRANCHES } from "../utils/constants";
import "../css/auth.css";

export default function Register() {
  const navigate = useNavigate();
  const ticketId = useRef(generateTicketId());

  const [form, setForm] = useState({
    username: "",
    email: "",
    phone: "",
    branch: "",
    password: "",
    confirmPassword: "",
  });
  const [message, setMessage] = useState({ text: "", type: "" });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.title = "Register | KLICKIT Job Operations";
    if (localStorage.getItem("access_token")) {
      navigate("/", { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setField = (name, value) => setForm((prev) => ({ ...prev, [name]: value }));

  const branchIndex = BRANCHES.indexOf(form.branch);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ text: "", type: "" });

    const username = form.username.trim();
    const email = form.email.trim();
    const phone = form.phone.trim();
    const { branch, password, confirmPassword } = form;

    if (!username || !email || !branch || !password || !confirmPassword) {
      setMessage({ text: "Fill in every required field before submitting.", type: "error" });
      return;
    }

    if (password !== confirmPassword) {
      setMessage({ text: "Passwords do not match.", type: "error" });
      return;
    }

    if (password.length < 8) {
      setMessage({ text: "Password must be at least 8 characters.", type: "error" });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/auth/register/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, phone, branch, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        let errorMessage = "Registration failed.";
        const errors = Object.values(data);
        if (errors.length > 0) {
          errorMessage = errors.flat().join(" ");
        }
        setMessage({ text: errorMessage, type: "error" });
        return;
      }

      setMessage({ text: "Account created successfully. Redirecting to login...", type: "success" });

      setTimeout(() => {
        navigate("/login", { replace: true });
      }, 1000);
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
          <h1 className="stub-headline">Set up your operations account.</h1>

          <p className="stub-copy">
            Create your branch profile to manage job sheets, receive assignments, track service progress, and
            coordinate daily operations.
          </p>

          <div className="route">
            <div className="route-label">Branch Operations</div>
            <RouteLine activeIndex={branchIndex} />
          </div>
        </div>

        <div className="stub-bottom">
          <div className={`stamp${branchIndex > -1 ? "" : " stamp-pending"}`} id="stubStamp">
            {branchIndex > -1 ? `Routing · ${form.branch}` : "Branch Selection Required"}
          </div>

          <div className="stub-quote">
            Organized work.
            <br />
            Faster operations.
          </div>
        </div>
      </div>

      {/* ================= RIGHT: the form panel ================= */}
      <div className="docket">
        <div className="docket-card">
          <div className="docket-eyebrow">Team Registration</div>

          <h2 className="docket-title">Create your account</h2>

          <p className="docket-sub">
            Set up your employee profile and branch access to start managing job operations from one centralized
            workspace.
          </p>

          <form id="registerForm" noValidate onSubmit={handleSubmit}>
            <div id="registerMessage" className={`message${message.type ? ` ${message.type}` : ""}`}>
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
                placeholder="Choose a username"
                autoComplete="username"
                required
                value={form.username}
                onChange={(e) => setField("username", e.target.value)}
              />
            </div>

            <div className="field">
              <div className="field-head">
                <span className="field-code">F02</span>
                <label htmlFor="email">Work Email</label>
              </div>

              <input
                type="email"
                id="email"
                name="email"
                placeholder="Enter your work email"
                autoComplete="email"
                required
                value={form.email}
                onChange={(e) => setField("email", e.target.value)}
              />
            </div>

            <div className="field-row">
              <div className="field">
                <div className="field-head">
                  <span className="field-code">F03</span>
                  <label htmlFor="phone">Phone</label>
                  <span className="field-optional">optional</span>
                </div>

                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  placeholder="Phone number"
                  autoComplete="tel"
                  value={form.phone}
                  onChange={(e) => setField("phone", e.target.value)}
                />
              </div>

              <div className="field">
                <div className="field-head">
                  <span className="field-code">F04</span>
                  <label htmlFor="branch">Branch</label>
                </div>

                <select
                  id="branch"
                  name="branch"
                  required
                  value={form.branch}
                  onChange={(e) => setField("branch", e.target.value)}
                >
                  <option value="">Select branch</option>
                  {BRANCHES.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="field">
              <div className="field-head">
                <span className="field-code">F05</span>
                <label htmlFor="password">Password</label>
              </div>

              <PasswordField
                id="password"
                name="password"
                placeholder="Create a secure password"
                autoComplete="new-password"
                required
                minLength={6}
                value={form.password}
                onChange={(e) => setField("password", e.target.value)}
              />

              <div className="field-hint">Use at least 6 characters</div>
            </div>

            <div className="field">
              <div className="field-head">
                <span className="field-code">F06</span>
                <label htmlFor="confirmPassword">Confirm Password</label>
              </div>

              <PasswordField
                id="confirmPassword"
                name="confirmPassword"
                placeholder="Re-enter your password"
                autoComplete="new-password"
                required
                minLength={6}
                value={form.confirmPassword}
                onChange={(e) => setField("confirmPassword", e.target.value)}
              />
            </div>

            <button type="submit" className={`submit-btn${loading ? " is-loading" : ""}`} id="registerButton" disabled={loading}>
              <span className="spinner"></span>
              <span className="btn-label">Create Account</span>
              <span className="arrow">&rarr;</span>
            </button>
          </form>

          <div className="docket-footer">
            Already have an account? <Link to="/login">Sign in to KLICKIT</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
