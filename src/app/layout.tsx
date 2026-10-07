import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster as RadixToaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";

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
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <RadixToaster />
        <SonnerToaster position="top-right" richColors closeButton />
      </body>
    </html>
  );
}
