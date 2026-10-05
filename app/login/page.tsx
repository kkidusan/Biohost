// app/login/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Mail, Lock, Eye, EyeOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import { auth, googleProvider, formatFirebaseError } from "../firebaseconfig";
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

  const { isLoggedIn, user } = useAuth();

  // Redirect if already logged in
  useEffect(() => {
    if (isLoggedIn && user) {
      if (user.role === "admin") {
        router.replace("/admin/dashboard");
      } else if (user.role === "tutor") {
        router.replace("/tutor/dashboard");
      } else {
        router.replace("/student/dashboard");
      }
    }
  }, [isLoggedIn, user, router]);

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

    if (data.role === "admin") {
      router.push("/admin/dashboard");
    } else if (data.role === "tutor") {
      router.push("/tutor/dashboard");
    } else {
      router.push("/student/dashboard");
    }
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
      setError(formatFirebaseError(err));
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
      setError(formatFirebaseError(err));
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 font-sans selection:bg-amber-500 selection:text-stone-950 flex items-center justify-center p-6">
      <motion.div
        className="w-full max-w-md bg-stone-900 border border-stone-800 rounded-3xl shadow-2xl p-8 backdrop-blur-2xl"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 300 }}
      >
        <div className="text-center mb-8 space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 mb-2 shadow-lg">
            <Lock className="w-7 h-7" />
          </div>
          <h1 className="text-3xl font-serif font-bold text-white">Welcome Back</h1>
          <p className="text-stone-400 text-sm font-light">
            Log in to your Biruh Tutors account
          </p>
        </div>

        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm text-center"
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleEmailLogin} className="space-y-5">
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-500" />
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-12 pr-4 py-3.5 bg-stone-950 border border-stone-800 rounded-xl text-sm text-stone-200 focus:outline-none focus:border-amber-500 transition"
              required
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-500" />
            <input
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-12 pr-12 py-3.5 bg-stone-950 border border-stone-800 rounded-xl text-sm text-stone-200 focus:outline-none focus:border-amber-500 transition"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-300"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>

          <div className="flex items-center justify-between text-xs">
            <label className="flex items-center space-x-2 text-stone-400 cursor-pointer">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={() => setRememberMe(!rememberMe)}
                className="w-4 h-4 rounded border-stone-700 bg-stone-950 text-amber-500 focus:ring-amber-500 accent-amber-500"
              />
              <span>Remember me</span>
            </label>
            <Link
              href="/forgot-password"
              className="text-amber-400 hover:underline font-medium"
            >
              Forgot password?
            </Link>
          </div>

          <button
            type="submit"
            disabled={loginLoading}
            className="w-full py-4 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl transition shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 text-sm disabled:opacity-70"
          >
            {loginLoading ? (
              <>
                <Loader2 className="animate-spin h-5 w-5" />
                Logging in...
              </>
            ) : (
              "Log In"
            )}
          </button>
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-stone-800" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-stone-900 px-3 text-stone-500 font-semibold tracking-wider">
              Or
            </span>
          </div>
        </div>

        <button
          onClick={handleGoogleLogin}
          disabled={googleLoading}
          className="w-full py-3.5 bg-stone-950 border border-stone-800 hover:border-amber-500 text-stone-200 rounded-xl font-medium flex items-center justify-center gap-3 transition text-sm"
        >
          {googleLoading ? (
            <>
              <Loader2 className="animate-spin h-5 w-5" />
              Signing in...
            </>
          ) : (
            <>
              <FcGoogle className="w-5 h-5" />
              Continue with Google
            </>
          )}
        </button>

        <p className="mt-8 text-center text-xs text-stone-400">
          Don't have an account?{" "}
          <Link
            href="/signup"
            className="text-amber-400 font-bold hover:underline"
          >
            Sign Up
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
