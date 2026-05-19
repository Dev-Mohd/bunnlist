import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "bwrtmemjuxhqwyquvkmf.supabase.co",
        pathname: "/storage/v1/object/public/coffee-images/**",
      },
    ],
  },
};

export default nextConfig;
