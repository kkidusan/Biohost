"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

export default function NotFoundPage() {
  const router = useRouter();
  const [countdown, setCountdown] = useState(10);

  useEffect(() => {
    // countdown timer
    const interval = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    // redirect when finished
    const timeout = setTimeout(() => {
      router.push("/");
    }, 10000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [router]);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-white dark:bg-zinc-900 rounded-2xl p-10 shadow-2xl text-center max-w-md w-full mx-4 relative"
        >
          {/* Glow pulse effect */}
          <motion.div
            className="absolute inset-0 rounded-2xl border-2 border-red-500/40"
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 2, repeat: Infinity }}
          />

          <h1 className="text-6xl font-extrabold text-red-500 mb-4 animate-bounce relative z-10">
            404
          </h1>

          <p className="text-lg text-zinc-700 dark:text-zinc-200 mb-6 relative z-10">
            The page you tried to access does not exist.
          </p>

          <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-2 relative z-10">
            Redirecting to homepage in <span className="font-bold">{countdown}</span> seconds...
          </p>

          {/* Progress bar */}
          <div className="w-full h-2 bg-zinc-300 dark:bg-zinc-700 rounded-full mb-6 overflow-hidden relative z-10">
            <motion.div
              initial={{ width: "100%" }}
              animate={{ width: "0%" }}
              transition={{ duration: 10, ease: "linear" }}
              className="h-full bg-red-500"
            />
          </div>

          <button
            onClick={() => router.push("/")}
            className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold shadow-lg transition-all duration-300 hover:scale-105 relative z-10"
          >
            Go Home Now
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
