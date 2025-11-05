// app/layout.tsx
"use client"


import "./globals.css";
import { ThemeProvider, useTheme } from "./context/ThemeContext";
import { AuthProvider } from "./context/AuthContext";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Header from "./components/Header";
import BioHostLogo from "./asset/jobloggo.jpg";
import { useEffect, useRef } from "react";

// ——————————————————————
// Network Status Component
// ——————————————————————
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

// ——————————————————————
// App Content with Theme
// ——————————————————————
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

// ——————————————————————
// Root Layout (App Router)
// ——————————————————————
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="scroll-smooth antialiased">
      <head>
        <meta charSet="utf-8" />
        <title>BioHost – Create, Host & Share Your Life Story Online</title>
        <meta
          name="description"
          content="Craft beautiful biographies, host them securely, and share your legacy with the world. Trusted by 3,200+ storytellers."
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#6366f1" />

        {/* Favicon */}
        <link rel="icon" href={BioHostLogo.src} />
        <link rel="apple-touch-icon" href={BioHostLogo.src} />
        <link rel="manifest" href="/manifest.json" />

        {/* Open Graph */}
        <meta property="og:title" content="BioHost – Your Life Story, Beautifully Hosted" />
        <meta
          property="og:description"
          content="Create, customize, and securely host your biography. Share your legacy with family, friends, and the world."
        />
        <meta property="og:image" content={BioHostLogo.src} />
        <meta property="og:url" content="https://biohost.com" />
        <meta property="og:type" content="website" />

        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="BioHost – Host Your Life Story Online" />
        <meta name="twitter:image" content={BioHostLogo.src} />
      </head>

      <body>
        <ThemeProvider>
          <AuthProvider>
            <AppContent>{children}</AppContent>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
} 