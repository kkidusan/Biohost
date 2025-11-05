// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Recommended: Disable Turbopack in production (it's experimental)
  // Remove --turbopack from build command in package.json instead
  // turbopack: false, // not needed

  // Fix non-standard NODE_ENV warning
  // Netlify sets NODE_ENV=production, but Next.js warns if it's not exactly "production"
  // This is safe to ignore, but you can silence it:
  // (Not needed — just don't set NODE_ENV manually)

  // Ensure output is compatible with Netlify
  output: "standalone", // Optional: smaller deploy, faster cold starts

  // Improve caching on Netlify
  generateBuildId: async () => {
    // Use commit SHA or timestamp
    return process.env.VERCEL_GIT_COMMIT_SHA || `build-${Date.now()}`;
  },

  // Optional: Add trailing slash for better routing
  trailingSlash: true,

  // Optional: Improve image handling
  images: {
    unoptimized: true, // Use if not using next/image with Netlify Image CDN
  },
};

export default nextConfig;