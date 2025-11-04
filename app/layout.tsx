"use client";

import { useEffect, useRef } from "react";
import { ThemeProvider, useTheme } from "./context/ThemeContext";
import { AuthProvider } from "./context/AuthContext";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./globals.css";
import Header from "./components/Header";
import BioHostLogo from "./asset/jobloggo.jpg"; // Renamed from jobloggo.jpg

// Type for RootLayout props
type RootLayoutProps = {
  children: React.ReactNode;
};

// Network detection using useTheme
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

// AppContent uses useTheme for dynamic class
function AppContent({ children }: RootLayoutProps) {
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

      {/* No padding — content takes full width */}
      <main className="mx-auto max-w-7xl" role="main">
        {children}
      </main>

      <footer className="border-t border-white/20 dark:border-gray-800 mt-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            © {new Date().getFullYear()} BioHost. Preserving legacies, one story at a time.
          </p>
        </div>
      </footer>
    </div>
  );
}

// FINAL RootLayout: Wraps Providers correctly
export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" className="scroll-smooth antialiased">
      <head>
        {/* Primary Meta Tags */}
        <title>BioHost – Create, Host & Share Your Life Story Online</title>
        <meta
          name="description"
          content="Craft beautiful biographies, host them securely, and share your legacy with the world. Trusted by 3,200+ storytellers."
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#6366f1" />

        {/* Favicon */}
        <link rel="icon" type="image/png" sizes="32x32" href={BioHostLogo.src} />
        <link rel="icon" type="image/png" sizes="16x16" href={BioHostLogo.src} />
        <link rel="apple-touch-icon" sizes="180x180" href={BioHostLogo.src} />
        <link rel="manifest" href="/manifest.json" />

        {/* Open Graph / Social Sharing */}
        <meta property="og:title" content="BioHost – Your Life Story, Beautifully Hosted" />
        <meta
          property="og:description"
          content="Create, customize, and securely host your biography. Share your legacy with family, friends, and the world."
        />
        <meta property="og:image" content={BioHostLogo.src} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:url" content="https://biohost.com" />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="BioHost" />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="BioHost – Host Your Life Story Online" />
        <meta
          name="twitter:description"
          content="Professional biographies with secure hosting, customization, and easy sharing."
        />
        <meta name="twitter:image" content={BioHostLogo.src} />

        {/* Canonical */}
        <link rel="canonical" href="https://biohost.com" />
      </head>

      <body className="bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-purple-900 dark:to-blue-900 transition-all duration-500">
        <ThemeProvider>
          <AuthProvider>
            <AppContent>{children}</AppContent>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}