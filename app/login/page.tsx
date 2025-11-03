// app/login/page.tsx
"use client";

import { useState, useContext, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Mail, Lock, Eye, EyeOff } from "lucide-react";
import { motion } from "framer-motion";
import { ThemeContext } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { auth, googleProvider } from "../firebaseconfig";
import {
  signInWithPopup,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { FcGoogle } from "react-icons/fc";

interface ThemeContextType {
  theme: "light" | "dark";
}

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

  const themeContext = useContext(ThemeContext) as ThemeContextType;
  const { theme } = themeContext;
  const { isLoggedIn } = useAuth();

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

    // *** HIDE SPECIFIC ERROR FROM CONSOLE ***
    if (!res.ok) {
      const msg = data.error || "Login failed";
      // Only show user-friendly toast – never throw to console
      setError(
        msg.includes("Account not registered")
          ? "Please sign up first."
          : msg
      );
      return; // <-- stop here, no throw
    }

    router.push("/");
  };

  const handleEmailLogin = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
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
      const { user } = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
      const idToken = await user.getIdToken();

      await submitLogin(idToken, false);
    } catch (err: any) {
      console.error("Email login error:", err);
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
      console.error("Google login error:", err);
      setError(err.message || "Google login failed. Please try again.");
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <main
      className={`min-h-screen flex items-center justify-center p-6 ${
        theme === "light" ? "bg-zinc-100" : "bg-zinc-900"
      }`}
    >
      <motion.div
        className={`w-full max-w-md rounded-2xl shadow-lg overflow-hidden ${
          theme === "light"
            ? "bg-gradient-to-br from-blue-50 to-purple-50"
            : "bg-gradient-to-br from-gray-800 to-gray-900"
        }`}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="p-8">
          <h1
            className={`text-3xl font-bold text-center ${
              theme === "light" ? "text-zinc-800" : "text-zinc-100"
            } mb-6`}
          >
            Log In
          </h1>

          {error && (
            <motion.div
              className="mb-6 p-4 rounded-lg bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {error}
            </motion.div>
          )}

          <form onSubmit={handleEmailLogin} className="space-y-6">
            {/* ... all inputs unchanged ... */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <label className="block text-sm font-medium mb-1">Email</label>
              <div className="relative">
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`w-full p-3 pl-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                    theme === "light"
                      ? "bg-white border-gray-300"
                      : "bg-gray-700 border-gray-600 text-white"
                  }`}
                  required
                />
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <label className="block text-sm font-medium mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`w-full p-3 pl-10 pr-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                    theme === "light"
                      ? "bg-white border-gray-300"
                      : "bg-gray-700 border-gray-600 text-white"
                  }`}
                  required
                />
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5 text-gray-500" />
                  ) : (
                    <Eye className="w-5 h-5 text-gray-500" />
                  )}
                </button>
              </div>
            </motion.div>

            <div className="flex items-center justify-between">
              <label className="flex items-center space-x-2 text-sm">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={() => setRememberMe(!rememberMe)}
                  className="rounded"
                />
                <span>Remember me</span>
              </label>
              <Link
                href="/forgot-password"
                className="text-sm text-purple-600 hover:underline"
              >
                Forgot password?
              </Link>
            </div>

            <motion.button
              type="submit"
              disabled={loginLoading}
              className={`w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-semibold transition flex items-center justify-center gap-2 ${
                loginLoading ? "opacity-70 cursor-not-allowed" : "hover:shadow-lg"
              }`}
              whileHover={{ scale: loginLoading ? 1 : 1.02 }}
              whileTap={{ scale: loginLoading ? 1 : 0.98 }}
            >
              {loginLoading ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  Logging in...
                </>
              ) : (
                "Log In"
              )}
            </motion.button>
          </form>

          <div className="mt-6">
            <motion.button
              onClick={handleGoogleLogin}
              disabled={googleLoading}
              className={`w-full flex items-center justify-center gap-3 py-3 border rounded-lg font-medium transition ${
                googleLoading
                  ? "opacity-60 cursor-not-allowed"
                  : theme === "light"
                  ? "border-gray-300 bg-white hover:bg-gray-50"
                  : "border-gray-600 bg-gray-700 hover:bg-gray-600 text-white"
              }`}
              whileHover={googleLoading ? {} : { scale: 1.02 }}
            >
              {googleLoading ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  Signing in...
                </>
              ) : (
                <>
                  <FcGoogle size={22} />
                  Continue with Google
                </>
              )}
            </motion.button>
          </div>

          <p className="mt-6 text-center text-sm">
            Don't have an account?{" "}
            <Link
              href="/signup"
              className="text-purple-600 font-medium hover:underline"
            >
              Sign Up
            </Link>
          </p>
        </div>
      </motion.div>
    </main>
  );
}