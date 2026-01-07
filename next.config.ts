import type { NextConfig } from "next";

// For Capacitor builds, we need static export
// But this CRM has API routes, so for mobile we use remote URL mode
const isCapacitorBuild = process.env.CAPACITOR_BUILD === "true";

// Security headers for all routes
const securityHeaders = [
  {
    key: "X-DNS-Prefetch-Control",
    value: "on",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "X-Frame-Options",
    value: "SAMEORIGIN",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "X-XSS-Protection",
    value: "1; mode=block",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  {
    // CSP - Allows inline styles/scripts for Next.js compatibility
    // Allows Google Fonts and other necessary external sources
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data: https://fonts.gstatic.com",
      "connect-src 'self' https://api.docuseal.eu https://api.docuseal.com https://bankaccountdata.gocardless.com https://merchant.revolut.com https://sandbox-merchant.revolut.com https://api.telegram.org",
      "frame-src 'self' https://checkout.revolut.com https://sandbox-checkout.revolut.com",
      "frame-ancestors 'self'",
      "form-action 'self'",
      "base-uri 'self'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  // Use "export" for static Capacitor builds (limited features)
  // Use "standalone" for full-featured server deployment
  output: isCapacitorBuild ? "export" : "standalone",

  // Increase body size limit for file uploads (support downloads .exe/.dmg files)
  experimental: {
    serverActions: {
      bodySizeLimit: "250mb",
    },
  },

  webpack: (config) => {
    // Fix for react-pdf
    config.resolve.alias.canvas = false;
    return config;
  },
  turbopack: {},

  // Security headers
  async headers() {
    return [
      {
        // Apply to all routes
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },

  // Skip API routes during static export
  ...(isCapacitorBuild && {
    // Disable image optimization for static export
    images: {
      unoptimized: true,
    },
  }),
};

export default nextConfig;
