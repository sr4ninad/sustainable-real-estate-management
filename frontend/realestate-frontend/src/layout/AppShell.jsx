import { Suspense, useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { ExternalLink, LogOut, Menu, Monitor, Moon, RefreshCw, Search, Sun, UserCog, WifiOff } from "lucide-react";
import { PaletteContext, useAuth, useConfirm, useData } from "../context/contexts";
import { Avatar } from "../components/ui/primitives";
import { ROLE_LABELS } from "../lib/permissions";
import useTheme from "../hooks/useTheme";
import { formatRelative } from "../lib/format";
import Brand, { LogoMark } from "./Logo";
import { navFor } from "./nav";
import CommandPalette from "./CommandPalette";

const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);

// The Thymeleaf admin console runs on the backend's own port; the session cookie is shared.
const ADMIN_CONSOLE_URL = import.meta.env.VITE_ADMIN_CONSOLE_URL || "http://localhost:8080/";

function AccountCard({ onNavigate }) {
  const { user, logout } = useAuth();
  const confirm = useConfirm();

  const signOut = async () => {
    const ok = await confirm({ title: "Sign out?", text: "You'll need to sign in again to continue.", confirmLabel: "Sign out", tone: "neutral" });
    if (ok) logout();
  };

  return (
    <div className="account-card">
      <NavLink to="/profile" className="account-main" onClick={onNavigate} title="Your profile">
        <Avatar name={user.displayName} size="sm" />
        <span className="account-text">
          <strong>{user.displayName}</strong>
          <span>
            {ROLE_LABELS[user.role]} · {user.username}
          </span>
        </span>
      </NavLink>
      <div className="account-actions">
        <NavLink to="/profile" className="icon-btn" onClick={onNavigate} aria-label="Profile & password" title="Profile & password">
          <UserCog />
        </NavLink>
        {user.role === "ADMIN" && (
          <a className="icon-btn" href={ADMIN_CONSOLE_URL} target="_blank" rel="noreferrer" aria-label="Open the classic admin console" title="Classic admin console">
            <ExternalLink />
          </a>
        )}
        <button type="button" className="icon-btn" onClick={signOut} aria-label="Sign out" title="Sign out">
          <LogOut />
        </button>
      </div>
    </div>
  );
}

function Sidebar({ onNavigate, onSearch }) {
  const data = useData();
  const { user } = useAuth();
  const [theme, setTheme] = useTheme();

  const statusLabel =
    data.status === "loading" ? "Connecting…" : data.status === "offline" ? "Backend offline" : "Connected";

  return (
    <aside className="sidebar" aria-label="Main navigation">
      <Brand />

      <button type="button" className="side-search" onClick={onSearch}>
        <Search aria-hidden />
        <span>Search…</span>
        <kbd>{isMac ? "⌘" : "Ctrl"}</kbd>
        <kbd>K</kbd>
      </button>

      <nav>
        {navFor(user.role).map((group) => (
          <div className="nav-group" key={group.title}>
            <div className="nav-group-title">{group.title}</div>
            {group.items.map((item) => {
              const Icon = item.icon;
              const count = item.count ? data.raw[item.count]?.length : undefined;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
                  onClick={onNavigate}
                >
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <motion.span
                          layoutId="nav-active"
                          className="nav-active-bg"
                          transition={{ type: "spring", stiffness: 500, damping: 40 }}
                        />
                      )}
                      <span className="nav-link-inner">
                        <Icon aria-hidden />
                        {item.label}
                        {count !== undefined && data.status === "ready" && <span className="nav-count">{count}</span>}
                      </span>
                    </>
                  )}
                </NavLink>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="side-foot">
        <AccountCard onNavigate={onNavigate} />
        <div className="status-card">
          <span
            className={`status-dot ${data.status === "loading" || data.refreshing ? "loading" : data.status === "offline" ? "offline" : "online"}`}
            aria-hidden
          />
          <div className="status-text">
            <strong>{statusLabel}</strong>
            <span>{data.lastSync ? `Synced ${formatRelative(data.lastSync)}` : "MySQL · Spring Boot"}</span>
          </div>
          <button
            type="button"
            className="icon-btn"
            onClick={() => data.reload()}
            aria-label="Refresh data"
            title="Refresh data"
          >
            <RefreshCw className={data.refreshing ? "spin" : ""} />
          </button>
        </div>

        <div className="theme-switch" role="group" aria-label="Color theme">
          {[
            { value: "light", icon: Sun, label: "Light" },
            { value: "system", icon: Monitor, label: "Auto" },
            { value: "dark", icon: Moon, label: "Dark" },
          ].map((opt) => (
            <button
              key={opt.value}
              type="button"
              aria-pressed={theme === opt.value}
              onClick={() => setTheme(opt.value)}
              title={`${opt.label} theme`}
            >
              <opt.icon aria-hidden />
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}

function OfflineBanner() {
  const { reload, refreshing } = useData();
  return (
    <div className="callout bad offline-banner" role="alert">
      <WifiOff />
      <div style={{ flex: 1 }}>
        <strong>Can't reach the backend.</strong> Start MySQL and the Spring Boot app (
        <code>./mvnw spring-boot:run</code> in <code>backend/</code>), then retry.
      </div>
      <button type="button" className="btn btn-sm" onClick={() => reload()} disabled={refreshing}>
        <RefreshCw className={refreshing ? "spin" : ""} />
        Retry
      </button>
    </div>
  );
}

export default function AppShell() {
  const { status } = useData();
  const [navOpen, setNavOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <PaletteContext.Provider value={{ open: paletteOpen, setOpen: setPaletteOpen }}>
      <div className={`shell ${navOpen ? "nav-open" : ""}`}>
        <Sidebar onNavigate={() => setNavOpen(false)} onSearch={() => setPaletteOpen(true)} />
        {navOpen && <div className="nav-scrim" onClick={() => setNavOpen(false)} aria-hidden />}

        <div className="main">
          <div className="mobile-bar">
            <button type="button" className="icon-btn" onClick={() => setNavOpen(true)} aria-label="Open navigation">
              <Menu />
            </button>
            <span className="brand-mark">
              <LogoMark />
            </span>
            <span className="brand-name">Verdant</span>
            <span className="spacer" />
            <button type="button" className="icon-btn" onClick={() => setPaletteOpen(true)} aria-label="Search">
              <Search />
            </button>
          </div>

          <main className="content">
            {status === "offline" && <OfflineBanner />}
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: [0.2, 0.8, 0.2, 1] }}
            >
              <Suspense fallback={<div className="page-loading" aria-label="Loading page" />}>
                <Outlet />
              </Suspense>
            </motion.div>
          </main>
        </div>
      </div>
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </PaletteContext.Provider>
  );
}
