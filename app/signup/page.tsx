// app/signup/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { auth, googleProvider, db, formatFirebaseError } from "../firebaseconfig";
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
  BookOpen,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import zxcvbn from "zxcvbn";
import { query, collection, where, getDocs, doc, setDoc } from "firebase/firestore";

export default function RegisterPage() {
  const router = useRouter();
  const [stage, setStage] = useState<
    "email" | "otp" | "details" | "google-otp" | "google-details"
  >("email");
  const [role, setRole] = useState<"student" | "tutor">("student");

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
      const uid = cred.user.uid;

      await setDoc(doc(db, "customers", uid), {
        email: email.trim(),
        fullName: fullName.trim(),
        role,
        createdAt: new Date().toISOString(),
      }, { merge: true });

      router.push("/onboarding");
    } catch (e: any) {
      setError(formatFirebaseError(e));
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
      const uid = user.uid;

      await setDoc(doc(db, "customers", uid), {
        email: googleEmail.trim(),
        fullName: googleName.trim(),
        role,
        createdAt: new Date().toISOString(),
      }, { merge: true });

      router.push("/onboarding");
    } catch (e: any) {
      setError(formatFirebaseError(e));
    } finally {
      setRegisterLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 font-sans selection:bg-amber-500 selection:text-stone-950 flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md p-8"
      >
        <div className="text-center mb-8 space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 mb-2 shadow-lg">
            <Lock className="w-7 h-7" />
          </div>
          <h1 className="text-3xl font-serif font-bold text-white">Create Account</h1>
          <p className="text-stone-400 text-sm font-light">
            Secure verification with OTP & Escrow
          </p>
        </div>

        <AnimatePresence mode="wait">
          {/* === EMAIL STAGE (Manual) === */}
          {stage === "email" && (
            <motion.div
              key="email"
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 30 }}
              className="space-y-6"
            >
              <div>
                <label className="block text-xs uppercase tracking-wider text-stone-400 font-semibold mb-2">
                  I want to register as <span className="text-amber-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setRole("student")}
                    className={`py-3 px-4 rounded-xl border-2 text-sm font-semibold flex items-center justify-center gap-2 transition ${
                      role === "student"
                        ? "border-amber-500 bg-amber-500/10 text-amber-400 shadow-lg"
                        : "border-stone-800 bg-stone-900 text-stone-400 hover:text-white"
                    }`}
                  >
                    <User className="w-4 h-4" />
                    Student
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole("tutor")}
                    className={`py-3 px-4 rounded-xl border-2 text-sm font-semibold flex items-center justify-center gap-2 transition ${
                      role === "tutor"
                        ? "border-amber-500 bg-amber-500/10 text-amber-400 shadow-lg"
                        : "border-stone-800 bg-stone-900 text-stone-400 hover:text-white"
                    }`}
                  >
                    <BookOpen className="w-4 h-4" />
                    Tutor
                  </button>
                </div>
              </div>

              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full pl-12 pr-4 py-3.5 bg-stone-900 border border-stone-800 rounded-xl text-sm text-stone-200 focus:outline-none focus:border-amber-500 transition"
                />
              </div>

              {error && (
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-red-400 text-xs text-center">
                  {error}
                </motion.p>
              )}

              <button
                onClick={() => sendOtp(email)}
                disabled={otpLoading || !email}
                className="w-full py-4 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl transition shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 text-sm disabled:opacity-70"
              >
                {otpLoading ? <Loader2 className="animate-spin h-5 w-5" /> : "Send Verification OTP"}
              </button>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-stone-800" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-stone-950 px-3 text-stone-500 font-semibold tracking-wider">
                    Or
                  </span>
                </div>
              </div>

              <button
                onClick={handleGoogle}
                disabled={googleLoading}
                className="w-full py-3.5 bg-stone-900 border border-stone-800 hover:border-amber-500 text-stone-200 rounded-xl font-medium flex items-center justify-center gap-3 transition text-sm"
              >
                {googleLoading ? (
                  <Loader2 className="animate-spin h-5 w-5" />
                ) : (
                  <>
                    <FcGoogle className="w-5 h-5" />
                    Continue with Google
                  </>
                )}
              </button>

              <p className="text-center text-xs text-stone-400">
                Already have an account?{" "}
                <Link href="/login" className="text-amber-400 font-bold hover:underline">
                  Log in
                </Link>
              </p>
            </motion.div>
          )}

          {/* === OTP STAGE (Manual) === */}
          {stage === "otp" && (
            <motion.div
              key="otp"
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 30 }}
              className="space-y-6 text-center"
            >
              <div className="space-y-2">
                <CheckCircle className="w-12 h-12 mx-auto text-amber-400 mb-2" />
                <p className="text-sm text-stone-300">
                  Enter the 6-digit verification code sent to <strong className="text-white">{email}</strong>
                </p>
              </div>

              <input
                type="text"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                placeholder="000000"
                className="w-full text-center text-3xl font-mono tracking-widest py-4 bg-stone-900 border border-stone-800 rounded-xl text-amber-400 focus:outline-none focus:border-amber-500"
              />

              {error && (
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-red-400 text-xs">
                  {error}
                </motion.p>
              )}

              <button
                onClick={() => verifyOtp(email, otp)}
                disabled={verifyLoading || otp.length !== 6}
                className="w-full py-4 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl transition shadow-lg text-sm disabled:opacity-70 flex items-center justify-center gap-2"
              >
                {verifyLoading ? <Loader2 className="animate-spin h-5 w-5" /> : "Verify OTP"}
              </button>

              <p className="text-xs text-stone-400">
                {resendTimer > 0 ? (
                  `Resend code in ${resendTimer}s`
                ) : (
                  <button
                    onClick={() => sendOtp(email)}
                    className="text-amber-400 underline font-medium"
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
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 30 }}
              onSubmit={handleManualRegister}
              className="space-y-4"
            >
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-500" />
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Full Name"
                  className="w-full pl-12 pr-4 py-3.5 bg-stone-900 border border-stone-800 rounded-xl text-sm text-stone-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-500" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  className="w-full pl-12 pr-12 py-3.5 bg-stone-900 border border-stone-800 rounded-xl text-sm text-stone-200 focus:outline-none focus:border-amber-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-300"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              {password && (
                <div className="space-y-1">
                  <div className="h-1.5 bg-stone-800 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(passwordStrength + 1) * 25}%` }}
                      className={`h-full transition-all ${
                        passwordStrength <= 1 ? "bg-red-500" : passwordStrength === 2 ? "bg-yellow-500" : "bg-amber-500"
                      }`}
                    />
                  </div>
                  <p className="text-[10px] text-stone-400">
                    Strength: {["Too weak", "Weak", "Fair", "Good", "Strong"][passwordStrength]}
                  </p>
                </div>
              )}

              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-500" />
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm Password"
                  className="w-full pl-12 pr-12 py-3.5 bg-stone-900 border border-stone-800 rounded-xl text-sm text-stone-200 focus:outline-none focus:border-amber-500"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-300"
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              {error && (
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-red-400 text-xs text-center">
                  {error}
                </motion.p>
              )}

              <button
                type="submit"
                disabled={registerLoading}
                className="w-full py-4 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl transition shadow-lg text-sm disabled:opacity-70 flex items-center justify-center gap-2"
              >
                {registerLoading ? <Loader2 className="animate-spin h-5 w-5" /> : "Complete Account Creation"}
              </button>
            </motion.form>
          )}

          {/* === GOOGLE OTP STAGE === */}
          {stage === "google-otp" && (
            <motion.div
              key="google-otp"
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 30 }}
              className="space-y-6 text-center"
            >
              <div className="space-y-2">
                <CheckCircle className="w-12 h-12 mx-auto text-amber-400 mb-2" />
                <p className="text-sm text-stone-300">
                  Enter verification OTP sent to <strong className="text-white">{googleEmail}</strong>
                </p>
              </div>

              <input
                type="text"
                maxLength={6}
                value={googleOtp}
                onChange={(e) => setGoogleOtp(e.target.value.replace(/\D/g, ""))}
                placeholder="000000"
                className="w-full text-center text-3xl font-mono tracking-widest py-4 bg-stone-900 border border-stone-800 rounded-xl text-amber-400 focus:outline-none focus:border-amber-500"
              />

              {error && (
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-red-400 text-xs">
                  {error}
                </motion.p>
              )}

              <button
                onClick={() => verifyOtp(googleEmail, googleOtp, true)}
                disabled={verifyLoading || googleOtp.length !== 6}
                className="w-full py-4 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl transition shadow-lg text-sm disabled:opacity-70 flex items-center justify-center gap-2"
              >
                {verifyLoading ? <Loader2 className="animate-spin h-5 w-5" /> : "Verify Google OTP"}
              </button>
            </motion.div>
          )}

          {/* === GOOGLE DETAILS STAGE === */}
          {stage === "google-details" && (
            <motion.form
              key="google-details"
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 30 }}
              onSubmit={handleGoogleRegister}
              className="space-y-6"
            >
              <div className="text-center mb-2">
                <p className="text-xs text-stone-400">
                  Email: <strong className="text-stone-200">{googleEmail}</strong>
                </p>
              </div>

              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-500" />
                <input
                  type="text"
                  value={googleName}
                  onChange={(e) => setGoogleName(e.target.value)}
                  placeholder="Full Name"
                  className="w-full pl-12 pr-4 py-3.5 bg-stone-900 border border-stone-800 rounded-xl text-sm text-stone-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              {error && (
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-red-400 text-xs text-center">
                  {error}
                </motion.p>
              )}

              <button
                type="submit"
                disabled={registerLoading}
                className="w-full py-4 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl transition shadow-lg text-sm disabled:opacity-70 flex items-center justify-center gap-2"
              >
                {registerLoading ? <Loader2 className="animate-spin h-5 w-5" /> : "Complete Google Signup"}
              </button>
            </motion.form>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
