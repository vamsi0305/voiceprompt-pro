import type { Metadata } from "next";
import "./globals.css";

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
      <body className="antialiased">
        <div className="bg-mesh" />
        {children}
      </body>
    </html>
  );
}
