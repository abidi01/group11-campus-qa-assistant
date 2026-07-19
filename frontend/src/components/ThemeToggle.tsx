import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

type Theme = "dark" | "light";

const THEME_STORAGE_KEY = "hhu-interface-theme";
const THEME_EVENT = "hhu-theme-change";

function readTheme(): Theme {
  try {
    return window.localStorage.getItem(THEME_STORAGE_KEY) === "light"
      ? "light"
      : "dark";
  } catch {
    return "dark";
  }
}

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
  document
    .querySelector("#hhu-chat-widget-host")
    ?.setAttribute("data-theme", theme);
}

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const [theme, setTheme] = useState<Theme>(readTheme);

  useEffect(() => {
    applyTheme(readTheme());

    const syncTheme = (event: Event) => {
      const nextTheme = (event as CustomEvent<Theme>).detail;
      if (nextTheme === "dark" || nextTheme === "light") {
        setTheme(nextTheme);
        applyTheme(nextTheme);
      }
    };

    window.addEventListener(THEME_EVENT, syncTheme);
    return () => window.removeEventListener(THEME_EVENT, syncTheme);
  }, []);

  const toggleTheme = () => {
    const nextTheme: Theme = theme === "dark" ? "light" : "dark";
    applyTheme(nextTheme);
    setTheme(nextTheme);
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    } catch {
      // Storage can be unavailable in privacy-restricted or embedded contexts.
      // The visual theme should still switch for the current page.
    }
    window.dispatchEvent(new CustomEvent(THEME_EVENT, { detail: nextTheme }));
  };

  const nextLabel = theme === "dark" ? "切换到白天模式" : "切换到黑夜模式";

  return (
    <button
      type="button"
      className={`theme-toggle ${compact ? "compact" : ""}`}
      onClick={toggleTheme}
      aria-label={nextLabel}
      title={nextLabel}
    >
      {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
      {!compact && <span>{theme === "dark" ? "白天" : "黑夜"}</span>}
    </button>
  );
}
