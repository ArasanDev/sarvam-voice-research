import type { Metadata } from "next";
import { IBM_Plex_Mono, Noto_Sans_Tamil } from "next/font/google";
import "./globals.css";

const notoTamil = Noto_Sans_Tamil({
  variable: "--font-body-ta",
  subsets: ["tamil"],
  weight: ["400", "500", "600", "700"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Sarvam Voice Research Assistant",
  description: "Multilingual voice-first research assistant powered by Sarvam AI",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${notoTamil.variable} ${plexMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-slate-950 text-white">
        {children}
      </body>
    </html>
  );
}
