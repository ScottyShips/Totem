const withPWA = require("next-pwa")({
  dest: "public",
  // Disable SW in development to avoid cache interference during dev work
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
};

module.exports = withPWA(nextConfig);
