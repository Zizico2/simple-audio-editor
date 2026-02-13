import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  title: "Audio Editor",
  description: "A lightweight, client-side audio editing tool",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Script id="theme-init" strategy="beforeInteractive">
          {`
            (function() {
              const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
              document.documentElement.setAttribute('data-mode', isDark ? 'dark' : 'light');
            })();
          `}
        </Script>
        {children}
      </body>
    </html>
  );
}
