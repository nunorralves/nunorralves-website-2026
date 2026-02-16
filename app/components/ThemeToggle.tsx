"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

const STORAGE_KEY = "theme";

export default function ThemeToggle() {
  const [isDark, setIsDark] = useState<boolean | null>(null);

  useEffect(() => {
    // Only initialize state on client side
    const savedTheme = localStorage.getItem(STORAGE_KEY);
    const prefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)",
    ).matches;
    const initialTheme = savedTheme || (prefersDark ? "dark" : "light");
    document.documentElement.classList.toggle("dark", initialTheme === "dark");
    setIsDark(initialTheme === "dark");
  }, []);

  const toggleTheme = () => {
    const currentDark = document.documentElement.classList.contains("dark");
    const newTheme = currentDark ? "light" : "dark";
    document.documentElement.classList.toggle("dark", !currentDark);
    localStorage.setItem(STORAGE_KEY, newTheme);
    setIsDark(!currentDark);
  };

  // Render nothing or a placeholder until state is initialized
  if (isDark === null) {
    return (
      <button id='theme-toggle' onClick={toggleTheme} className='px-4 py-2'>
        <Sun className='w-6 h-6' />
      </button>
    );
  }

  return (
    <button id='theme-toggle' onClick={toggleTheme} className='px-4 py-2'>
      {isDark ? <Sun className='w-6 h-6' /> : <Moon className='w-6 h-6' />}
    </button>
  );
}
