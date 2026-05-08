import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Zero Gravity — AI Job Application Orchestrator",
  description:
    "AI-powered job application platform for students and freshers. Upload your resume and let AI find, score, and tailor opportunities for you.",
  keywords: ["job search", "AI resume", "job matching", "ATS optimization", "career"],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-mesh min-h-screen antialiased">{children}</body>
    </html>
  );
}
