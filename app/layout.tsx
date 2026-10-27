import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans_Arabic } from "next/font/google";
import "./globals.css";

// Apple devices get the system font (SF Arabic); everyone else IBM Plex Sans Arabic.
const plex = IBM_Plex_Sans_Arabic({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-plex",
});

const description =
  "BunnList تطبيق لمحبي القهوة المختصة: اكتشف المحاصيل حسب ذوقك، حضّرها خطوة بخطوة بالحركة، وسجّل كل كوب. قريبًا على App Store.";

export const metadata: Metadata = {
  title: {
    default: "BunnList — قهوتك الجاية، هنا.",
    template: "%s — BunnList",
  },
  description,
  keywords: ["قهوة مختصة", "تطبيق قهوة", "V60", "تحضير القهوة", "محامص سعودية", "BunnList"],
  metadataBase: new URL("https://bunnlist.com"),
  icons: { icon: "/icon.svg", apple: "/site/app-icon.png" },
  openGraph: {
    title: "BunnList — قهوتك الجاية، هنا.",
    description,
    siteName: "BunnList",
    locale: "ar_SA",
    type: "website",
    images: ["/site/app-icon.png"],
  },
  twitter: { card: "summary", title: "BunnList — قهوتك الجاية، هنا.", description },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ar" dir="rtl" className={plex.variable}>
      <body
        style={{
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "SF Arabic", "SF Pro Text", var(--font-plex), "Helvetica Neue", sans-serif',
        }}
      >
        {children}
      </body>
    </html>
  );
}
