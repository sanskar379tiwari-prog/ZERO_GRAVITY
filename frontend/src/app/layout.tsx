import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/Navbar";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space",
});

export const metadata: Metadata = {
  title: "Zero Gravity — AI Job Application Orchestrator",
  description:
    "AI-powered job application platform for students and freshers. Upload your resume and let AI find, score, and tailor opportunities for you.",
  keywords: ["job search", "AI resume", "job matching", "ATS optimization", "career"],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${spaceGrotesk.variable} bg-[#fafafa] min-h-screen antialiased`}>
        <Navbar />
        <div className="pt-24 md:pt-28">
          {children}
        </div>
      </body>
    </html>
  );
}
