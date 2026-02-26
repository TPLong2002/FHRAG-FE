import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  devIndicators: false,
  allowedDevOrigins:  [
    "http://192.168.1.91:3000",
  ],
};

export default nextConfig;
