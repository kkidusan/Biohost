"use client";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
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
import { useAuth } from "../context/AuthContext";
import { db } from "../firebaseconfig"; // Your Firebase config
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";

export default function SettingsPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [emailNotifs, setEmailNotifs] = useState<boolean>(true); // Default: checked
  const router = useRouter();
  const { user, logout } = useAuth();

  // -----------------------------------------------------------------
  // 1. Load settings from Firestore (creates collection if needed later)
  // -----------------------------------------------------------------
  useEffect(() => {
    if (!user?.uid) return;

    const loadSettings = async () => {
      const settingsRef = doc(db, "settings", user.uid);
      const snap = await getDoc(settingsRef);

      if (snap.exists()) {
        const data = snap.data();
        setEmailNotifs(data.emailNotifs ?? true); // fallback to true
      }
      // If no doc → keep default `true` (will be saved on first submit)
    };

    loadSettings();
  }, [user?.uid]);

  // -----------------------------------------------------------------
  // 2. Save settings → creates document in "settings" collection
  // -----------------------------------------------------------------
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
          emailNotifs: emailNotifs, // true or false
          fullName: user.fullName || "",
          updatedAt: serverTimestamp(),
        },
        { merge: true } // Creates doc if missing, updates if exists
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-2xl mx-auto px-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Settings
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
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
          <section className="bg-white dark:bg-gray-800/95 rounded-2xl p-6 shadow-sm border border-gray-200/50 dark:border-gray-700/50">
            <h2 className="flex items-center gap-2 text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
              <User className="h-5 w-5" />
              Profile
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  defaultValue={user?.fullName || ""}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700/50 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter your full name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  defaultValue={user?.email || ""}
                  readOnly
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700/30 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                />
              </div>
            </div>
          </section>

          {/* Privacy Section */}
          <section className="bg-white dark:bg-gray-800/95 rounded-2xl p-6 shadow-sm border border-gray-200/50 dark:border-gray-700/50">
            <h2 className="flex items-center gap-2 text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
              <Shield className="h-5 w-5" />
              Privacy
            </h2>
            <div className="space-y-4">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Make profile public
                </span>
              </label>
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Receive promotional emails
                </span>
              </label>
            </div>
          </section>

          {/* Notifications Section */}
          <section className="bg-white dark:bg-gray-800/95 rounded-2xl p-6 shadow-sm border border-gray-200/50 dark:border-gray-700/50">
            <h2 className="flex items-center gap-2 text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
              <Bell className="h-5 w-5" />
              Notifications
            </h2>
            <div className="space-y-4">
              {/* Email Notifications - Controlled & Default Checked */}
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={emailNotifs}
                  onChange={(e) => setEmailNotifs(e.target.checked)}
                  className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Email notifications
                </span>
              </label>

              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  defaultChecked
                  className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Push notifications
                </span>
              </label>

              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Story updates
                </span>
              </label>
            </div>
          </section>

          {/* Theme Section */}
          <section className="bg-white dark:bg-gray-800/95 rounded-2xl p-6 shadow-sm border border-gray-200/50 dark:border-gray-700/50">
            <h2 className="flex items-center gap-2 text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
              <Palette className="h-5 w-5" />
              Appearance
            </h2>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Dark Mode
              </span>
              <ThemeToggle />
            </div>
          </section>

          {/* Action Buttons */}
          <div className="flex gap-4 pt-6">
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 bg-gradient-to-r from-blue-600 via-teal-500 to-green-600 hover:from-blue-700 dark:hover:from-yellow-500 text-white font-semibold py-3 px-4 rounded-xl shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Changes
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleLogout}
              className="flex-1 bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-800/30 text-red-600 dark:text-red-400 font-semibold py-3 px-4 rounded-xl border border-red-200 dark:border-red-700/50 transition-all flex items-center justify-center gap-2"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </div>
        </motion.form>

        {/* Back Link */}
        <div className="mt-8 text-center">
          <Link
            href="/profile"
            className="inline-flex items-center gap-2 text-blue-600 dark:text-yellow-400 hover:underline text-sm"
          >
            ← Back to Profile
          </Link>
        </div>
      </div>
    </div>
  );
}