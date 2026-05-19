import type { Metadata } from "next";
import { Cairo } from "next/font/google";
import "./globals.css";

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "BunnList — تقييم محاصيل القهوة المختصة",
  description:
    "BunnList منصة عربية لاكتشاف وتقييم محاصيل القهوة المختصة ومعرفة أفضل طرق التحضير.",
  metadataBase: new URL("https://bunnlist.com"),
  openGraph: {
    title: "BunnList — تقييم محاصيل القهوة المختصة",
    description:
      "دليلك لاختيار محصول القهوة المناسب. Discover, rate, and brew better coffee crops.",
    siteName: "BunnList",
    locale: "ar_SA",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "BunnList — تقييم محاصيل القهوة المختصة",
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
