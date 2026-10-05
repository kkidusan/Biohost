// app/components/ClientLayout.tsx
"use client";

import React, { useEffect, useRef } from "react";
import { ThemeProvider, useTheme } from "../context/ThemeContext";
import { AuthProvider } from "../context/AuthContext";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Header from "./Header";

function NetworkStatus() {
  const { theme } = useTheme();
  const offlineToastId = useRef<string | number | null>(null);

  useEffect(() => {
    const handleOnline = () => {
      if (offlineToastId.current) {
        toast.dismiss(offlineToastId.current);
        offlineToastId.current = null;
      }
      toast.success("Back online! Your connection is restored.", {
        position: "top-right",
        autoClose: 3000,
        theme,
      });
    };

    const handleOffline = () => {
      if (!offlineToastId.current) {
        offlineToastId.current = toast.error(
          "You're offline. Check your internet connection.",
          {
            position: "top-right",
            autoClose: false,
            theme,
            toastId: "offline-toast",
          }
        );
      }
    };

    if (!navigator.onLine) handleOffline();

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      if (offlineToastId.current) toast.dismiss(offlineToastId.current);
    };
  }, [theme]);

  return null;
}

function AppContent({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();

  const themeClass =
    theme === "light"
      ? "bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 text-gray-900"
      : "bg-gradient-to-br from-gray-900 via-purple-900 to-blue-900 text-gray-100";

  return (
    <div className={`${themeClass} min-h-screen transition-all duration-300`}>
      <ToastContainer
        position="top-right"
        newestOnTop
        closeOnClick
        pauseOnFocusLoss
        draggable
        pauseOnHover
        toastClassName="border-l-4 border-gradient-to-r from-blue-500 to-purple-600 rounded-lg shadow-xl backdrop-blur-sm"
        progressClassName="h-1 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full"
        className="font-medium"
        theme={theme}
      />

      <NetworkStatus />
      <Header />

      <main className="mx-auto max-w-7xl" role="main">
        {children}
      </main>
    </div>
  );
}

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent>{children}</AppContent>
      </AuthProvider>
    </ThemeProvider>
  );
}
