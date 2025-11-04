"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
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

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const { user, isLoggedIn, logout } = useAuth();

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        profileRef.current &&
        !profileRef.current.contains(e.target as Node)
      ) {
        setIsMenuOpen(false);
        setIsProfileOpen(false);
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

  /* --------------------------------------------------------------
     Helper – display name (fullName → email first letter)
     -------------------------------------------------------------- */
  const displayName = user?.fullName?.trim()
    ? user.fullName.trim()
    : user?.email?.[0].toUpperCase() ?? "?";

  const avatarLetter = user?.fullName?.trim()
    ? user.fullName.trim()[0].toUpperCase()
    : user?.email?.[0].toUpperCase() ?? "?";

  return (
    <header className="sticky top-0 z-50 transition-all duration-500">
      <div className="backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-700/50 bg-white/80 dark:bg-gray-800/80 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            {/* Logo */}
            <Link href="/" className="flex items-center space-x-2 group">
              <motion.div
                whileHover={{ rotate: 360 }}
                transition={{ duration: 0.6 }}
                className="p-1 rounded-lg bg-gradient-to-br from-blue-500/20 to-teal-500/20 dark:from-yellow-400/20 dark:to-orange-500/20"
              >
                <BookOpen className="h-8 w-8 text-blue-600 dark:text-yellow-400 drop-shadow-sm" />
              </motion.div>
              <motion.span
                className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-teal-500 to-green-600 dark:from-yellow-400 dark:via-orange-500 dark:to-pink-500"
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
                    className="font-medium text-gray-700 dark:text-gray-200 hover:text-blue-600 dark:hover:text-yellow-400 transition-all duration-300 relative after:absolute after:bottom-0 after:left-0 after:w-0 after:h-0.5 after:bg-gradient-to-r after:from-blue-600 after:to-teal-500 dark:after:from-yellow-400 dark:after:to-orange-500 after:transition-all after:duration-300 hover:after:w-full"
                  >
                    {item.name}
                  </Link>
                </motion.div>
              ))}

              {/* Auth Section */}
              <div className="flex items-center gap-3">
                {isLoggedIn && user ? (
                  <div className="relative" ref={profileRef}>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setIsProfileOpen(!isProfileOpen)}
                      className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-lg overflow-hidden shadow-xl bg-gradient-to-br from-blue-600 via-teal-500 to-green-600 dark:from-yellow-400 dark:via-orange-500 dark:to-pink-500 ring-2 ring-white/20 dark:ring-gray-700/50"
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
                          className="absolute right-0 mt-3 w-64 rounded-2xl shadow-2xl overflow-hidden 
                                     bg-white/90 dark:bg-gray-800/95 backdrop-blur-xl 
                                     border border-gray-200/50 dark:border-gray-700/50 
                                     text-gray-800 dark:text-gray-100"
                        >
                          {/* User Info */}
                          <div className="p-4 border-b border-gray-200/50 dark:border-gray-700/50">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-teal-500 flex items-center justify-center text-white font-bold">
                                {avatarLetter}
                              </div>
                              <div>
                                <p className="text-sm font-semibold">
                                  {displayName}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                  <Mail className="w-3 h-3" />
                                  {user.email}
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Profile Menu Items */}
                          <div className="py-2">
                            {profileMenuItems.map((item) => {
                              const Icon = item.icon;
                              return (
                                <Link
                                  key={item.name}
                                  href={item.href}
                                  onClick={() => setIsProfileOpen(false)}
                                  className="flex items-center gap-3 px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
                                >
                                  <Icon className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                                  <span className="text-sm font-medium">{item.name}</span>
                                </Link>
                              );
                            })}

                            {/* Theme Toggle Inside Profile */}
                            <div className="px-4 py-3 border-t border-gray-200/50 dark:border-gray-700/50">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                  Theme
                                </span>
                                <ThemeToggle />
                              </div>
                            </div>

                            {/* Logout */}
                            <button
                              onClick={handleLogout}
                              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-red-50 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 transition-all"
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
                        className="px-5 py-2.5 rounded-xl font-semibold text-gray-800 dark:text-gray-200 bg-gray-100/80 dark:bg-gray-700/60 backdrop-blur-md border border-gray-300/50 dark:border-gray-600/50 hover:bg-gray-200 dark:hover:bg-gray-600/80 transition-all duration-300 shadow-sm"
                      >
                        Login
                      </Link>
                    </motion.div>

                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Link
                        href="/signup"
                        className="px-6 py-2.5 rounded-xl font-semibold text-white flex items-center gap-2 shadow-xl bg-gradient-to-r from-blue-600 via-teal-500 to-green-600 dark:from-yellow-400 dark:via-orange-500 dark:to-pink-500 hover:from-blue-700 dark:hover:from-yellow-500 hover:via-teal-600 dark:hover:via-orange-600 hover:to-green-700 dark:hover:to-pink-600 transition-all duration-300 ring-2 ring-white/30 dark:ring-gray-700/40"
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
                className="p-2 rounded-lg bg-gray-100/60 dark:bg-gray-700/60 backdrop-blur-md transition-all hover:bg-gray-200 dark:hover:bg-gray-600"
                aria-label="Toggle menu"
              >
                {isMenuOpen ? (
                  <X className="h-6 w-6 text-gray-700 dark:text-gray-300" />
                ) : (
                  <Menu className="h-6 w-6 text-gray-700 dark:text-gray-300" />
                )}
              </button>
            </div>
          </div>

          {/* Mobile Nav */}
          <AnimatePresence>
            {isMenuOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
                className="md:hidden pb-6 overflow-hidden"
              >
                <div className="mt-4 p-4 rounded-2xl bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 shadow-xl space-y-4">
                  {navItems.map((item, index) => (
                    <motion.div
                      key={item.name}
                      initial={{ x: -30, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: index * 0.07, type: "spring", stiffness: 120 }}
                    >
                      <Link
                        href={item.href}
                        onClick={() => setIsMenuOpen(false)}
                        className="block py-3 px-2 font-medium text-gray-700 dark:text-gray-200 hover:text-blue-600 dark:hover:text-yellow-400 transition-all duration-300 hover:translate-x-1"
                      >
                        {item.name}
                      </Link>
                    </motion.div>
                  ))}

                  {/* Mobile Auth */}
                  <motion.div
                    initial={{ x: -30, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="pt-4 space-y-3 border-t border-gray-200/50 dark:border-gray-700/50"
                  >
                    {isLoggedIn && user ? (
                      <>
                        <div className="flex items-center gap-3 px-2 py-3">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-teal-500 flex items-center justify-center text-white text-sm font-bold">
                            {avatarLetter}
                          </div>
                          <div>
                            <p className="text-sm font-semibold">{displayName}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                              <Mail className="w-3 h-3" />
                              {user.email}
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
                              className="block w-full text-left py-3 px-2 text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg flex items-center gap-3"
                            >
                              <Icon className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                              {item.name}
                            </Link>
                          );
                        })}

                        {/* Theme Toggle in Mobile Profile */}
                        <div className="flex items-center justify-between px-2 py-3">
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Theme</span>
                          <ThemeToggle />
                        </div>

                        <button
                          onClick={handleLogout}
                          className="w-full text-left py-3 px-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg flex items-center gap-3"
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
                          className="block w-full text-center py-3.5 rounded-xl font-semibold bg-gray-100/80 dark:bg-gray-700/70 backdrop-blur-md text-gray-800 dark:text-gray-200 border border-gray-300/50 dark:border-gray-600/50 hover:bg-gray-200 dark:hover:bg-gray-600/80 transition-all duration-300"
                        >
                          Login
                        </Link>

                        <Link
                          href="/signup"
                          onClick={() => setIsMenuOpen(false)}
                          className="block w-full text-center py-3.5 rounded-xl font-semibold text-white flex items-center justify-center gap-2 shadow-lg bg-gradient-to-r from-blue-600 via-teal-500 to-green-600 dark:from-yellow-400 dark:via-orange-500 dark:to-pink-500 hover:from-blue-700 dark:hover:from-yellow-500 hover:via-teal-600 dark:hover:via-orange-600 hover:to-green-700 dark:hover:to-pink-600 transition-all duration-300 ring-2 ring-white/30 dark:ring-gray-700/40"
                        >
                          Get Started
                          <Sparkles className="h-4 w-4 animate-pulse" />
                        </Link>
                      </>
                    )}
                  </motion.div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}