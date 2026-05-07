const withPWA = require("next-pwa")({
  dest: "public",
  // Disable SW in development to avoid cache interference during dev work
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
  // Empty precache manifest — the SW exists only for push notifications;
  // offline behavior is localStorage-based per CLAUDE.md. Precaching all
  // build assets caused install to fail (sw goes installing→redundant) on
  // iOS PWA, where one fetch failure rejects event.waitUntil.
  buildExcludes: [/.*/],
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
};

module.exports = withPWA(nextConfig);
