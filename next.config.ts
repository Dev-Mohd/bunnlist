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
  images: {
    remotePatterns: approvedImageHosts,
  },
};

export default nextConfig;
