// app/layout.tsx
import "./globals.css";
import ClientLayout from "./components/ClientLayout";
import BioHostLogo from "./asset/jobloggo.jpg";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="scroll-smooth antialiased">
      <head>
        <meta charSet="utf-8" />
        <title>Biruh Tutors – Premier Expert Tutors & Student Escrow Hub</title>
        <meta
          name="description"
          content="Connect with elite professional tutors, secure escrow bookings, and achieve academic excellence with Biruh Tutors."
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#f59e0b" />

        {/* Favicon */}
        <link rel="icon" href={BioHostLogo.src} />
        <link rel="apple-touch-icon" href={BioHostLogo.src} />
        <link rel="manifest" href="/manifest.json" />

        {/* Open Graph */}
        <meta property="og:title" content="Biruh Tutors – Expert Tutors & Student Hub" />
        <meta
          property="og:description"
          content="Connect with elite professional tutors and secure escrow bookings."
        />
        <meta property="og:image" content={BioHostLogo.src} />
        <meta property="og:url" content="https://biruhtutors.com" />
        <meta property="og:type" content="website" />

        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Biruh Tutors – Expert Tutors & Student Hub" />
        <meta name="twitter:image" content={BioHostLogo.src} />
      </head>

      <body suppressHydrationWarning={true}>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
