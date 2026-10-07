import { useCallback, useEffect, useMemo, useState } from "react";
import { api, setUnauthorizedHandler } from "../lib/api";
import { permissionsFor } from "../lib/permissions";
import { AuthContext } from "./contexts";

/**
 * Knows who is signed in. status: "loading" (checking the session), "signedOut",
 * "signedIn", or "offline" (backend unreachable).
 */
export default function AuthProvider({ children }) {
  const [state, setState] = useState({ status: "loading", user: null, expired: false });

  useEffect(() => {
    let cancelled = false;
    api.auth
      .me()
      .then((user) => !cancelled && setState({ status: "signedIn", user, expired: false }))
      .catch((err) => !cancelled && setState({ status: err.status === 0 ? "offline" : "signedOut", user: null, expired: false }));
    setUnauthorizedHandler(() => setState({ status: "signedOut", user: null, expired: true }));
    return () => {
      cancelled = true;
      setUnauthorizedHandler(null);
    };
  }, []);

  const login = useCallback(async (username, password) => {
    const user = await api.auth.login(username, password);
    setState({ status: "signedIn", user, expired: false });
    return user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.auth.logout();
    } finally {
      setState({ status: "signedOut", user: null, expired: false });
    }
  }, []);

  const refreshUser = useCallback(async () => {
    const user = await api.auth.me();
    setState((s) => ({ ...s, user }));
  }, []);

  const retry = useCallback(() => {
    setState({ status: "loading", user: null, expired: false });
    api.auth
      .me()
      .then((user) => setState({ status: "signedIn", user, expired: false }))
      .catch((err) => setState({ status: err.status === 0 ? "offline" : "signedOut", user: null, expired: false }));
  }, []);

  const value = useMemo(
    () => ({
      ...state,
      can: permissionsFor(state.user),
      login,
      logout,
      refreshUser,
      retry,
    }),
    [state, login, logout, refreshUser, retry]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
