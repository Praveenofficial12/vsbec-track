import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster as RadixToaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { AntiCaptureScript } from "@/components/AntiCaptureScript";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "V.S.B. Engineering College, Karur — Placement Management System",
  description:
    "Official placement management portal of V.S.B. Engineering College, Karur — manage students, companies, placement drives, recruitment rounds, analytics and reports.",
  keywords: [
    "V.S.B. Engineering College",
    "VSBEC",
    "Karur",
    "Placement Management System",
    "Placement ERP",
    "College Placements",
    "Tamil Nadu Engineering College",
    "Recruitment",
    "Analytics",
  ],
  authors: [{ name: "V.S.B. Engineering College, Karur — Placement Department" }],
  icons: {
    icon: "/vsbec-logo.png",
    apple: "/vsbec-logo.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#047857",
};

// Global anti-screenshot / anti-right-click / anti-screen-capture script.
// This runs on EVERY page of the website and blocks:
//   - Right-click context menu → shows popup
//   - Copy / Paste → shows popup
//   - PrintScreen + Win+PrintScreen + Win+Shift+S + Win+Shift+T → calls the
//     screenshot-attempt API (3-strike policy: 2 warnings → lock on 3rd)
//   - Screen recording → shows popup
//   - Ctrl+S, Ctrl+P, Ctrl+U, F12, Ctrl+Shift+I/J/C → blocked
//   - Text selection, drag-and-drop
//   - Visibility change (blurs content when tab loses focus)
//
// The screenshot-attempt API call requires a student session token. The
// StudentLayout component sets window.__sessionToken when the student logs
// in, so this global script can call the API from any page.

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="robots" content="noindex, nofollow" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <RadixToaster />
        <SonnerToaster position="top-center" richColors closeButton duration={5000} />
        {/* Anti-capture script — injected via a client component's useEffect
            AFTER React hydration to prevent hydration mismatches. */}
        <AntiCaptureScript />
      </body>
    </html>
  );
}
