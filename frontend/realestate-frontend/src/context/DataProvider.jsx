import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import { buildIndex } from "../lib/domain";
import { DataContext } from "./contexts";

const ALL_KEYS = ["agents", "clients", "properties", "transactions", "features", "logs"];

const EMPTY = Object.fromEntries(ALL_KEYS.map((k) => [k, []]));

async function fetchKeys(keys) {
  const results = await Promise.allSettled(keys.map((k) => api[k].list()));
  const next = {};
  let error = null;
  results.forEach((r, i) => {
    if (r.status === "fulfilled") next[keys[i]] = Array.isArray(r.value) ? r.value : [];
    else error ??= r.reason;
  });
  return { next, error, allFailed: Object.keys(next).length === 0 };
}

export default function DataProvider({ children }) {
  const [raw, setRaw] = useState(EMPTY);
  const [status, setStatus] = useState("loading"); // loading | ready | offline
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [lastSync, setLastSync] = useState(null);

  const apply = useCallback(({ next, error: err, allFailed }) => {
    setRaw((prev) => ({ ...prev, ...next }));
    setError(err);
    setStatus(allFailed && err?.status === 0 ? "offline" : "ready");
    setLastSync(new Date());
    setRefreshing(false);
  }, []);

  /** Re-fetch some (or all) tables, e.g. reload(["transactions", "properties"]). */
  const reload = useCallback(
    async (keys = ALL_KEYS) => {
      setRefreshing(true);
      apply(await fetchKeys(keys));
    },
    [apply]
  );

  useEffect(() => {
    let cancelled = false;
    fetchKeys(ALL_KEYS).then((result) => {
      if (!cancelled) apply(result);
    });
    return () => {
      cancelled = true;
    };
  }, [apply]);

  const index = useMemo(() => buildIndex(raw), [raw]);

  const value = useMemo(
    () => ({
      ...index,
      raw,
      status,
      loading: status === "loading",
      error,
      refreshing,
      lastSync,
      reload,
    }),
    [index, raw, status, error, refreshing, lastSync, reload]
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}
