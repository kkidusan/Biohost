"use client";

import { Sun, Moon } from "lucide-react";
import { useTheme } from "../context/ThemeContext";

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition duration-300"
    >
      {theme === "light" ? (
        <Sun className="h-8 w-8 text-black" />
      ) : (
        <Moon className="h-8 w-8 text-white" />
      )}
    </button>
  );
}
