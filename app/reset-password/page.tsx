// app/reset-password/page.tsx
"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { auth } from "../firebaseconfig";
import { verifyPasswordResetCode, confirmPasswordReset } from "firebase/auth";
import { Loader2, Lock, Eye, EyeOff } from "lucide-react";
import zxcvbn from "zxcvbn";

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

  // Verify oobCode on load
  useState(() => {
    if (!oobCode) {
      setError("Invalid reset link");
      return;
    }

    verifyPasswordResetCode(auth, oobCode)
      .then((email) => {
        setEmail(email);
        setVerified(true);
      })
      .catch(() => {
        setError("Invalid or expired reset link");
      });
  });

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) return setError("Passwords don't match");
    if (zxcvbn(password).score < 2) return setError("Password too weak");

    setLoading(true);
    try {
      await confirmPasswordReset(auth, oobCode!, password);
      router.push("/login?reset=success");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  if (!verified) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          {loading ? <Loader2 className="animate-spin w-8 h-8" /> : <p className="text-red-500">{error}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-red-50 to-pink-50">
      <form onSubmit={handleReset} className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-8">
        <h1 className="text-2xl font-bold text-center mb-6">Set New Password</h1>
        <p className="text-sm text-center text-gray-600 mb-6">for <strong>{email}</strong></p>

        <div className="space-y-4">
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type={showPass ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="New Password"
              className="w-full pl-12 pr-12 py-4 rounded-xl border-2 border-gray-200 focus:border-red-500 outline-none"
            />
            <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-4 top-1/2 -translate-y-1/2">
              {showPass ? <EyeOff /> : <Eye />}
            </button>
          </div>

          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type={showConfirm ? "text" : "password"}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Confirm Password"
              className="w-full pl-12 pr-12 py-4 rounded-xl border-2 border-gray-200 focus:border-red-500 outline-none"
            />
            <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-4 top-1/2 -translate-y-1/2">
              {showConfirm ? <EyeOff /> : <Eye />}
            </button>
          </div>

          {error && <p className="text-red-500 text-sm text-center">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-gradient-to-r from-red-600 to-pink-600 text-white rounded-xl font-semibold flex justify-center gap-2 disabled:opacity-70"
          >
            {loading ? <Loader2 className="animate-spin" /> : "Reset Password"}
          </button>
        </div>
      </form>
    </div>
  );
}