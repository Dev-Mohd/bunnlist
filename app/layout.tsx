import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BunnList | Coming Soon",
  description:
    "BunnList is a bilingual specialty coffee crop review platform for discovering, rating, and brewing better coffee crops.",
  metadataBase: new URL("https://bunnlist.com"),
  openGraph: {
    title: "BunnList | قريبًا",
    description:
      "دليلك لاختيار محصول القهوة المناسب. Discover, rate, and brew better coffee crops.",
    siteName: "BunnList",
    locale: "ar_SA",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "BunnList | Coming Soon",
    description: "Discover, rate, and brew better coffee crops.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
