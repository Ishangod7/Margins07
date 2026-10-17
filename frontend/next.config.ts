import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  compress: true,
  poweredByHeader: false,
  experimental: {
    optimizePackageImports: ["@supabase/supabase-js", "@supabase/ssr"],
  },
};

export default nextConfig;
// Production API connected: https://margins07.onrender.com
