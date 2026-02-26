"use client";

import { useEffect, useState } from "react";

import { APP_THEMES, DEFAULT_THEME, THEME_STORAGE_KEY, type AppTheme, isAppTheme } from "@/lib/theme";

function applyTheme(theme: AppTheme): void {
  document.documentElement.dataset.theme = theme;
}

export function ThemeSwitcher() {
  const [theme, setTheme] = useState<AppTheme>(() => {
    if (typeof window === "undefined") {
      return DEFAULT_THEME;
    }

    const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isAppTheme(storedTheme)
      ? storedTheme
      : isAppTheme(document.documentElement.dataset.theme)
        ? document.documentElement.dataset.theme
        : DEFAULT_THEME;
  });

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  function onThemeChange(nextTheme: AppTheme): void {
    setTheme(nextTheme);
    applyTheme(nextTheme);
    window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
  }

  return (
    <div className="theme-switcher" aria-label="Theme switcher">
      <label htmlFor="theme-switcher-select">Theme</label>
      <select
        id="theme-switcher-select"
        value={theme}
        onChange={(event) => onThemeChange(event.target.value as AppTheme)}
      >
        {APP_THEMES.map((item) => (
          <option key={item.id} value={item.id}>
            {item.label}
          </option>
        ))}
      </select>
    </div>
  );
}
