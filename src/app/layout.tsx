import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ui/theme-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport = {
  themeColor: "#020617",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false, // Prevent zooming in PWA often desired
};

export const metadata: Metadata = {
  title: "Coe™ Powered by .Env",
  description: "心と身体を整えるための服薬体調管理ログ",
  keywords: ["自律神経", "ヘルスログ", "服薬管理", "体調管理", "気圧", "頭痛", "メンタルヘルス"],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Coe",
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/coe.png', type: 'image/png' },
      { url: '/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    shortcut: ['/favicon.ico'],
    apple: [
      { url: '/apple-touch-icon.png' },
    ],
  },
  openGraph: {
    title: "Coe - 服薬体調管理ログ",
    description: "日々の体調、気圧、服薬を記録して自律神経をケア。あなたらしいリズムを取り戻すための服薬体調管理ログアプリ。",
    url: "https://coe-app.vercel.app",
    siteName: "Coe",
    images: [
      {
        url: "/head.png",
        width: 1200,
        height: 630,
        alt: "Coe - Health Log App",
      },
    ],
    locale: "ja_JP",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Coe - 服薬体調管理ログ",
    description: "日々の体調、気圧、服薬を記録して自律神経をケア。",
    images: ["/head.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" suppressHydrationWarning className="bg-slate-50 dark:bg-brand-950">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
          storageKey="theme"
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
