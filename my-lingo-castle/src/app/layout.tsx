import type { Metadata } from "next";
import { Cinzel, Inter } from "next/font/google";
import "./globals.css";
// YENİ EKLEDİĞİMİZ:
import { AuthProvider } from "@/context/AuthContext";

// Mevcut Cinzel (Normal) - Bunu silmedik, duruyor
const cinzel = Cinzel({
  subsets: ["latin"],
  variable: "--font-cinzel",
  weight: ["400", "500", "600", "700"],
});

// Mevcut Inter - Bunu da silmedik
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Castle of the Words",
  description: "A gothic language learning castle of words.",
};

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