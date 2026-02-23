import type { Metadata } from "next";
import { Inter_Tight } from "next/font/google";
import { SessionWrapper } from "@/components/SessionWrapper";
import "./globals.css";

const interTight = Inter_Tight({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Reframe Feasibility Tool",
  description:
    "Enter an address to generate an AI-powered site rendering, zoning analysis, and cost estimate — instantly assess the feasibility of your Reframe building.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${interTight.variable} font-sans antialiased`}>
        <SessionWrapper>{children}</SessionWrapper>
      </body>
    </html>
  );
}
