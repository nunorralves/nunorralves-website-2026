"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

const STORAGE_KEY = "theme";

export default function ThemeToggle() {
  const [isLight, setIsLight] = useState<boolean | null>(null);

  useEffect(() => {
    // Only initialize state on client side
    const savedTheme = localStorage.getItem(STORAGE_KEY);
    const initialTheme = savedTheme || "dark"; // Default to dark if no saved theme
    document.documentElement.classList.toggle(
      "light",
      initialTheme === "light",
    );
    if (initialTheme === "light") setIsLight(initialTheme === "light");
  }, []);

  const toggleTheme = () => {
    const currentLight = document.documentElement.classList.contains("light");
    const newTheme = currentLight ? "dark" : "light";
    document.documentElement.classList.toggle("light", !currentLight);
    localStorage.setItem(STORAGE_KEY, newTheme);
    setIsLight(!currentLight);
  };

  // Render nothing or a placeholder until state is initialized
  if (isLight === null) {
    return (
      <button id='theme-toggle' onClick={toggleTheme} className='px-4 py-2'>
        <Moon className='w-6 h-6' />
      </button>
    );
  }

  return (
    <button id='theme-toggle' onClick={toggleTheme} className='px-4 py-2'>
      {isLight ? <Moon className='w-6 h-6' /> : <Sun className='w-6 h-6' />}
    </button>
  );
}
