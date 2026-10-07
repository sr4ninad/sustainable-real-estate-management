import { lazy } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { MotionConfig } from "framer-motion";

import AuthProvider from "./context/AuthProvider";
import DataProvider from "./context/DataProvider";
import FeedbackProvider from "./context/FeedbackProvider";
import { useAuth } from "./context/contexts";
import AppShell from "./layout/AppShell";
import { LogoMark } from "./layout/Logo";

import Login from "./pages/Login";

// Each page is its own chunk, loaded the first time it's visited.
const Dashboard = lazy(() => import("./pages/Dashboard"));
const ClientHome = lazy(() => import("./pages/ClientHome"));
const Properties = lazy(() => import("./pages/Properties"));
const Sustainability = lazy(() => import("./pages/Sustainability"));
const Clients = lazy(() => import("./pages/Clients"));
const Agents = lazy(() => import("./pages/Agents"));
const Transactions = lazy(() => import("./pages/Transactions"));
const PriceHistory = lazy(() => import("./pages/PriceHistory"));
const Users = lazy(() => import("./pages/Users"));
const Profile = lazy(() => import("./pages/Profile"));
const NotFound = lazy(() => import("./pages/NotFound"));

/** Renders the page only for the given roles; everyone else goes to the home page. */
function RequireRole({ roles, children }) {
  const { user } = useAuth();
  return roles.includes(user.role) ? children : <Navigate to="/" replace />;
}

function Splash() {
  return (
    <div className="splash" role="status" aria-label="Loading">
      <span className="brand-mark">
        <LogoMark />
      </span>
    </div>
  );
}

function AuthedApp() {
  const { status, user } = useAuth();

  if (status === "loading") return <Splash />;
  if (status !== "signedIn") return <Login />;

  return (
    // Keyed by user so a different sign-in starts with fresh data.
    <DataProvider key={user.userId}>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={user.role === "CLIENT" ? <ClientHome /> : <Dashboard />} />
          <Route path="properties" element={<Properties />} />
          <Route path="sustainability" element={<Sustainability />} />
          <Route
            path="clients"
            element={
              <RequireRole roles={["ADMIN", "AGENT"]}>
                <Clients />
              </RequireRole>
            }
          />
          <Route path="agents" element={<Agents />} />
          <Route path="transactions" element={<Transactions />} />
          <Route path="price-history" element={<PriceHistory />} />
          <Route
            path="users"
            element={
              <RequireRole roles={["ADMIN"]}>
                <Users />
              </RequireRole>
            }
          />
          <Route path="profile" element={<Profile />} />

          {/* Old URLs */}
          <Route path="features" element={<Navigate to="/sustainability" replace />} />
          <Route path="logs" element={<Navigate to="/price-history" replace />} />

          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </DataProvider>
  );
}

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <BrowserRouter>
        <AuthProvider>
          <FeedbackProvider>
            <AuthedApp />
          </FeedbackProvider>
        </AuthProvider>
      </BrowserRouter>
    </MotionConfig>
  );
}
