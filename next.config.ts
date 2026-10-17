import type { NextConfig } from "next";

// Static export for GitHub Pages. NEXT_PUBLIC_BASE_PATH is "/trackerforme" in the
// Pages build and empty for local dev.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  basePath,
};

export default nextConfig;
