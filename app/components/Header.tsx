// components/Header.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useInView } from "framer-motion";
import {
  Menu,
  X,
  BookOpen,
  User,
  Sparkles,
  LogOut,
  Settings,
  Mail,
  PenTool,
  Bell,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ThemeToggle from "./ThemeToggle";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);
  const inView = useInView(statsRef, { once: true });

  const router = useRouter();
  const { user, isLoggedIn, logout } = useAuth();
  const { theme } = useTheme();

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setIsProfileOpen(false);
      }
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        const mobileMenu = document.getElementById("mobile-menu-drawer");
        if (mobileMenu && !mobileMenu.contains(e.target as Node)) {
          setIsMenuOpen(false);
        }
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await logout();
    setIsProfileOpen(false);
    setIsMenuOpen(false);
    router.push("/");
  };

  const navItems = [
    { name: "Home", href: "/" },
    { name: "Read Now", href: "/read" },
  ];

  const profileMenuItems = [
    { name: "Your Profile", href: "/profile", icon: User },
    { name: "Your Story", href: "/story", icon: PenTool },
    { name: "Notifications", href: "/notifications", icon: Bell },
    { name: "Settings", href: "/settings", icon: Settings },
  ];

  const displayName = user?.fullName?.trim()
    ? user.fullName.trim()
    : user?.email?.[0].toUpperCase() ?? "?";

  const avatarLetter = user?.fullName?.trim()
    ? user.fullName.trim()[0].toUpperCase()
    : user?.email?.[0].toUpperCase() ?? "?";

  return (
    <>
      {/* Subtle Animated Background Blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <motion.div
          animate={{ x: [0, 100, 0], y: [0, -60, 0] }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute top-0 left-0 w-80 h-80 bg-linear-to-br from-blue-400/10 to-teal-500/10 rounded-full blur-3xl"
        />
        <motion.div
          animate={{ x: [0, -80, 0], y: [0, 80, 0] }}
          transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
          className="absolute bottom-0 right-0 w-72 h-72 bg-linear-to-tr from-green-400/10 to-cyan-500/10 rounded-full blur-3xl"
        />
      </div>

      <header className="sticky top-0 z-50">
        <div className={`border-b border-white/20 dark:border-gray-800/50 backdrop-blur-xl ${
          theme === "light" ? "bg-white/70" : "bg-gray-950/90"
        } shadow-lg`}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              {/* Logo */}
              <Link href="/" className="flex items-center space-x-2 group">
                <motion.div
                  whileHover={{ rotate: 360 }}
                  transition={{ duration: 0.6 }}
                  className="p-1 rounded-xl bg-linear-to-br from-blue-500/20 to-teal-500/20 dark:from-yellow-400/20 dark:to-orange-500/20 shadow-md"
                >
                  <BookOpen className="h-8 w-8 text-blue-600 dark:text-yellow-400 drop-shadow-sm" />
                </motion.div>
                <motion.span
                  className={`text-2xl font-bold bg-clip-text text-transparent bg-linear-to-r ${
                    theme === "light"
                      ? "from-blue-600 via-teal-500 to-green-600"
                      : "from-yellow-400 via-orange-500 to-pink-500"
                  }`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  BioHost
                </motion.span>
              </Link>

              {/* Desktop Nav */}
              <nav className="hidden md:flex items-center space-x-8">
                {navItems.map((item) => (
                  <motion.div
                    key={item.name}
                    whileHover={{ scale: 1.1, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    className="relative"
                  >
                    <Link
                      href={item.href}
                      className={`font-medium transition-all duration-300 relative after:absolute after:bottom-0 after:left-0 after:w-0 after:h-0.5 after:bg-linear-to-r after:transition-all after:duration-300 hover:after:w-full ${
                        theme === "light"
                          ? "text-gray-700 hover:text-blue-600 after:from-blue-600 after:to-teal-500"
                          : "text-gray-300 hover:text-yellow-400 after:from-yellow-400 after:to-orange-500"
                      }`}
                    >
                      {item.name}
                    </Link>
                  </motion.div>
                ))}

                {/* Desktop Auth */}
                <div className="flex items-center gap-3">
                  {isLoggedIn && user ? (
                    <div className="relative" ref={profileRef}>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setIsProfileOpen(!isProfileOpen)}
                        className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-lg overflow-hidden shadow-xl bg-linear-to-br from-blue-600 via-teal-500 to-green-600 dark:from-yellow-400 dark:via-orange-500 dark:to-pink-500 ring-2 ring-white/20 dark:ring-gray-700/50"
                      >
                        {avatarLetter}
                      </motion.button>

                      <AnimatePresence>
                        {isProfileOpen && (
                          <motion.div
                            initial={{ opacity: 0, y: -10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -10, scale: 0.95 }}
                            transition={{ duration: 0.2 }}
                            className={`absolute right-0 mt-3 w-64 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-xl border ${
                              theme === "light"
                                ? "bg-white/90 border-gray-200/50"
                                : "bg-gray-950/90 border-gray-800/50"
                            }`}
                          >
                            <div className={`p-4 border-b ${
                              theme === "light" ? "border-gray-200/50" : "border-gray-800/50"
                            }`}>
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-linear-to-br from-blue-500 to-teal-500 flex items-center justify-center text-white font-bold">
                                  {avatarLetter}
                                </div>
                                <div>
                                  <p className={`text-sm font-semibold ${
                                    theme === "light" ? "text-gray-800" : "text-gray-100"
                                  }`}>
                                    {displayName}
                                  </p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                    <Mail className="w-3 h-3" />
                                    {user.email}
                                  </p>
                                </div>
                              </div>
                            </div>

                            <div className="py-2">
                              {profileMenuItems.map((item) => {
                                const Icon = item.icon;
                                return (
                                  <Link
                                    key={item.name}
                                    href={item.href}
                                    onClick={() => setIsProfileOpen(false)}
                                    className={`flex items-center gap-3 px-4 py-3 transition-all ${
                                      theme === "light"
                                        ? "hover:bg-gray-100"
                                        : "hover:bg-gray-900/70"
                                    }`}
                                  >
                                    <Icon className={`w-4 h-4 ${
                                      theme === "light" ? "text-gray-600" : "text-gray-400"
                                    }`} />
                                    <span className={`text-sm font-medium ${
                                      theme === "light" ? "text-gray-800" : "text-gray-100"
                                    }`}>
                                      {item.name}
                                    </span>
                                  </Link>
                                );
                              })}

                              <div className={`px-4 py-3 border-t ${
                                theme === "light" ? "border-gray-200/50" : "border-gray-800/50"
                              }`}>
                                <div className="flex items-center justify-between">
                                  <span className={`text-sm font-medium ${
                                    theme === "light" ? "text-gray-700" : "text-gray-100"
                                  }`}>
                                    Theme
                                  </span>
                                  <ThemeToggle />
                                </div>
                              </div>

                              <button
                                onClick={handleLogout}
                                className={`w-full flex items-center gap-3 px--4 py-3 transition-all ${
                                  theme === "light"
                                    ? "hover:bg-red-50 text-red-600"
                                    : "hover:bg-red-900/40 text-red-400"
                                }`}
                              >
                                <LogOut className="w-4 h-4" />
                                <span className="text-sm font-medium">Logout</span>
                              </button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ) : (
                    <>
                      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                        <Link
                          href="/login"
                          className={`px-5 py-2.5 rounded-xl font-semibold transition-all duration-300 shadow-sm ${
                            theme === "light"
                              ? "bg-gray-100/80 text-gray-800 border border-gray-300/50 hover:bg-gray-200"
                              : "bg-gray-900 text-gray-300 border border-gray-800/50 hover:bg-gray-800"
                          }`}
                        >
                          Login
                        </Link>
                      </motion.div>

                      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                        <Link
                          href="/signup"
                          className={`px-6 py-2.5 rounded-xl font-semibold text-white flex items-center gap-2 shadow-xl transition-all duration-300 ring-2 ring-white/30 dark:ring-gray-700/40 ${
                            theme === "light"
                              ? "bg-linear-to-r from-blue-600 via-teal-500 to-green-600 hover:from-blue-700 hover:via-teal-600 hover:to-green-700"
                              : "bg-linear-to-r from-yellow-400 via-orange-500 to-pink-500 hover:from-yellow-500 hover:via-orange-600 hover:to-pink-600"
                          }`}
                        >
                          Get Started
                          <Sparkles className="h-4 w-4 animate-pulse" />
                        </Link>
                      </motion.div>
                    </>
                  )}
                </div>
              </nav>

              {/* Mobile Menu Button */}
              <div className="flex items-center gap-3 md:hidden" ref={dropdownRef}>
                <button
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className={`p-2 rounded-lg transition-all ${
                    theme === "light"
                      ? "bg-gray-100/60 hover:bg-gray-200"
                      : "bg-gray-900 hover:bg-gray-800"
                  }`}
                  aria-label="Toggle menu"
                >
                  {isMenuOpen ? (
                    <X className={`h-6 w-6 ${theme === "light" ? "text-gray-700" : "text-gray-300"}`} />
                  ) : (
                    <Menu className={`h-6 w-6 ${theme === "light" ? "text-gray-700" : "text-gray-300"}`} />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Mobile Drawer */}
          <AnimatePresence>
            {isMenuOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden"
                onClick={() => setIsMenuOpen(false)}
              >
                <motion.div
                  id="mobile-menu-drawer"
                  initial={{ x: "100%" }}
                  animate={{ x: 0 }}
                  exit={{ x: "100%" }}
                  transition={{ type: "spring", stiffness: 200, damping: 25 }}
                  className={`absolute right-0 top-0 h-screen w-3/4 max-w-sm overflow-y-auto p-6 backdrop-blur-xl border-l ${
                    theme === "light"
                      ? "bg-white/90 border-gray-200/50"
                      : "bg-gray-950/90 border-gray-800/50"
                  }`}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex justify-end mb-4">
                    <button
                      onClick={() => setIsMenuOpen(false)}
                      className={`p-2 rounded-lg transition-all ${
                        theme === "light"
                          ? "bg-gray-100 hover:bg-gray-200"
                          : "bg-gray-900 hover:bg-gray-800"
                      }`}
                    >
                      <X className={`h-6 w-6 ${theme === "light" ? "text-gray-700" : "text-gray-300"}`} />
                    </button>
                  </div>

                  <div className="space-y-4">
                    {navItems.map((item, index) => (
                      <motion.div
                        key={item.name}
                        initial={{ x: 30, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: index * 0.05 + 0.1, type: "spring", stiffness: 150 }}
                      >
                        <Link
                          href={item.href}
                          onClick={() => setIsMenuOpen(false)}
                          className={`block py-3 px-2 font-medium transition-all duration-300 hover:translate-x-1 border-b ${
                            theme === "light"
                              ? "text-gray-700 hover:text-blue-600 border-gray-100"
                              : "text-gray-300 hover:text-yellow-400 border-gray-800"
                          }`}
                        >
                          {item.name}
                        </Link>
                      </motion.div>
                    ))}

                    <motion.div
                      initial={{ x: 30, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: 0.3 }}
                      className={`pt-4 space-y-3 border-t ${
                        theme === "light" ? "border-gray-200" : "border-gray-800"
                      }`}
                    >
                      {isLoggedIn && user ? (
                        <>
                          <div className="flex items-center gap-3 px-2 py-3">
                            <div className="w-9 h-9 rounded-full bg-linear-to-br from-blue-500 to-teal-500 flex items-center justify-center text-white text-sm font-bold">
                              {avatarLetter}
                            </div>
                            <div>
                              <p className={`text-sm font-semibold ${
                                theme === "light" ? "text-gray-800" : "text-gray-100"
                              }`}>
                                {displayName}
                              </p>
                            </div>
                          </div>

                          {profileMenuItems.map((item) => {
                            const Icon = item.icon;
                            return (
                              <Link
                                key={item.name}
                                href={item.href}
                                onClick={() => setIsMenuOpen(false)}
                                className={`block w-full text-left py-3 px-2 text-sm font-medium rounded-lg flex items-center gap-3 transition-all ${
                                  theme === "light"
                                    ? "hover:bg-gray-100"
                                    : "hover:bg-gray-900/70"
                                }`}
                              >
                                <Icon className={`w-4 h-4 ${
                                  theme === "light" ? "text-gray-600" : "text-gray-400"
                                }`} />
                                <span className={theme === "light" ? "text-gray-800" : "text-gray-100"}>
                                  {item.name}
                                </span>
                              </Link>
                            );
                          })}

                          <div className={`flex items-center justify-between px-2 py-3 border-t ${
                            theme === "light" ? "border-gray-100" : "border-gray-800"
                          }`}>
                            <span className={`text-sm font-medium ${
                              theme === "light" ? "text-gray-700" : "text-gray-100"
                            }`}>
                              Theme
                            </span>
                            <ThemeToggle />
                          </div>

                          <button
                            onClick={handleLogout}
                            className={`w-full text-left py-3 px-2 text-sm font-medium rounded-lg flex items-center gap-3 transition-all ${
                              theme === "light"
                                ? "text-red-600 hover:bg-red-50"
                                : "text-red-400 hover:bg-red-900/40"
                            }`}
                          >
                            <LogOut className="w-4 h-4" />
                            Logout
                          </button>
                        </>
                      ) : (
                        <>
                          <Link
                            href="/login"
                            onClick={() => setIsMenuOpen(false)}
                            className={`block w-full text-center py-3.5 rounded-xl font-semibold transition-all duration-300 ${
                              theme === "light"
                                ? "bg-gray-700 text-white border border-gray-300/50 hover:bg-gray-600"
                                : "bg-gray-900 text-gray-300 border border-gray-800/50 hover:bg-gray-800"
                            }`}
                          >
                            Login
                          </Link>

                          <Link
                            href="/signup"
                            onClick={() => setIsMenuOpen(false)}
                            className={`block w-full text-center py-3.5 rounded-xl font-semibold text-white flex items-center justify-center gap-2 shadow-lg transition-all duration-300 ring-2 ring-white/30 dark:ring-gray-700/40 ${
                              theme === "light"
                                ? "bg-linear-to-r from-blue-600 via-teal-500 to-green-600 hover:from-blue-700 hover:via-teal-600 hover:to-green-700"
                                : "bg-linear-to-r from-yellow-400 via-orange-500 to-pink-500 hover:from-yellow-500 hover:via-orange-600 hover:to-pink-600"
                            }`}
                          >
                            Get Started
                            <Sparkles className="h-4 w-4 animate-pulse" />
                          </Link>
                        </>
                      )}
                    </motion.div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Floating CTA */}
        <motion.a
          href="/dashboard"
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-linear-to-r from-indigo-600 to-purple-600 dark:from-indigo-500 dark:to-purple-500 text-white px-5 py-3 rounded-full shadow-2xl font-semibold text-sm backdrop-blur-xl border border-white/20"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 1 }}
        >
          Dashboard
        </motion.a>

       
      </header>
    </>
  );
}