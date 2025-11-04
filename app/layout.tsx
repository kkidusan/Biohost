// app/layout.tsx
"use client";

import "./globals.css";
import { ThemeProvider, useTheme } from "./context/ThemeContext";
import { AuthProvider } from "./context/AuthContext";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Header from "./components/Header";
import BioHostLogo from "./asset/jobs.jpg"; // ✅ Your imported logo image

// === Network Status ===
function NetworkStatus() {
  const { theme } = useTheme();
  let isOffline = false;

  const goOnline = () => {
    if (!isOffline) return;
    isOffline = false;
    toast.dismiss("offline");
    toast.success("Back online!", { autoClose: 2000, theme });
  };

  const goOffline = () => {
    if (isOffline) return;
    isOffline = true;
    toast.error("You're offline. Check your connection.", {
      toastId: "offline",
      autoClose: false,
      theme,
    });
  };

  if (typeof window !== "undefined") {
    if (!navigator.onLine) goOffline();
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
  }

  return null;
}

// === App Wrapper ===
function AppWrapper({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();

  const bgClass =
    theme === "light"
      ? "bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 text-gray-900"
      : "bg-gradient-to-br from-gray-900 via-purple-900 to-blue-900 text-gray-100";

  return (
    <div className={`${bgClass} min-h-screen transition-colors duration-300`}>
      <ToastContainer
        position="top-right"
        autoClose={5000}
        newestOnTop
        closeOnClick
        pauseOnHover
        theme={theme}
        toastClassName="border-l-4 border-blue-500 rounded-lg shadow-lg"
        progressClassName="h-1 bg-gradient-to-r from-blue-500 to-purple-600"
      />

      <NetworkStatus />
      <Header />

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      <footer className="border-t border-white/20 dark:border-gray-700 mt-16 py-8 text-center">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          © {new Date().getFullYear()} BioHost. Preserving legacies.
        </p>
      </footer>
    </div>
  );
}

// === Root Layout ===
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="scroll-smooth antialiased">
      <head>
        {/* === Meta and SEO === */}
        <title>BioHost - Create & Share Your Life Story</title>
        <meta
          name="description"
          content="Craft, host, and share beautiful biographies. Trusted by storytellers worldwide."
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#6366f1" />

        {/* === ✅ Custom Logo Icons (like your example) === */}
        <link rel="icon" type="image/png" sizes="32x32" href={BioHostLogo.src} />
        <link rel="icon" type="image/png" sizes="16x16" href={BioHostLogo.src} />
        <link rel="apple-touch-icon" sizes="180x180" href={BioHostLogo.src} />
        <link rel="manifest" href="/manifest.json" />

        {/* === Open Graph (for previews) === */}
        <meta property="og:title" content="BioHost – Your Life Story, Beautifully Hosted" />
        <meta property="og:description" content="Securely host and share your biography." />
        <meta property="og:image" content={BioHostLogo.src} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://biohost.com" />

        {/* === Twitter Card === */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="BioHost – Host Your Legacy" />
        <meta name="twitter:description" content="Professional biographies, secure hosting." />
        <meta name="twitter:image" content={BioHostLogo.src} />

        <link rel="canonical" href="https://biohost.com" />
      </head>

      <body>
        <ThemeProvider>
          <AuthProvider>
            <AppWrapper>{children}</AppWrapper>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
