// app/settings/page.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { motion, useInView } from "framer-motion";
import {
  User,
  Mail,
  Shield,
  Bell,
  Palette,
  Save,
  LogOut,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ThemeToggle from "../components/ThemeToggle";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { db } from "../firebaseconfig";
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";

export default function SettingsPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [emailNotifs, setEmailNotifs] = useState<boolean>(true);
  const [publicProfile, setPublicProfile] = useState(false);
  const [promoEmails, setPromoEmails] = useState(false);
  const [pushNotifs, setPushNotifs] = useState(true);
  const [storyUpdates, setStoryUpdates] = useState(false);

  const router = useRouter();
  const { user, logout } = useAuth();
  const { theme } = useTheme();

  const statsRef = useRef<HTMLDivElement>(null);
  const inView = useInView(statsRef, { once: true });

  // Load settings from Firestore
  useEffect(() => {
    if (!user?.uid) return;

    const loadSettings = async () => {
      const settingsRef = doc(db, "settings", user.uid);
      const snap = await getDoc(settingsRef);

      if (snap.exists()) {
        const data = snap.data();
        setEmailNotifs(data.emailNotifs ?? true);
        setPublicProfile(data.publicProfile ?? false);
        setPromoEmails(data.promoEmails ?? false);
        setPushNotifs(data.pushNotifs ?? true);
        setStoryUpdates(data.storyUpdates ?? false);
      }
    };

    loadSettings();
  }, [user?.uid]);

  // Save settings
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.uid) {
      alert("You must be logged in to save settings.");
      return;
    }

    setIsLoading(true);
    try {
      const settingsRef = doc(db, "settings", user.uid);

      await setDoc(
        settingsRef,
        {
          email: user.email || "",
          fullName: user.fullName || "",
          emailNotifs,
          publicProfile,
          promoEmails,
          pushNotifs,
          storyUpdates,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      alert("Settings saved successfully!");
    } catch (error: any) {
      console.error("Error saving settings:", error);
      alert("Failed to save settings: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  return (
    <>
      {/* Animated Background Blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <motion.div
          animate={{ x: [0, 120, 0], y: [0, -80, 0] }}
          transition={{ duration: 22, repeat: Infinity, ease: "linear" }}
          className="absolute top-10 left-10 w-96 h-96 bg-linear-to-br from-indigo-400/20 to-purple-500/20 rounded-full blur-3xl"
        />
        <motion.div
          animate={{ x: [0, -100, 0], y: [0, 100, 0] }}
          transition={{ duration: 28, repeat: Infinity, ease: "linear" }}
          className="absolute bottom-20 right-20 w-80 h-80 bg-linear-to-tr from-pink-400/20 to-orange-500/20 rounded-full blur-3xl"
        />
      </div>

      <main
        className={`min-h-screen py-8 px-4 ${
          theme === "light"
            ? "bg-linear-to-br from-indigo-50/50 via-purple-50/50 to-pink-50/50"
            : "bg-linear-to-br from-gray-900 via-purple-950 to-indigo-950"
        }`}
      >
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <h1 className={`text-3xl font-bold bg-clip-text text-transparent bg-linear-to-r ${
              theme === "light" ? "from-indigo-600 to-purple-600" : "from-indigo-400 to-purple-400"
            }`}>
              Settings
            </h1>
            <p className={`mt-2 text-sm ${theme === "light" ? "text-gray-600" : "text-gray-400"}`}>
              Manage your account preferences
            </p>
          </motion.div>

          {/* Settings Form */}
          <motion.form
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onSubmit={handleSave}
            className="space-y-6"
          >
            {/* Profile Section */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ y: -4, scale: 1.01 }}
              transition={{ delay: 0.1, type: "spring", stiffness: 300 }}
              className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-3xl p-6 shadow-2xl border border-white/30 dark:border-gray-700/50"
            >
              <h2 className="flex items-center gap-2 text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
                <User className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                Profile
              </h2>
              <div className="space-y-4">
                <div className="relative group">
                  <input
                    type="text"
                    defaultValue={user?.fullName || ""}
                    className={`w-full pl-4 pr-4 py-4 rounded-xl border-2 transition-all backdrop-blur ${
                      theme === "light"
                        ? "bg-white/70 border-gray-200 focus:border-indigo-500"
                        : "bg-gray-700/70 border-gray-600 focus:border-purple-500 text-white"
                    } outline-none focus:ring-2 focus:ring-indigo-500/20`}
                    placeholder="Enter your full name"
                  />
                </div>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    defaultValue={user?.email || ""}
                    readOnly
                    className="w-full pl-12 pr-4 py-4 rounded-xl border-2 bg-gray-100/70 dark:bg-gray-700/50 border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed backdrop-blur"
                  />
                </div>
              </div>
            </motion.section>

            {/* Privacy Section */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ y: -4, scale: 1.01 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 300 }}
              className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-3xl p-6 shadow-2xl border border-white/30 dark:border-gray-700/50"
            >
              <h2 className="flex items-center gap-2 text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
                <Shield className="h-5 w-5 text-green-600 dark:text-green-400" />
                Privacy
              </h2>
              <div className="space-y-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={publicProfile}
                    onChange={(e) => setPublicProfile(e.target.checked)}
                    className="w-5 h-5 rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Make profile public
                  </span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={promoEmails}
                    onChange={(e) => setPromoEmails(e.target.checked)}
                    className="w-5 h-5 rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Receive promotional emails
                  </span>
                </label>
              </div>
            </motion.section>

            {/* Notifications Section */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ y: -4, scale: 1.01 }}
              transition={{ delay: 0.3, type: "spring", stiffness: 300 }}
              className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-3xl p-6 shadow-2xl border border-white/30 dark:border-gray-700/50"
            >
              <h2 className="flex items-center gap-2 text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
                <Bell className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                Notifications
              </h2>
              <div className="space-y-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={emailNotifs}
                    onChange={(e) => setEmailNotifs(e.target.checked)}
                    className="w-5 h-5 rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Email notifications
                  </span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={pushNotifs}
                    onChange={(e) => setPushNotifs(e.target.checked)}
                    className="w-5 h-5 rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Push notifications
                  </span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={storyUpdates}
                    onChange={(e) => setStoryUpdates(e.target.checked)}
                    className="w-5 h-5 rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Story updates
                  </span>
                </label>
              </div>
            </motion.section>

            {/* Theme Section */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ y: -4, scale: 1.01 }}
              transition={{ delay: 0.4, type: "spring", stiffness: 300 }}
              className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-3xl p-6 shadow-2xl border border-white/30 dark:border-gray-700/50"
            >
              <h2 className="flex items-center gap-2 text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
                <Palette className="h-5 w-5 text-pink-600 dark:text-pink-400" />
                Appearance
              </h2>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Dark Mode
                </span>
                <ThemeToggle />
              </div>
            </motion.section>

            {/* Action Buttons */}
            <div className="flex gap-4 pt-6">
              <motion.button
                type="submit"
                disabled={isLoading}
                className="flex-1 bg-linear-to-r from-indigo-600 via-purple-600 to-pink-600 text-white font-semibold py-4 px-4 rounded-xl shadow-lg flex items-center justify-center gap-2 disabled:opacity-70"
                whileHover={{ scale: isLoading ? 1 : 1.02 }}
                whileTap={{ scale: isLoading ? 1 : 0.98 }}
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-5 w-5" />
                    Save Changes
                  </>
                )}
              </motion.button>

              <motion.button
                type="button"
                onClick={handleLogout}
                className="flex-1 bg-red-500/10 dark:bg-red-900/30 hover:bg-red-500/20 dark:hover:bg-red-800/40 text-red-600 dark:text-red-400 font-semibold py-4 px-4 rounded-xl border border-red-500/30 dark:border-red-700/50 transition-all flex items-center justify-center gap-2"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <LogOut className="h-5 w-5" />
                Logout
              </motion.button>
            </div>
          </motion.form>

          {/* Back Link */}
          <div className="mt-8 text-center">
            <Link
              href="/profile"
              className="inline-flex items-center gap-2 text-indigo-600 dark:text-indigo-400 hover:underline text-sm font-medium"
            >
              Back to Profile
            </Link>
          </div>
        </div>

       
      </main>
    </>
  );
}