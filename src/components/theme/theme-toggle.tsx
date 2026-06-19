"use client";

import { useSyncExternalStore, useTransition } from "react";

const THEME_EVENT = "arcade-theme-change";

function subscribe(onStoreChange: () => void) {
  const handler = () => onStoreChange();
  window.addEventListener(THEME_EVENT, handler);
  return () => window.removeEventListener(THEME_EVENT, handler);
}

function getThemeSnapshot(): "light" | "dark" {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

function getServerThemeSnapshot(): "light" | "dark" {
  return "light";
}

function notifyThemeChange() {
  window.dispatchEvent(new Event(THEME_EVENT));
}

export function ThemeToggle() {
  const [isPending, startTransition] = useTransition();
  const theme = useSyncExternalStore(subscribe, getThemeSnapshot, getServerThemeSnapshot);

  return (
    <button
      type="button"
      className="theme-toggle"
      aria-label="Alternar tema"
      disabled={isPending}
      onClick={() => {
        startTransition(() => {
          const nextTheme = getThemeSnapshot() === "dark" ? "light" : "dark";
          document.documentElement.dataset.theme = nextTheme;
          localStorage.setItem("arcade-theme", nextTheme);
          notifyThemeChange();
        });
      }}
    >
      <span className="theme-toggle__indicator" aria-hidden="true" />
      <span suppressHydrationWarning>
        {theme === "dark" ? "Escuro" : "Claro"}
      </span>
    </button>
  );
}
