// components/ThemeToggle.tsx
"use client";

import { Sun, Moon } from "lucide-react";
import { motion } from "framer-motion";
import { useTheme } from "../context/ThemeContext"; // Import the hook created above

/**
 * Renders a circular button that toggles the light/dark theme.
 * The styling ensures high visibility and consistency with the main application theme.
 */
export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <motion.button
      type="button"
      onClick={toggleTheme}
      aria-label={`Switch to ${isDark ? "Light" : "Dark"} Mode`}
      // 🎨 Base Container: Light gray/Dark gray circle
      className="p-2 rounded-full transition-colors duration-300 shadow-md 
        bg-gray-100 hover:bg-gray-200 
        dark:bg-gray-800 dark:hover:bg-gray-700 
        focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-yellow-400"
      whileTap={{ scale: 0.9 }}
    >
      <motion.div
        key={theme} // Key prop ensures the framer-motion re-renders and animates
        initial={{ rotate: -180, opacity: 0 }}
        animate={{ rotate: 0, opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        {isDark ? (
          // 🌕 Dark Theme Icon (Sun) - Yellow/Orange accent
          <Sun className="h-5 w-5 text-yellow-400" />
        ) : (
          // 🌑 Light Theme Icon (Moon) - Indigo/Blue accent
          <Moon className="h-5 w-5 text-indigo-600" />
        )}
      </motion.div>
    </motion.button>
  );
}