import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Join Division A — Margins",
  description:
    "Register for your Margins campus desk with your TCET college email and Class Representative invite code.",
};

export default function SignupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
