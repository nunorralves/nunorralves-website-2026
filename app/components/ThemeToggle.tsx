'use client';

import { useEffect } from 'react';

const STORAGE_KEY = 'theme';

export default function ThemeToggle() {
  useEffect(() => {
    const savedTheme = localStorage.getItem(STORAGE_KEY);
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initialTheme = savedTheme || (prefersDark ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark', initialTheme === 'dark');
  }, []);

  const toggleTheme = () => {
    const isDark = document.documentElement.classList.contains('dark');
    const newTheme = isDark ? 'light' : 'dark';
    document.documentElement.classList.toggle('dark', !isDark);
    localStorage.setItem(STORAGE_KEY, newTheme);
    console.log('Theme toggled to:', newTheme);
  };

  return (
    <button
      id='theme-toggle'
      onClick={toggleTheme}
      className='px-4 py-2 border border-border rounded'
    >
      Toggle theme
    </button>
  );
}
