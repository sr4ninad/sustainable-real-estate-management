import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Eye, EyeOff, KeyRound, Leaf, LogIn, ShieldCheck, UserRound, Users, WifiOff } from "lucide-react";
import { useAuth } from "../context/contexts";
import { LogoMark } from "../layout/Logo";

// Demo logins created by the backend's AccountSeeder. Hide with VITE_SHOW_DEMO_LOGINS=false.
const SHOW_DEMO = import.meta.env.VITE_SHOW_DEMO_LOGINS !== "false";
const DEMO_ACCOUNTS = [
  { label: "Admin", sub: "Full access + user management", icon: ShieldCheck, username: "admin", password: "admin123" },
  { label: "Agent", sub: "Arjun Kapoor · own listings & deals", icon: UserRound, username: "agent1", password: "agent123" },
  { label: "Client", sub: "Aarav Sharma · buyer", icon: Users, username: "client101", password: "client123" },
];

export default function Login() {
  const { login, status, expired, retry } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const signIn = async (u = username, p = password) => {
    if (!u.trim() || !p) {
      setError("Enter your username and password.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await login(u.trim(), p);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  const signInAs = (account) => {
    setUsername(account.username);
    setPassword(account.password);
    signIn(account.username, account.password);
  };

  return (
    <div className="login">
      <aside className="login-art" aria-hidden>
        <div className="login-art-bg" />
        <div className="login-art-content">
          <div className="login-brand">
            <span className="brand-mark">
              <LogoMark />
            </span>
            <span>Verdant</span>
          </div>
          <div>
            <h2 className="login-tagline">Real estate that's good for the planet — and the portfolio.</h2>
            <ul className="login-points">
              <li>
                <Leaf /> Every listing carries its green score
              </li>
              <li>
                <ShieldCheck /> Sales of unsustainable homes are blocked at the database
              </li>
              <li>
                <KeyRound /> Separate access for admins, agents and clients
              </li>
            </ul>
          </div>
        </div>
      </aside>

      <main className="login-main">
        <motion.form
          className="login-card"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.2, 0.8, 0.2, 1] }}
          onSubmit={(e) => {
            e.preventDefault();
            signIn();
          }}
          noValidate
        >
          <div className="login-mobile-brand">
            <span className="brand-mark">
              <LogoMark />
            </span>
            Verdant
          </div>
          <h1 className="login-title">Welcome back</h1>
          <p className="login-sub">Sign in to manage properties, clients and deals.</p>

          {status === "offline" && (
            <div className="callout bad" role="alert">
              <WifiOff />
              <div style={{ flex: 1 }}>
                <strong>Can't reach the server.</strong> Start the Spring Boot backend, then retry.
              </div>
              <button type="button" className="btn btn-sm" onClick={retry}>
                Retry
              </button>
            </div>
          )}
          {expired && status !== "offline" && (
            <div className="callout info" role="status">
              <KeyRound />
              <div>Your session ended. Please sign in again.</div>
            </div>
          )}
          {error && (
            <div className="callout bad" role="alert">
              <KeyRound />
              <div>{error}</div>
            </div>
          )}

          <label className="field">
            <span className="field-label">Username</span>
            <input
              className="input"
              autoComplete="username"
              autoFocus
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. agent1"
            />
          </label>
          <label className="field">
            <span className="field-label">Password</span>
            <div className="input-affix">
              <input
                className="input"
                style={{ paddingLeft: 12, paddingRight: 42 }}
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                className="icon-btn password-toggle"
                onClick={() => setShowPassword((s) => !s)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff /> : <Eye />}
              </button>
            </div>
          </label>

          <button type="submit" className="btn btn-primary btn-lg login-submit" disabled={busy || status === "offline"}>
            {busy ? "Signing in…" : "Sign in"}
            {!busy && <LogIn />}
          </button>

          {SHOW_DEMO && (
            <div className="demo-accounts">
              <div className="demo-title">
                <span>Try a demo account</span>
              </div>
              {DEMO_ACCOUNTS.map((a) => (
                <button
                  key={a.username}
                  type="button"
                  className="demo-account"
                  onClick={() => signInAs(a)}
                  disabled={busy || status === "offline"}
                >
                  <span className="demo-icon">
                    <a.icon />
                  </span>
                  <span className="demo-text">
                    <strong>{a.label}</strong>
                    <span>{a.sub}</span>
                  </span>
                  <code>{a.username}</code>
                  <ArrowRight className="demo-arrow" />
                </button>
              ))}
            </div>
          )}
        </motion.form>
      </main>
    </div>
  );
}
