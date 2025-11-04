// app/notfound/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Home, AlertCircle } from "lucide-react";

export default function NotFoundPage() {
  const router = useRouter();
  const [seconds, setSeconds] = useState(10);

  // Countdown
  useEffect(() => {
    if (seconds <= 0) {
      router.push("/");
      return;
    }
    const id = setInterval(() => setSeconds((s) => s - 1), 1000);
    return () => clearInterval(id);
  }, [seconds, router]);

  // Auto-redirect after 10 s (backup)
  useEffect(() => {
    const id = setTimeout(() => router.push("/"), 10_000);
    return () => clearTimeout(id);
  }, [router]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative w-full max-w-md"
      >
        {/* subtle glow */}
        <div className="absolute inset-0 -z-10 blur-3xl">
          <div className="absolute inset-0 bg-gradient-to-r from-red-600 to-purple-600 opacity-50 animate-pulse" />
        </div>

        <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/20">
          {/* Icon */}
          <motion.div
            initial={{ y: -20 }}
            animate={{ y: 0 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="flex justify-center mb-6"
          >
            <div className="relative">
              <AlertCircle className="w-20 h-20 text-red-500 drop-shadow-lg" />
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 -m-4 border-4 border-dashed border-red-400/30 rounded-full"
              />
            </div>
          </motion.div>

          {/* 404 */}
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-6xl font-bold text-white mb-3 tracking-tighter"
          >
            404
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-lg text-white/80 mb-4 font-medium"
          >
            Page Not Found
          </motion.p>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-sm text-white/60 mb-8 leading-relaxed"
          >
            The page you’re looking for doesn’t exist or has been moved.
            <br />
            You’ll be redirected to the homepage in{" "}
            <span className="font-bold text-white">{seconds}</span>{" "}
            second{seconds !== 1 ? "s" : ""}.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="flex justify-center"
          >
            <button
              onClick={() => router.push("/")}
              className="group flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-red-500 to-purple-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 focus:outline-none focus:ring-4 focus:ring-red-500/50"
              aria-label="Go to homepage"
            >
              <Home className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
              Go Home Now
            </button>
          </motion.div>
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-6 text-center text-white/40 text-xs"
        >
          © {new Date().getFullYear()} Your App Name. All rights reserved.
        </motion.p>
      </motion.div>
    </div>
  );
}