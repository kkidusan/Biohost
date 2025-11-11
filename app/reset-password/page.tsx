// app/reset-password/page.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { auth } from "../firebaseconfig";
import { verifyPasswordResetCode, confirmPasswordReset } from "firebase/auth";
import { Loader2, Lock, Eye, EyeOff, CheckCircle } from "lucide-react";
import { motion, AnimatePresence, useInView } from "framer-motion";
import { useTheme } from "../context/ThemeContext";
import zxcvbn from "zxcvbn";

const strengthColors = ["bg-red-500", "bg-orange-500", "bg-yellow-500", "bg-lime-500", "bg-green-500"];
const strengthLabels = ["Weak", "Fair", "Good", "Strong", "Very Strong"];

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const oobCode = searchParams.get("oobCode");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [verified, setVerified] = useState(false);
  const [initializing, setInitializing] = useState(true);

  const { theme } = useTheme();
  const statsRef = useRef<HTMLDivElement>(null);
  const inView = useInView(statsRef, { once: true });

  const passwordScore = zxcvbn(password).score;
  const passwordStrength = passwordScore >= 2 ? passwordScore : 0;

  // Verify oobCode on load
  useEffect(() => {
    if (!oobCode) {
      setError("Invalid reset link");
      setInitializing(false);
      return;
    }

    verifyPasswordResetCode(auth, oobCode)
      .then((email) => {
        setEmail(email);
        setVerified(true);
      })
      .catch(() => {
        setError("Invalid or expired reset link");
      })
      .finally(() => {
        setInitializing(false);
      });
  }, [oobCode]);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirm) return setError("Passwords don't match");
    if (passwordScore < 2) return setError("Password is too weak");

    setLoading(true);
    try {
      await confirmPasswordReset(auth, oobCode!, password);
      router.push("/login?reset=success");
    } catch (e: any) {
      setError(e.message || "Failed to reset password");
    } finally {
      setLoading(false);
    }
  };

  if (initializing) {
    return (
      <main className={`min-h-screen flex items-center justify-center ${theme === "light" ? "bg-gray-100" : "bg-gray-900"}`}>
        <Loader2 className="animate-spin w-10 h-10 text-indigo-600 dark:text-indigo-400" />
      </main>
    );
  }

  if (!verified) {
    return (
      <main className={`min-h-screen flex items-center justify-center p-6 ${theme === "light" ? "bg-red-50" : "bg-gray-900"}`}>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="w-16 h-16 mx-auto mb-4 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
            <Lock className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
          <p className="text-red-600 dark:text-red-400 font-medium">{error}</p>
          <button
            onClick={() => router.push("/forgot-password")}
            className="mt-4 text-indigo-600 dark:text-indigo-400 hover:underline text-sm"
          >
            Try again
          </button>
        </motion.div>
      </main>
    );
  }

  return (
    <>
      {/* Animated Background Blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <motion.div
          animate={{ x: [0, 120, 0], y: [0, -80, 0] }}
          transition={{ duration: 22, repeat: Infinity, ease: "linear" }}
          className="absolute top-10 left-10 w-96 h-96 bg-linear-to-br from-red-400/20 to-pink-500/20 rounded-full blur-3xl"
        />
        <motion.div
          animate={{ x: [0, -100, 0], y: [0, 100, 0] }}
          transition={{ duration: 28, repeat: Infinity, ease: "linear" }}
          className="absolute bottom-20 right-20 w-80 h-80 bg-linear-to-tr from-orange-400/20 to-rose-500/20 rounded-full blur-3xl"
        />
      </div>

      <main
        className={`min-h-screen flex items-center justify-center p-6 ${
          theme === "light"
            ? "bg-linear-to-br from-red-50/50 via-pink-50/50 to-rose-50/50"
            : "bg-linear-to-br from-gray-900 via-red-950 to-pink-950"
        }`}
      >
        <motion.form
          onSubmit={handleReset}
          className={`w-full max-w-md rounded-3xl shadow-2xl p-8 backdrop-blur-2xl border border-white/30 dark:border-gray-700/50 ${
            theme === "light" ? "bg-white/80" : "bg-gray-800/80"
          }`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={{ y: -4, scale: 1.01 }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          <div className="text-center mb-8">
            <motion.div
              initial={{ y: -20 }}
              animate={{ y: 0 }}
              className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-linear-to-r from-red-500 to-pink-600 mb-4 shadow-lg"
            >
              <Lock className="w-8 h-8 text-white" />
            </motion.div>
            <h1 className={`text-3xl font-bold bg-clip-text text-transparent bg-linear-to-r ${
              theme === "light" ? "from-red-600 to-pink-600" : "from-red-400 to-pink-400"
            }`}>
              Set New Password
            </h1>
            <p className={`mt-2 text-sm ${theme === "light" ? "text-gray-600" : "text-gray-400"}`}>
              for <span className="font-mono bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">{email}</span>
            </p>
          </div>

          <div className="space-y-6">
            {/* Password Input */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="relative group"
            >
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-red-600 transition-colors" />
              <input
                type={showPass ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="New Password"
                className={`w-full pl-12 pr-12 py-4 rounded-xl border-2 transition-all backdrop-blur ${
                  theme === "light"
                    ? "bg-white/70 border-gray-200 focus:border-red-500"
                    : "bg-gray-700/70 border-gray-600 focus:border-pink-500 text-white"
                } outline-none focus:ring-2 focus:ring-red-500/20`}
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-4 top-1/2 -translate-y-1/2"
              >
                {showPass ? (
                  <EyeOff className="w-5 h-5 text-gray-400" />
                ) : (
                  <Eye className="w-5 h-5 text-gray-400" />
                )}
              </button>
            </motion.div>

            {/* Confirm Password */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="relative group"
            >
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-red-600 transition-colors" />
              <input
                type={showConfirm ? "text" : "password"}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Confirm Password"
                className={`w-full pl-12 pr-12 py-4 rounded-xl border-2 transition-all backdrop-blur ${
                  theme === "light"
                    ? "bg-white/70 border-gray-200 focus:border-red-500"
                    : "bg-gray-700/70 border-gray-600 focus:border-pink-500 text-white"
                } outline-none focus:ring-2 focus:ring-red-500/20`}
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-4 top-1/2 -translate-y-1/2"
              >
                {showConfirm ? (
                  <EyeOff className="w-5 h-5 text-gray-400" />
                ) : (
                  <Eye className="w-5 h-5 text-gray-400" />
                )}
              </button>
            </motion.div>

            {/* Password Strength Meter */}
            {password && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-2"
              >
                <div className="flex gap-1">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className={`h-2 flex-1 rounded-full transition-all ${
                        i < passwordStrength ? strengthColors[passwordStrength - 1] : "bg-gray-300 dark:bg-gray-600"
                      }`}
                    />
                  ))}
                </div>
                <p className={`text-xs text-center font-medium ${
                  passwordStrength < 2 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"
                }`}>
                  {strengthLabels[passwordStrength - 1] || "Too weak"}
                </p>
              </motion.div>
            )}

            <AnimatePresence>
              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="text-red-500 dark:text-red-400 text-sm text-center"
                >
                  {error}
                </motion.p>
              )}
            </AnimatePresence>

            <motion.button
              type="submit"
              disabled={loading || password !== confirm || passwordScore < 2}
              className="w-full py-4 bg-linear-to-r from-red-600 to-pink-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-70 shadow-lg"
              whileHover={{ scale: (loading || password !== confirm || passwordScore < 2) ? 1 : 1.02 }}
              whileTap={{ scale: (loading || password !== confirm || passwordScore < 2) ? 1 : 0.98 }}
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin h-5 w-5" />
                  Resetting...
                </>
              ) : (
                "Reset Password"
              )}
            </motion.button>
          </div>
        </motion.form>

        {/* Floating CTA */}
        <motion.a
          href="/login"
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-linear-to-r from-indigo-600 to-purple-600 dark:from-indigo-500 dark:to-purple-500 text-white px-5 py-3 rounded-full shadow-2xl font-semibold text-sm backdrop-blur-xl border border-white/20"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 1 }}
        >
          Login
        </motion.a>

        {/* Stats */}
        <div ref={statsRef} className="fixed bottom-6 left-6 z-40 grid grid-cols-3 gap-3 max-w-xs">
          {[
            { label: "Secure", value: "zxcvbn" },
            { label: "Fast", value: "<2s" },
            { label: "Trusted", value: "10k+" },
          ].map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: i * 0.1 }}
              className="p-3 rounded-xl bg-white/70 dark:bg-gray-800/70 backdrop-blur text-center border border-white/30 dark:border-gray-700/50"
            >
              <div className="text-xl font-bold bg-clip-text text-transparent bg-linear-to-r from-red-600 to-pink-600 dark:from-red-400 dark:to-pink-400">
                {stat.value}
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </main>
    </>
  );
}