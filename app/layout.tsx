import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { CartProvider } from "@/lib/contexts/CartContext";
import CartNotification from "@/components/ui/CartNotification";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "Butterflies Beading - Handmade Jewelry & Custom Designs",
    template: "%s | Butterflies Beading",
  },
  description:
    "Discover beautiful handmade jewelry at Butterflies Beading. Custom designs, personalized pieces, and premium handcrafted jewelry with free shipping on orders over $100.",
  keywords: [
    "handmade jewelry",
    "custom jewelry",
    "beading",
    "personalized jewelry",
    "handcrafted accessories",
    "butterflies beading",
    "unique jewelry",
    "artisan jewelry",
    "custom designs",
    "jewelry store",
  ],
  authors: [{ name: "Butterflies Beading" }],
  creator: "Butterflies Beading",
  publisher: "Butterflies Beading",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
  ),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    title: "Butterflies Beading - Handmade Jewelry & Custom Designs",
    description:
      "Discover beautiful handmade jewelry at Butterflies Beading. Custom designs, personalized pieces, and premium handcrafted jewelry.",
    siteName: "Butterflies Beading",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Butterflies Beading - Handmade Jewelry",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Butterflies Beading - Handmade Jewelry & Custom Designs",
    description:
      "Discover beautiful handmade jewelry at Butterflies Beading. Custom designs, personalized pieces, and premium handcrafted jewelry.",
    images: ["/og-image.jpg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en">
        <head>
          <link rel="icon" href="/favicon.ico" />
          <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
          <link rel="manifest" href="/manifest.json" />
          <meta name="theme-color" content="#9333ea" />
        </head>
        <body className={inter.className}>
          <CartProvider>
            {children}
            <CartNotification />
          </CartProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
