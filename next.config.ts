import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // A stray lockfile in the parent folder makes Next.js guess the wrong
  // workspace root; pin it to this project.
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
