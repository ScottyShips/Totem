import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";

import OfflineBanner from "@/components/OfflineBanner";
import { AuthProvider } from "@/lib/auth";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Totem",
  description: "Festival group coordination",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#09090b",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} font-sans antialiased bg-zinc-950 text-zinc-100`}>
        <AuthProvider>{children}</AuthProvider>
        <OfflineBanner />
      </body>
    </html>
  );
}
