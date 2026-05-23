import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingRoot: process.cwd(),
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
      {
        protocol: "https",
        hostname: "bwrtmemjuxhqwyquvkmf.supabase.co",
        pathname: "/storage/v1/object/public/coffee-images/**",
      },
      {
        protocol: "https",
        hostname: "roastinghouse.sa",
        pathname: "/media/catalog/product/**",
      },
      {
        protocol: "https",
        hostname: "camelstep.com",
        pathname: "/backend/rails/active_storage/blobs/redirect/**",
      },
      {
        protocol: "https",
        hostname: "cdn.salla.sa",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
