import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import {
  ClerkProvider,
} from '@clerk/nextjs'
import { CartProvider } from '@/lib/contexts/CartContext'
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Handmade Jewelry Store | Custom Jewelry & Accessories",
  description:
    "Discover beautiful handmade and customizable jewelry. Unique bracelets, necklaces, and accessories crafted with care. Free shipping on orders over $100.",
  keywords:
    "handmade jewelry, custom jewelry, bracelets, necklaces, personalized accessories",
  authors: [{ name: "Jewelry Store" }],
  openGraph: {
    title: "Handmade Jewelry Store",
    description: "Beautiful handmade and customizable jewelry",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased bg-white`}
        >
          <CartProvider>
            {children}
          </CartProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
