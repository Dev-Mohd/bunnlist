import type { Metadata } from "next";
import { Cairo } from "next/font/google";
import "./globals.css";

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "BunnList — منصة تقييم محاصيل القهوة المختصة",
    template: "%s | BunnList",
  },
  description:
    "اكتشف محاصيل القهوة المختصة، اقرأ تجارب الناس، واعرف أفضل طريقة تحضير قبل ما تشتري.",
  keywords: ["قهوة", "قهوة مختصة", "تقييم قهوة", "محاصيل قهوة", "specialty coffee"],
  metadataBase: new URL("https://bunnlist.com"),
  openGraph: {
    title: "BunnList — منصة تقييم محاصيل القهوة المختصة",
    description:
      "اكتشف محاصيل القهوة المختصة، اقرأ تجارب الناس، واعرف أفضل طريقة تحضير قبل ما تشتري.",
    siteName: "BunnList",
    locale: "ar_SA",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "BunnList — منصة تقييم محاصيل القهوة المختصة",
    description: "اكتشف محاصيل القهوة المختصة واعرف أفضل طرق تحضيرها.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl">
      <body className={cairo.className}>{children}</body>
    </html>
  );
}
