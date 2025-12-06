import type { Metadata, Viewport } from "next"; // Viewport'u buraya ekledik
import { Cinzel, Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";

// Mevcut Cinzel (Normal)
const cinzel = Cinzel({
  subsets: ["latin"],
  variable: "--font-cinzel",
  weight: ["400", "500", "600", "700"],
});

// Mevcut Inter
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Castle of the Words",
  description: "A gothic language learning castle of words.",
};

// --- YENİ EKLENEN KISIM BAŞLANGIÇ ---
// Bu kısım canlı sitedeki (Vercel) boyut bozulmasını engeller.
// Localhost'taki görüntünü bozmaz, sadece mobilde ve farklı ekranlarda standart olmasını sağlar.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1, // Oyun olduğu için zoom yapılmasını engeller
  userScalable: false,
  themeColor: "#000000",
};
// --- YENİ EKLENEN KISIM BİTİŞ ---

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      {/* Mevcut head etiketlerin aynen kalıyor */}
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Cinzel+Decorative:wght@400;700;900&display=swap" rel="stylesheet" />
      </head>

      <body className={`${inter.className} ${cinzel.variable} antialiased`}>
        {/* TÜM UYGULAMAYI BURADA SARMALIYIZ */}
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}