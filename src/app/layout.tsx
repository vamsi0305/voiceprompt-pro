import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "VoicePrompt Pro — Voice to Structured LLM Prompts",
  description:
    "Turn messy voice thoughts in any language into perfectly structured prompts for Claude, Gemini, ChatGPT, DeepSeek, and Grok. 100% free, runs entirely in your browser.",
  keywords: [
    "voice prompt",
    "LLM",
    "prompt engineering",
    "speech to text",
    "Telugu",
    "multilingual",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} antialiased`}>
        <div className="bg-mesh" />
        {children}
      </body>
    </html>
  );
}
