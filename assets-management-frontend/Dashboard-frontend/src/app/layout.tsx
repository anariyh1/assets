import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/react";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";
import { AllProviders } from "@/components/providers/all-providers";

export const metadata: Metadata = {
  title: "AssetHub - Хөрөнгийн удирдлагын систем",
  description: "Хөрөнгө хуваарилах, хянах, тайлагнах систем",
  generator: "v0.app",
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/apple-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        suppressHydrationWarning
        className="font-sans antialiased bg-muted/40"
      >
        <AllProviders>
          {children}
          <Analytics />
          <Toaster />
        </AllProviders>
      </body>
    </html>
  );
}
