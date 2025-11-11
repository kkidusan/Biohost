// app/not-found.tsx
"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, useInView } from "framer-motion";
import { Home, AlertCircle } from "lucide-react";
import { useTheme } from "../context/ThemeContext";

export default function NotFoundPage() {
  const router = useRouter();
  const [countdown, setCountdown] = useState(10);

  const { theme } = useTheme();
  const statsRef = useRef<HTMLDivElement>(null);
  const inView = useInView(statsRef, { once: true });

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    const timeout = setTimeout(() => {
      router.push("/");
    }, 10000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [router]);

  return (
    <>
      {/* Animated Background Blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <motion.div
          animate={{ x: [0, 120, 0], y: [0, -80, 0] }}
          transition={{ duration: 22, repeat: Infinity, ease: "linear" }}
          className="absolute top-10 left-10 w-96 h-96 bg-linear-to-br from-red-400/20 to-orange-500/20 rounded-full blur-3xl"
        />
        <motion.div
          animate={{ x: [0, -100, 0], y: [0, 100, 0] }}
          transition={{ duration: 28, repeat: Infinity, ease: "linear" }}
          className="absolute bottom-20 right-20 w-80 h-80 bg-linear-to-tr from-pink-400/20 to-rose-500/20 rounded-full blur-3xl"
        />
      </div>

      <main
        className={`min-h-screen flex items-center justify-center p-6 ${
          theme === "light"
            ? "bg-linear-to-br from-red-50/50 via-orange-50/50 to-pink-50/50"
            : "bg-linear-to-br from-gray-900 via-red-950 to-orange-950"
        }`}
      >
        <motion.div
          className={`w-full max-w-md rounded-3xl shadow-2xl p-10 backdrop-blur-2xl border border-white/30 dark:border-gray-700/50 ${
            theme === "light" ? "bg-white/80" : "bg-gray-800/80"
          }`}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          whileHover={{ y: -4, scale: 1.02 }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          {/* Glow Pulse Border */}
          <motion.div
            className="absolute inset-0 rounded-3xl border-2 border-red-500/40"
            animate={{ opacity: [0.3, 0.8, 0.3] }}
            transition={{ duration: 2, repeat: Infinity }}
            style={{ filter: "blur(8px)" }}
          />

          <div className="relative z-10 text-center">
            {/* 404 Icon */}
            <motion.div
              initial={{ y: -20 }}
              animate={{ y: 0 }}
              className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-linear-to-r from-red-500 to-orange-600 mb-6 shadow-lg"
            >
              <AlertCircle className="w-12 h-12 text-white" />
            </motion.div>

            {/* 404 Text */}
            <motion.h1
              className={`text-7xl font-extrabold bg-clip-text text-transparent bg-linear-to-r ${
                theme === "light" ? "from-red-600 to-orange-600" : "from-red-400 to-orange-400"
              }`}
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              404
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className={`mt-4 text-lg font-medium ${theme === "light" ? "text-gray-700" : "text-gray-200"}`}
            >
              Page Not Found
            </motion.p>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className={`mt-2 text-sm ${theme === "light" ? "text-gray-600" : "text-gray-400"}`}
            >
              The page you tried to access does not exist.
            </motion.p>

            {/* Countdown */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className={`mt-6 text-sm ${theme === "light" ? "text-gray-500" : "text-gray-400"}`}
            >
              Redirecting to homepage in{" "}
              <span className="font-bold text-red-600 dark:text-red-400 font-mono">
                {countdown}
              </span>{" "}
              seconds...
            </motion.p>

            {/* Progress Bar */}
            <div className="mt-4 w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: "100%" }}
                animate={{ width: "0%" }}
                transition={{ duration: 10, ease: "linear" }}
                className="h-full bg-linear-to-r from-red-500 to-orange-600"
              />
            </div>

            {/* CTA Button */}
            <motion.button
              onClick={() => router.push("/")}
              className="mt-8 w-full py-4 bg-linear-to-r from-red-600 to-orange-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 shadow-lg"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Home className="w-5 h-5" />
              Go Home Now
            </motion.button>
          </div>
        </motion.div>

      
      </main>
    </>
  );
}