"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

const STORAGE_KEY = "theme";

export default function ThemeToggle() {
  const [isDark, setIsDark] = useState(() => {
    // Initialize dark mode state from localStorage
    if (typeof window !== "undefined") {
      const savedTheme = localStorage.getItem("theme");
      return savedTheme === "dark";
    }
    return false;
  });

  useEffect(() => {
    const savedTheme = localStorage.getItem(STORAGE_KEY);
    const prefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)",
    ).matches;
    const initialTheme = savedTheme || (prefersDark ? "dark" : "light");
    document.documentElement.classList.toggle("dark", initialTheme === "dark");
  }, []);

  const toggleTheme = () => {
    const isDark = document.documentElement.classList.contains("dark");
    const newTheme = isDark ? "light" : "dark";
    document.documentElement.classList.toggle("dark", !isDark);
    localStorage.setItem(STORAGE_KEY, newTheme);
    console.log("Theme toggled to:", newTheme);
    console.log("CLASS:", document.documentElement.classList.contains("dark"));
    setIsDark(!isDark);
  };

  return (
    <button
      id='theme-toggle'
      onClick={toggleTheme}
      className='px-4 py-2'
    >
      {isDark ? <Sun className='w-6 h-6' /> : <Moon className='w-6 h-6' />}
    </button>
  );
}
