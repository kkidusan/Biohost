// app/register/page.tsx
"use client";

import { useState, useEffect, useContext, useRef } from "react";
import { useRouter } from "next/navigation";
import { auth, googleProvider, db } from "../firebaseconfig";
import {
  signInWithPopup,
  fetchSignInMethodsForEmail,
  createUserWithEmailAndPassword,
} from "firebase/auth";
import { FcGoogle } from "react-icons/fc";
import {
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  Loader2,
  CheckCircle,
} from "lucide-react";
import { motion, AnimatePresence, useInView } from "framer-motion";
import { useTheme } from "../context/ThemeContext";
import zxcvbn from "zxcvbn";
import { query, collection, where, getDocs } from "firebase/firestore";

export default function RegisterPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const [stage, setStage] = useState<
    "email" | "otp" | "details" | "google-otp" | "google-details"
  >("email");

  // Manual flow
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Google flow
  const [googleEmail, setGoogleEmail] = useState("");
  const [googleName, setGoogleName] = useState("");
  const [googleOtp, setGoogleOtp] = useState("");

  // UI
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [registerLoading, setRegisterLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [error, setError] = useState("");
  const [passwordStrength, setPasswordStrength] = useState(0);

  const statsRef = useRef<HTMLDivElement>(null);
  const inView = useInView(statsRef, { once: true });

  // Password strength
  useEffect(() => {
    if (password) {
      const result = zxcvbn(password);
      setPasswordStrength(result.score);
    } else {
      setPasswordStrength(0);
    }
  }, [password]);

  // Resend timer
  useEffect(() => {
    if (resendTimer > 0) {
      const id = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(id);
    }
  }, [resendTimer]);

  const validateEmail = (email: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  // === SEND OTP (Manual or Google) ===
  const sendOtp = async (targetEmail: string, isGoogle = false) => {
    if (!validateEmail(targetEmail)) {
      setError("Invalid email");
      return;
    }
    setOtpLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: targetEmail }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      if (isGoogle) {
        setStage("google-otp");
      } else {
        setStage("otp");
      }
      setResendTimer(60);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setOtpLoading(false);
    }
  };

  // === VERIFY OTP (Manual or Google) ===
  const verifyOtp = async (targetEmail: string, otpValue: string, isGoogle = false) => {
    if (otpValue.length !== 6) {
      setError("Enter 6-digit OTP");
      return;
    }
    setVerifyLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: targetEmail, otp: otpValue }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      if (isGoogle) {
        setStage("google-details");
      } else {
        setStage("details");
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setVerifyLoading(false);
    }
  };

  // === FINAL REGISTER (Manual) ===
  const handleManualRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!fullName) return setError("Full name required");
    if (password !== confirmPassword) return setError("Passwords don't match");
    if (passwordStrength < 2) return setError("Password too weak");

    setRegisterLoading(true);
    try {
      const methods = await fetchSignInMethodsForEmail(auth, email);
      if (methods.length > 0) throw new Error("Email already registered");

      const q = query(collection(db, "customers"), where("email", "==", email));
      const snap = await getDocs(q);
      if (!snap.empty) throw new Error("Email in use");

      const cred = await createUserWithEmailAndPassword(auth, email, password);
      const idToken = await cred.user.getIdToken();

      const res = await fetch("/api/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ email, fullName }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Signup failed");

      router.push("/dashboard");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setRegisterLoading(false);
    }
  };

  // === GOOGLE SIGN IN + OTP ===
  const handleGoogle = async () => {
    setGoogleLoading(true);
    setError("");
    try {
      googleProvider.setCustomParameters({ prompt: "select_account" });
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      if (!user.email) throw new Error("No email from Google");

      const methods = await fetchSignInMethodsForEmail(auth, user.email);
      if (methods.length > 0) throw new Error("Email already registered");

      const q = query(collection(db, "customers"), where("email", "==", user.email));
      const snap = await getDocs(q);
      if (!snap.empty) throw new Error("Email in use");

      setGoogleEmail(user.email);
      setGoogleName(user.displayName || "");
      await sendOtp(user.email, true);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setGoogleLoading(false);
    }
  };

  // === FINAL GOOGLE REGISTER ===
  const handleGoogleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!googleName) return setError("Full name required");

    setRegisterLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("No user");

      const idToken = await user.getIdToken();
      const res = await fetch("/api/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ email: googleEmail, fullName: googleName }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Signup failed");

      router.push("/dashboard");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setRegisterLoading(false);
    }
  };

  return (
    <>
      {/* Animated Background Blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <motion.div
          animate={{ x: [0, 120, 0], y: [0, -80, 0] }}
          transition={{ duration: 22, repeat: Infinity, ease: "linear" }}
          className="absolute top-10 left-10 w-96 h-96 bg-gradient-to-br from-indigo-400/20 to-purple-500/20 rounded-full blur-3xl"
        />
        <motion.div
          animate={{ x: [0, -100, 0], y: [0, 100, 0] }}
          transition={{ duration: 28, repeat: Infinity, ease: "linear" }}
          className="absolute bottom-20 right-20 w-80 h-80 bg-gradient-to-tr from-pink-400/20 to-orange-500/20 rounded-full blur-3xl"
        />
      </div>

      <main
        className={`min-h-screen flex items-center justify-center p-6 ${
          theme === "light"
            ? "bg-gradient-to-br from-indigo-50/50 via-purple-50/50 to-pink-50/50"
            : "bg-gradient-to-br from-gray-900 via-purple-950 to-indigo-950"
        }`}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`w-full max-w-md rounded-3xl shadow-2xl p-8 backdrop-blur-2xl border border-white/30 dark:border-gray-700/50 ${
            theme === "light" ? "bg-white/80" : "bg-gray-800/80"
          }`}
          whileHover={{ y: -4, scale: 1.01 }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          <div className="text-center mb-8">
            <motion.div
              initial={{ y: -20 }}
              animate={{ y: 0 }}
              className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 mb-4 shadow-lg"
            >
              <Lock className="w-8 h-8 text-white" />
            </motion.div>
            <h1 className={`text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r ${
              theme === "light" ? "from-indigo-600 to-purple-600" : "from-indigo-400 to-purple-400"
            }`}>
              Create Account
            </h1>
            <p className={`mt-2 text-sm ${theme === "light" ? "text-gray-600" : "text-gray-400"}`}>
              Secure signup with OTP
            </p>
          </div>

          <AnimatePresence mode="wait">
            {/* === EMAIL STAGE (Manual) === */}
            {stage === "email" && (
              <motion.div
                key="email"
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 50 }}
                className="space-y-6"
              >
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-indigo-600 transition-colors" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className={`w-full pl-12 pr-4 py-4 rounded-xl border-2 transition-all backdrop-blur ${
                      theme === "light"
                        ? "bg-white/70 border-gray-200 focus:border-indigo-500"
                        : "bg-gray-700/70 border-gray-600 focus:border-purple-500 text-white"
                    } outline-none focus:ring-2 focus:ring-indigo-500/20`}
                  />
                </div>

                {error && (
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-red-500 text-sm text-center">
                    {error}
                  </motion.p>
                )}

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => sendOtp(email)}
                  disabled={otpLoading || !email}
                  className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-70 shadow-lg"
                >
                  {otpLoading ? <Loader2 className="animate-spin h-5 w-5" /> : "Send OTP"}
                </motion.button>

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
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleGoogle}
                  disabled={googleLoading}
                  className={`w-full py-4 border-2 rounded-xl font-medium flex items-center justify-center gap-3 transition-all backdrop-blur ${
                    theme === "light"
                      ? "border-gray-300 bg-white/70 hover:bg-white/90"
                      : "border-gray-600 bg-gray-700/70 hover:bg-gray-600/90 text-white"
                  }`}
                >
                  {googleLoading ? (
                    <Loader2 className="animate-spin h-5 w-5" />
                  ) : (
                    <>
                      <FcGoogle className="w-6 h-6" />
                      Continue with Google
                    </>
                  )}
                </motion.button>

                <p className="text-center text-sm">
                  Already have an account?{" "}
                  <a href="/login" className="text-indigo-600 dark:text-indigo-400 font-medium hover:underline">
                    Log in
                  </a>
                </p>
              </motion.div>
            )}

            {/* === OTP STAGE (Manual) === */}
            {stage === "otp" && (
              <motion.div
                key="otp"
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 50 }}
                className="space-y-6"
              >
                <div className="text-center">
                  <CheckCircle className="w-12 h-12 mx-auto text-green-500 mb-3" />
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    OTP sent to <strong>{email}</strong>
                  </p>
                </div>

                <input
                  type="text"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  placeholder="000000"
                  className="w-full text-center text-3xl font-mono tracking-widest py-4 rounded-xl border-2 border-gray-300 dark:border-gray-600 focus:border-indigo-500 outline-none backdrop-blur bg-white/70 dark:bg-gray-700/70"
                />

                {error && (
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-red-500 text-sm text-center">
                    {error}
                  </motion.p>
                )}

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => verifyOtp(email, otp)}
                  disabled={verifyLoading || otp.length !== 6}
                  className="w-full py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-70 shadow-lg"
                >
                  {verifyLoading ? <Loader2 className="animate-spin h-5 w-5" /> : "Verify OTP"}
                </motion.button>

                <p className="text-center text-sm">
                  {resendTimer > 0 ? (
                    `Resend in ${resendTimer}s`
                  ) : (
                    <button
                      onClick={() => sendOtp(email)}
                      className="text-indigo-600 dark:text-indigo-400 underline"
                      disabled={otpLoading}
                    >
                      Resend OTP
                    </button>
                  )}
                </p>
              </motion.div>
            )}

            {/* === DETAILS STAGE (Manual) === */}
            {stage === "details" && (
              <motion.form
                key="details"
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 50 }}
                onSubmit={handleManualRegister}
                className="space-y-5"
              >
                <div className="relative group">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-indigo-600 transition-colors" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Full Name"
                    className={`w-full pl-12 pr-4 py-4 rounded-xl border-2 transition-all backdrop-blur ${
                      theme === "light"
                        ? "bg-white/70 border-gray-200 focus:border-indigo-500"
                        : "bg-gray-700/70 border-gray-600 focus:border-purple-500 text-white"
                    } outline-none focus:ring-2 focus:ring-indigo-500/20`}
                  />
                </div>

                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-indigo-600 transition-colors" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                    className={`w-full pl-12 pr-12 py-4 rounded-xl border-2 transition-all backdrop-blur ${
                      theme === "light"
                        ? "bg-white/70 border-gray-200 focus:border-indigo-500"
                        : "bg-gray-700/70 border-gray-600 focus:border-purple-500 text-white"
                    } outline-none focus:ring-2 focus:ring-indigo-500/20`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5 text-gray-400" /> : <Eye className="w-5 h-5 text-gray-400" />}
                  </button>
                </div>

                {password && (
                  <div className="space-y-1">
                    <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(passwordStrength + 1) * 25}%` }}
                        className={`h-full transition-all ${
                          passwordStrength <= 1
                            ? "bg-red-500"
                            : passwordStrength === 2
                            ? "bg-yellow-500"
                            : passwordStrength === 3
                            ? "bg-blue-500"
                            : "bg-green-500"
                        }`}
                      />
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {["Too weak", "Weak", "Fair", "Good", "Strong"][passwordStrength]}
                    </p>
                  </div>
                )}

                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-indigo-600 transition-colors" />
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm Password"
                    className={`w-full pl-12 pr-12 py-4 rounded-xl border-2 transition-all backdrop-blur ${
                      theme === "light"
                        ? "bg-white/70 border-gray-200 focus:border-indigo-500"
                        : "bg-gray-700/70 border-gray-600 focus:border-purple-500 text-white"
                    } outline-none focus:ring-2 focus:ring-indigo-500/20`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2"
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5 text-gray-400" /> : <Eye className="w-5 h-5 text-gray-400" />}
                  </button>
                </div>

                {error && (
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-red-500 text-sm text-center">
                    {error}
                  </motion.p>
                )}

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={registerLoading}
                  className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-70 shadow-lg"
                >
                  {registerLoading ? <Loader2 className="animate-spin h-5 w-5" /> : "Create Account"}
                </motion.button>
              </motion.form>
            )}

            {/* === GOOGLE OTP STAGE === */}
            {stage === "google-otp" && (
              <motion.div
                key="google-otp"
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 50 }}
                className="space-y-6"
              >
                <div className="text-center">
                  <CheckCircle className="w-12 h-12 mx-auto text-green-500 mb-3" />
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    OTP sent to <strong>{googleEmail}</strong>
                  </p>
                </div>

                <input
                  type="text"
                  maxLength={6}
                  value={googleOtp}
                  onChange={(e) => setGoogleOtp(e.target.value.replace(/\D/g, ""))}
                  placeholder="000000"
                  className="w-full text-center text-3xl font-mono tracking-widest py-4 rounded-xl border-2 border-gray-300 dark:border-gray-600 focus:border-indigo-500 outline-none backdrop-blur bg-white/70 dark:bg-gray-700/70"
                />

                {error && (
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-red-500 text-sm text-center">
                    {error}
                  </motion.p>
                )}

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => verifyOtp(googleEmail, googleOtp, true)}
                  disabled={verifyLoading || googleOtp.length !== 6}
                  className="w-full py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-70 shadow-lg"
                >
                  {verifyLoading ? <Loader2 className="animate-spin h-5 w-5" /> : "Verify OTP"}
                </motion.button>

                <p className="text-center text-sm">
                  {resendTimer > 0 ? (
                    `Resend in ${resendTimer}s`
                  ) : (
                    <button
                      onClick={() => sendOtp(googleEmail, true)}
                      className="text-indigo-600 dark:text-indigo-400 underline"
                      disabled={otpLoading}
                    >
                      Resend OTP
                    </button>
                  )}
                </p>
              </motion.div>
            )}

            {/* === GOOGLE DETAILS STAGE === */}
            {stage === "google-details" && (
              <motion.form
                key="google-details"
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 50 }}
                onSubmit={handleGoogleRegister}
                className="space-y-6"
              >
                <div className="text-center mb-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Email: <strong>{googleEmail}</strong>
                  </p>
                </div>

                <div className="relative group">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-indigo-600 transition-colors" />
                  <input
                    type="text"
                    value={googleName}
                    onChange={(e) => setGoogleName(e.target.value)}
                    placeholder="Edit your name"
                    className={`w-full pl-12 pr-4 py-4 rounded-xl border-2 transition-all backdrop-blur ${
                      theme === "light"
                        ? "bg-white/70 border-gray-200 focus:border-indigo-500"
                        : "bg-gray-700/70 border-gray-600 focus:border-purple-500 text-white"
                    } outline-none focus:ring-2 focus:ring-indigo-500/20`}
                  />
                </div>

                {error && (
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-red-500 text-sm text-center">
                    {error}
                  </motion.p>
                )}

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={registerLoading}
                  className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-70 shadow-lg"
                >
                  {registerLoading ? <Loader2 className="animate-spin h-5 w-5" /> : "Complete Signup"}
                </motion.button>
              </motion.form>
            )}
          </AnimatePresence>
        </motion.div>

        
      
      </main>
    </>
  );
}