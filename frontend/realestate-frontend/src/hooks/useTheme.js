import { useCallback, useState } from "react";

function readTheme() {
  try {
    const t = localStorage.getItem("theme");
    return t === "light" || t === "dark" ? t : "system";
  } catch {
    return "system";
  }
}

/** "system" | "light" | "dark" — persisted per browser, applied via <html data-theme>. */
export default function useTheme() {
  const [theme, setThemeState] = useState(readTheme);

  const setTheme = useCallback((next) => {
    setThemeState(next);
    try {
      if (next === "system") localStorage.removeItem("theme");
      else localStorage.setItem("theme", next);
    } catch {
      // storage unavailable (private mode) — theme still applies for this session
    }
    if (next === "system") delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = next;
  }, []);

  return [theme, setTheme];
}
