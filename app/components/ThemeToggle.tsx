"use client";

import { useEffect, useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";

const STORAGE_KEY = "theme";

// The class on <html> is the source of truth. Reading it directly beats
// mirroring it into state, which needed a sync setState inside an effect and
// left isLight stuck at null on dark - so the button showed a moon on load and
// a sun after toggling back to the same theme.
function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });
  return () => observer.disconnect();
}

function isLightNow() {
  return document.documentElement.classList.contains("light");
}

export default function ThemeToggle() {
  // Dark is the default theme, so that is what the server renders. The stored
  // preference is applied below, after hydration, which moves the observer.
  const isLight = useSyncExternalStore(subscribe, isLightNow, () => false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    document.documentElement.classList.toggle("light", saved === "light");
  }, []);

  const toggleTheme = () => {
    const next = isLight ? "dark" : "light";
    document.documentElement.classList.toggle("light", next === "light");
    localStorage.setItem(STORAGE_KEY, next);
  };

  return (
    <button
      id='theme-toggle'
      onClick={toggleTheme}
      aria-label={isLight ? "Switch to dark theme" : "Switch to light theme"}
      className='px-4 py-2'
    >
      {isLight ? <Moon className='w-6 h-6' /> : <Sun className='w-6 h-6' />}
    </button>
  );
}
