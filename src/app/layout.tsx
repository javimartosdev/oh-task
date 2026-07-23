import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Nunito, Source_Serif_4 } from "next/font/google";
import { Providers } from "@/components/providers";
import { THEME_STORAGE_KEY } from "@/lib/theme";
import "./globals.css";

const nunito = Nunito({
  variable: "--font-ui",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const sourceSerif = Source_Serif_4({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Oh-Task",
  description: "Captura, organiza y enfócate — Inbox, Hoy y Próximos",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Oh-Task",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#eff1f5" },
    { media: "(prefers-color-scheme: dark)", color: "#1e1e2e" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${nunito.variable} ${sourceSerif.variable} h-full dark antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col font-sans">
        <Script id="theme-init" strategy="beforeInteractive">
          {`(function(){try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");if(t==="light"||t==="dark"){document.documentElement.classList.remove("light","dark");document.documentElement.classList.add(t);}}catch(e){}})();`}
        </Script>
        <Providers>{children}</Providers>
        <Script id="sw-register" strategy="afterInteractive">
          {`if("serviceWorker" in navigator){navigator.serviceWorker.register("/sw.js").catch(function(){})}`}
        </Script>
      </body>
    </html>
  );
}
