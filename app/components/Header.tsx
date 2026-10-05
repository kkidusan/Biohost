// components/Header.tsx
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
  Bell,
  Phone,
  ShieldCheck,
  ChevronRight,
  Users
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { db } from "../firebaseconfig";
import { doc, getDoc } from "firebase/firestore";

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  const { user, isLoggedIn, logout } = useAuth();
  const { theme } = useTheme();

  useEffect(() => {
    if (user?.uid) {
      const fetchAvatar = async () => {
        try {
          const docRef = doc(db, "customers", user.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.avatar) {
              setAvatarUrl(data.avatar);
            }
          }
        } catch (err) {
          console.error("Error fetching avatar in header:", err);
        }
      };
      fetchAvatar();
    } else {
      setAvatarUrl(null);
    }
  }, [user]);

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
    window.location.href = "/";
  };

  const navItems = [
    { name: "Home", href: "/" },
    { name: "Find Tutors", href: "/tutors" },
    { name: "Find Students", href: "/students" },
    ...(user?.role === "admin" ? [{ name: "Admin Dashboard", href: "/admin/dashboard" }] : []),
  ];

  const profileMenuItems = [
    ...(user?.role === "admin"
      ? [{ name: "Admin Dashboard", href: "/admin/dashboard", icon: ShieldCheck }]
      : user?.role === "tutor"
      ? [{ name: "Tutor Portal", href: "/tutor/dashboard", icon: BookOpen }]
      : [{ name: "Student Portal", href: "/student/dashboard", icon: User }]),
    { name: "Notifications", href: "/notifications", icon: Bell },
  ];

  const displayName = user?.fullName?.trim()
    ? user.fullName.trim()
    : user?.email?.[0].toUpperCase() ?? "?";

  const avatarLetter = user?.fullName?.trim()
    ? user.fullName.trim()[0].toUpperCase()
    : user?.email?.[0].toUpperCase() ?? "?";

  return (
    <>
      {/* Top Notification Bar */}
      <div className="bg-amber-600 text-stone-950 text-xs font-semibold py-2 px-4 text-center tracking-wider uppercase">
        Biruh Tutors | Premier Tutor & Student Connection Platform | VIP Support: +211 920 500 155
      </div>

      <header className="sticky top-0 z-50 bg-stone-950/95 backdrop-blur-md border-b border-stone-800">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center text-stone-950 font-bold text-xl shadow-lg">
              BT
            </div>
            <div>
              <span className="text-lg font-serif font-bold tracking-wider text-amber-500 block leading-none">BIRUH TUTORS</span>
              <span className="text-[10px] tracking-[0.3em] uppercase text-stone-400 block mt-1">Tutor & Student Hub</span>
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium tracking-wide text-stone-300">
            {navItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="hover:text-amber-400 transition"
              >
                {item.name}
              </Link>
            ))}
          </nav>

          {/* Desktop Right Actions */}
          <div className="hidden md:flex items-center gap-4">
            <a
              href="tel:+211920500155"
              className="text-xs text-stone-300 hover:text-amber-400 flex items-center gap-1 font-mono"
            >
              <Phone className="w-3.5 h-3.5 text-amber-500" /> +211 920 500 155
            </a>

            {isLoggedIn && user ? (
              <div className="relative" ref={profileRef}>
                <button
                  onClick={() => setIsProfileOpen(!isProfileOpen)}
                  className="w-10 h-10 rounded-full flex items-center justify-center text-stone-950 font-bold text-base bg-amber-500 ring-2 ring-amber-500/20 shadow-lg overflow-hidden cursor-pointer"
                >
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    avatarLetter
                  )}
                </button>

                <AnimatePresence>
                  {isProfileOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      className="absolute right-0 mt-3 w-64 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-xl bg-stone-900 border border-stone-800 text-stone-100 z-50"
                    >
                      <div className="p-4 border-b border-stone-800">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-amber-500 flex items-center justify-center text-stone-950 font-bold overflow-hidden">
                            {avatarUrl ? (
                              <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                            ) : (
                              avatarLetter
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-white">{displayName}</p>
                            <p className="text-xs text-stone-400 capitalize">{user.role}</p>
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
                              className="flex items-center gap-3 px-4 py-3 text-sm font-medium hover:bg-stone-800 transition text-stone-300 hover:text-white"
                            >
                              <Icon className="w-4 h-4 text-amber-500" />
                              <span>{item.name}</span>
                            </Link>
                          );
                        })}

                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium hover:bg-red-950/50 transition text-red-400 cursor-pointer"
                        >
                          <LogOut className="w-4 h-4" />
                          <span>Logout</span>
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link
                  href="/login"
                  className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-stone-200 border border-stone-800 rounded-xl text-sm font-semibold transition"
                >
                  Login
                </Link>
                <Link
                  href="/signup"
                  className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl text-sm transition shadow-lg shadow-amber-500/20 flex items-center gap-1.5"
                >
                  Get Started <Sparkles className="w-3.5 h-3.5" />
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="flex items-center gap-3 md:hidden" ref={dropdownRef}>
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 rounded-lg bg-stone-900 text-stone-300 hover:text-white border border-stone-800"
              aria-label="Toggle menu"
            >
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Drawer */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm md:hidden"
              onClick={() => setIsMenuOpen(false)}
            >
              <motion.div
                id="mobile-menu-drawer"
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ type: "spring", stiffness: 200, damping: 25 }}
                className="absolute right-0 top-0 h-screen w-3/4 max-w-sm overflow-y-auto p-6 bg-stone-900 border-l border-stone-800 text-stone-100"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex justify-end mb-6">
                  <button
                    onClick={() => setIsMenuOpen(false)}
                    className="p-2 rounded-lg bg-stone-950 text-stone-300 hover:text-white border border-stone-800"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                <div className="space-y-4">
                  {navItems.map((item) => (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setIsMenuOpen(false)}
                      className="block py-3 px-3 text-stone-300 hover:text-amber-400 font-medium border-b border-stone-800 transition"
                    >
                      {item.name}
                    </Link>
                  ))}

                  <div className="pt-4 space-y-3 border-t border-stone-800">
                    {isLoggedIn && user ? (
                      <>
                        <div className="flex items-center gap-3 px-3 py-2">
                          <div className="w-9 h-9 rounded-full bg-amber-500 flex items-center justify-center text-stone-950 font-bold overflow-hidden">
                            {avatarUrl ? (
                              <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                            ) : (
                              avatarLetter
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-white">{displayName}</p>
                            <p className="text-xs text-stone-400 capitalize">{user.role}</p>
                          </div>
                        </div>

                        {profileMenuItems.map((item) => {
                          const Icon = item.icon;
                          return (
                            <Link
                              key={item.name}
                              href={item.href}
                              onClick={() => setIsMenuOpen(false)}
                              className="block py-3 px-3 text-sm font-medium rounded-xl hover:bg-stone-800 transition flex items-center gap-3 text-stone-300"
                            >
                              <Icon className="w-4 h-4 text-amber-500" />
                              <span>{item.name}</span>
                            </Link>
                          );
                        })}

                        <button
                          onClick={handleLogout}
                          className="w-full text-left py-3 px-3 text-sm font-medium rounded-xl flex items-center gap-3 text-red-400 hover:bg-red-950/40 transition"
                        >
                          <LogOut className="w-4 h-4" />
                          Logout
                        </button>
                      </>
                    ) : (
                      <div className="space-y-3 pt-2">
                        <Link
                          href="/login"
                          onClick={() => setIsMenuOpen(false)}
                          className="block w-full text-center py-3 rounded-xl font-semibold bg-stone-950 text-stone-200 border border-stone-800 hover:bg-stone-800 transition"
                        >
                          Login
                        </Link>
                        <Link
                          href="/signup"
                          onClick={() => setIsMenuOpen(false)}
                          className="block w-full text-center py-3 rounded-xl font-bold bg-amber-500 text-stone-950 hover:bg-amber-400 transition shadow-lg"
                        >
                          Get Started
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>
    </>
  );
}
