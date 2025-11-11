// app/login/page.tsx
"use client";

import { useState, useContext, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Mail, Lock, Eye, EyeOff } from "lucide-react";
import { motion, AnimatePresence, useInView } from "framer-motion";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { auth, googleProvider } from "../firebaseconfig";
import {
  signInWithPopup,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { FcGoogle } from "react-icons/fc";

const validateEmail = (email: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  const { theme } = useTheme();
  const { isLoggedIn } = useAuth();

  const statsRef = useRef<HTMLDivElement>(null);
  const inView = useInView(statsRef, { once: true });

  // Redirect if already logged in
  useEffect(() => {
    if (isLoggedIn) {
      router.replace("/");
    }
  }, [isLoggedIn, router]);

  // Sends correct body to server
  const submitLogin = async (idToken: string, isGoogle = false) => {
    const body = {
      email: email.trim(),
      rememberMe,
      password: isGoogle ? "google-oauth" : password,
    };

    const res = await fetch("/api/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify(body),
      credentials: "include",
    });

    const data = await res.json();

    if (!res.ok) {
      const msg = data.error || "Login failed";
      setError(
        msg.includes("Account not registered")
          ? "Please sign up first."
          : msg
      );
      return;
    }

    router.push("/");
  };

  const handleEmailLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Email and password are required");
      return;
    }
    if (!validateEmail(email)) {
      setError("Invalid email format");
      return;
    }

    setLoginLoading(true);
    try {
      const { user } = await signInWithEmailAndPassword(auth, email, password);
      const idToken = await user.getIdToken();
      await submitLogin(idToken, false);
    } catch (err: any) {
      setError(err.message || "Login failed. Please try again.");
    } finally {
      setLoginLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError("");
    setGoogleLoading(true);

    try {
      googleProvider.setCustomParameters({ prompt: "select_account" });
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      const idToken = await user.getIdToken();
      await submitLogin(idToken, true);
    } catch (err: any) {
      setError(err.message || "Google login failed. Please try again.");
    } finally {
      setGoogleLoading(false);
    }
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
        className={`min-h-screen flex items-center justify-center p-6 ${
          theme === "light"
            ? "bg-linear-to-br from-indigo-50/50 via-purple-50/50 to-pink-50/50"
            : "bg-linear-to-br from-gray-900 via-purple-950 to-indigo-950"
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
              className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-linear-to-r from-indigo-500 to-purple-600 mb-4 shadow-lg"
            >
              <Lock className="w-8 h-8 text-white" />
            </motion.div>
            <h1 className={`text-3xl font-bold bg-clip-text text-transparent bg-linear-to-r ${
              theme === "light" ? "from-indigo-600 to-purple-600" : "from-indigo-400 to-purple-400"
            }`}>
              Welcome Back
            </h1>
            <p className={`mt-2 text-sm ${theme === "light" ? "text-gray-600" : "text-gray-400"}`}>
              Log in to continue
            </p>
          </div>

          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 dark:text-red-400 text-sm text-center backdrop-blur"
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleEmailLogin} className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="relative group"
            >
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-indigo-600 transition-colors" />
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`w-full pl-12 pr-4 py-4 rounded-xl border-2 transition-all backdrop-blur ${
                  theme === "light"
                    ? "bg-white/70 border-gray-200 focus:border-indigo-500"
                    : "bg-gray-700/70 border-gray-600 focus:border-purple-500 text-white"
                } outline-none focus:ring-2 focus:ring-indigo-500/20`}
                required
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="relative group"
            >
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-indigo-600 transition-colors" />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`w-full pl-12 pr-12 py-4 rounded-xl border-2 transition-all backdrop-blur ${
                  theme === "light"
                    ? "bg-white/70 border-gray-200 focus:border-indigo-500"
                    : "bg-gray-700/70 border-gray-600 focus:border-purple-500 text-white"
                } outline-none focus:ring-2 focus:ring-indigo-500/20`}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2"
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5 text-gray-400" />
                ) : (
                  <Eye className="w-5 h-5 text-gray-400" />
                )}
              </button>
            </motion.div>

            <div className="flex items-center justify-between">
              <label className="flex items-center space-x-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={() => setRememberMe(!rememberMe)}
                  className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500"
                />
                <span className={theme === "light" ? "text-gray-700" : "text-gray-300"}>
                  Remember me
                </span>
              </label>
              <Link
                href="/forgot-password"
                className="text-sm text-indigo-600 dark:text-indigo-400 font-medium hover:underline"
              >
                Forgot password?
              </Link>
            </div>

            <motion.button
              type="submit"
              disabled={loginLoading}
              className="w-full py-4 bg-linear-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-70 shadow-lg"
              whileHover={{ scale: loginLoading ? 1 : 1.02 }}
              whileTap={{ scale: loginLoading ? 1 : 0.98 }}
            >
              {loginLoading ? (
                <>
                  <Loader2 className="animate-spin h-5 w-5" />
                  Logging in...
                </>
              ) : (
                "Log In"
              )}
            </motion.button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300 dark:border-gray-600" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className={`${theme === "light" ? "bg-white/80 text-gray-500" : "bg-gray-800/80 text-gray-400"} px-2 backdrop-blur`}>
                Or
              </span>
            </div>
          </div>

          <motion.button
            onClick={handleGoogleLogin}
            disabled={googleLoading}
            className={`w-full py-4 border-2 rounded-xl font-medium flex items-center justify-center gap-3 transition-all backdrop-blur ${
              theme === "light"
                ? "border-gray-300 bg-white/70 hover:bg-white/90"
                : "border-gray-600 bg-gray-700/70 hover:bg-gray-600/90 text-white"
            }`}
            whileHover={googleLoading ? {} : { scale: 1.02 }}
            whileTap={googleLoading ? {} : { scale: 0.98 }}
          >
            {googleLoading ? (
              <>
                <Loader2 className="animate-spin h-5 w-5" />
                Signing in...
              </>
            ) : (
              <>
                <FcGoogle className="w-6 h-6" />
                Continue with Google
              </>
            )}
          </motion.button>

          <p className="mt-6 text-center text-sm">
            Don't have an account?{" "}
            <Link
              href="/register"
              className="text-indigo-600 dark:text-indigo-400 font-medium hover:underline"
            >
              Sign Up
            </Link>
          </p>
        </motion.div>

       
      </main>
    </>
  );
}