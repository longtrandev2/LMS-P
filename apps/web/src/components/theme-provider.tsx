import { createContext, useContext, useLayoutEffect, useState, type ReactNode } from "react";

export type ThemeMode = "light" | "dark" | "system";
type ThemeContextValue = { theme: ThemeMode; setTheme: (theme: ThemeMode) => void };
const ThemeContext = createContext<ThemeContextValue | null>(null);
const STORAGE_KEY = "lmsp-theme";

function storedTheme(): ThemeMode {
  const value = localStorage.getItem(STORAGE_KEY);
  return value === "dark" || value === "system" ? value : "light";
}

function applyTheme(theme: ThemeMode) {
  const dark = theme === "dark" || (theme === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>(storedTheme);
  useLayoutEffect(() => {
    applyTheme(theme);
    const media = matchMedia("(prefers-color-scheme: dark)");
    const syncSystem = () => theme === "system" && applyTheme("system");
    const syncStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY) return;
      const next: ThemeMode = event.newValue === "light" || event.newValue === "dark" ? event.newValue : "system";
      setThemeState(next);
    };
    media.addEventListener("change", syncSystem);
    window.addEventListener("storage", syncStorage);
    return () => {
      media.removeEventListener("change", syncSystem);
      window.removeEventListener("storage", syncStorage);
    };
  }, [theme]);

  const setTheme = (next: ThemeMode) => {
    localStorage.setItem(STORAGE_KEY, next);
    setThemeState(next);
  };
  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const value = useContext(ThemeContext);
  if (!value) throw new Error("useTheme must be used inside ThemeProvider");
  return value;
}
