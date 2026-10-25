import type { Metadata } from "next";
import { Caveat, DM_Sans, Patrick_Hand } from "next/font/google";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-dm-sans",
  display: "swap",
});

const caveat = Caveat({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-caveat",
  display: "swap",
});

const patrickHand = Patrick_Hand({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-patrick-hand",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://frontend-nine-kohl-79.vercel.app"),
  title: {
    default: "Margins — TCET AI&DS Division A",
    template: "%s — Margins",
  },
  description:
    "Private campus study desk, peer doubt board, notes archive, and timetable for TCET Mumbai AI&DS Division A (Batch 2026–30).",
  keywords: [
    "Margins",
    "TCET Mumbai",
    "AI&DS",
    "Division A",
    "Thakur College of Engineering and Technology",
    "Campus Desk",
  ],
  authors: [{ name: "Ishan Gupta & AI&DS Division A" }],
  creator: "TCET Mumbai AI&DS Division A",
  openGraph: {
    title: "Margins — TCET AI&DS Division A",
    description:
      "A private study desk and campus hub for TCET Mumbai AI&DS Division A. Notes, PYQs, notices, and peer doubt board.",
    url: "https://frontend-nine-kohl-79.vercel.app",
    siteName: "Margins",
    locale: "en_IN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Margins — TCET AI&DS Division A",
    description:
      "A private study desk and campus hub for TCET Mumbai AI&DS Division A.",
  },
  icons: {
    icon: "/favicon.ico",
  },
};


import { ToastProvider } from "@/components/ui/Toast";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`h-full antialiased ${dmSans.variable} ${caveat.variable} ${patrickHand.variable}`}>
      <body className="min-h-full flex flex-col">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}

