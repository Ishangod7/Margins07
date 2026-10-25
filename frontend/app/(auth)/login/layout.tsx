import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Log In — Margins",
  description: "Log in to your private campus desk for TCET Mumbai AI&DS Division A.",
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
