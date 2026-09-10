import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: { serverActions: { bodySizeLimit: "6mb" } },
  images: {
    localPatterns: [
      { pathname: "/**", search: "" },
      { pathname: "/images/cafes/**", search: "?v=20260910-real" },
    ],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
