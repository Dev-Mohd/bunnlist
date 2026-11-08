import type { NextConfig } from "next";

const approvedImageHosts = [
  {
    protocol: "https" as const,
    hostname: "lh3.googleusercontent.com",
    pathname: "/**",
  },
  {
    protocol: "https" as const,
    hostname: "bwrtmemjuxhqwyquvkmf.supabase.co",
    pathname: "/storage/v1/object/public/coffee-images/**",
  },
  {
    protocol: "https" as const,
    hostname: "media.zid.store",
    pathname: "/**",
  },
];

const nextConfig: NextConfig = {
  outputFileTracingRoot: process.cwd(),
  // Lint runs in dev/CI (npm run lint), not as a deploy gate. Vitest test files in
  // particular must never block a production build.
  eslint: { ignoreDuringBuilds: true },
  images: {
    remotePatterns: approvedImageHosts,
  },
  // The Android APK downloads as an installable package, not as a zip or text.
  async headers() {
    return [
      {
        source: "/download/:file*.apk",
        headers: [
          { key: "Content-Type", value: "application/vnd.android.package-archive" },
          { key: "Content-Disposition", value: "attachment; filename=BunnList.apk" },
          { key: "Cache-Control", value: "public, max-age=0, must-revalidate" },
        ],
      },
    ];
  },
};

export default nextConfig;
