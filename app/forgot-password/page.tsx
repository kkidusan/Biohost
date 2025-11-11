// app/forgot-password/page.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Lock,
  Mail,
  Loader2,
  CheckCircle,
  ArrowLeft,
} from "lucide-react";
import { motion, AnimatePresence, useInView } from "framer-motion";
import { useTheme } from "../context/ThemeContext";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [stage, setStage] = useState<"email" | "otp" | "sent">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [error, setError] = useState("");

  const { theme } = useTheme();
  const statsRef = useRef<HTMLDivElement>(null);
  const inView = useInView(statsRef, { once: true });

  useEffect(() => {
    if (resendTimer > 0) {
      const id = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(id);
    }
  }, [resendTimer]);

  const sendOtp = async () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send OTP");
      setStage("otp");
      setResendTimer(60);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    if (otp.length !== 6) {
      setError("Enter 6-digit OTP");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Invalid OTP");

      const resetRes = await fetch("/api/auth/send-reset-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!resetRes.ok) throw new Error("Failed to send reset link");

      setStage("sent");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResendTimer(60);
    await sendOtp();
  };

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
        <motion.div
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
              Reset Password
            </h1>
            <p className={`mt-2 text-sm ${theme === "light" ? "text-gray-600" : "text-gray-400"}`}>
              {stage === "email" && "Enter your email to receive OTP"}
              {stage === "otp" && "Check your inbox for the code"}
              {stage === "sent" && "Reset link sent!"}
            </p>
          </div>

          <AnimatePresence mode="wait">
            {stage === "email" && (
              <motion.div
                key="email"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-6"
              >
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-red-600 transition-colors" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className={`w-full pl-12 pr-4 py-4 rounded-xl border-2 transition-all backdrop-blur ${
                      theme === "light"
                        ? "bg-white/70 border-gray-200 focus:border-red-500"
                        : "bg-gray-700/70 border-gray-600 focus:border-pink-500 text-white"
                    } outline-none focus:ring-2 focus:ring-red-500/20`}
                  />
                </div>

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
                  onClick={sendOtp}
                  disabled={loading}
                  className="w-full py-4 bg-linear-to-r from-red-600 to-pink-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-70 shadow-lg"
                  whileHover={{ scale: loading ? 1 : 1.02 }}
                  whileTap={{ scale: loading ? 1 : 0.98 }}
                >
                  {loading ? (
                    <>
                      <Loader2 className="animate-spin h-5 w-5" />
                      Sending...
                    </>
                  ) : (
                    "Send OTP"
                  )}
                </motion.button>
              </motion.div>
            )}

            {stage === "otp" && (
              <motion.div
                key="otp"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-6"
              >
                <div className="text-center">
                  <CheckCircle className="w-12 h-12 mx-auto text-green-500 mb-3" />
                  <p className={`text-sm ${theme === "light" ? "text-gray-600" : "text-gray-400"}`}>
                    OTP sent to <strong className="text-red-600 dark:text-red-400">{email}</strong>
                  </p>
                  {resendTimer > 0 ? (
                    <p className="text-xs text-gray-500 mt-1">
                      Resend in <span className="font-mono">{resendTimer}s</span>
                    </p>
                  ) : (
                    <button
                      onClick={handleResend}
                      className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline mt-1"
                    >
                      Resend OTP
                    </button>
                  )}
                </div>

                <input
                  type="text"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  placeholder="000000"
                  className={`w-full text-center text-3xl font-mono tracking-widest py-4 rounded-xl border-2 transition-all backdrop-blur ${
                    theme === "light"
                      ? "bg-white/70 border-gray-300 focus:border-green-500"
                      : "bg-gray-700/70 border-gray-600 focus:border-emerald-500 text-white"
                  } outline-none focus:ring-2 focus:ring-green-500/20`}
                />

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
                  onClick={verifyOtp}
                  disabled={loading || otp.length !== 6}
                  className="w-full py-4 bg-linear-to-r from-green-500 to-emerald-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-70 shadow-lg"
                  whileHover={{ scale: (loading || otp.length !== 6) ? 1 : 1.02 }}
                  whileTap={{ scale: (loading || otp.length !== 6) ? 1 : 0.98 }}
                >
                  {loading ? (
                    <>
                      <Loader2 className="animate-spin h-5 w-5" />
                      Verifying...
                    </>
                  ) : (
                    "Verify & Send Reset Link"
                  )}
                </motion.button>

                <button
                  onClick={() => setStage("email")}
                  className="w-full text-sm text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center justify-center gap-1 mt-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Change Email
                </button>
              </motion.div>
            )}

            {stage === "sent" && (
              <motion.div
                key="sent"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="text-center space-y-6"
              >
                <CheckCircle className="w-16 h-16 mx-auto text-green-500" />
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
                  Check Your Email
                </h2>
                <p className={`text-sm ${theme === "light" ? "text-gray-600" : "text-gray-400"}`}>
                  We sent a password reset link to
                </p>
                <p className="font-mono text-sm bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-lg inline-block">
                  {email}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Click the link in the email to set your new password.
                </p>

                <motion.button
                  onClick={() => router.push("/login")}
                  className="w-full py-4 bg-linear-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold shadow-lg"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Back to Login
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        

     
      </main>
    </>
  );
}