import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // A stray lockfile in the parent folder makes Next.js infer the wrong
  // workspace root; pin it to this project.
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
