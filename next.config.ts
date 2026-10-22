import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Photos are resized on the phone before upload, this is just headroom.
    serverActions: { bodySizeLimit: "8mb" },
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
