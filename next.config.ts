import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* revenant: nodejs runtime routes (fs/mongo/child-proc) — no cacheComponents */
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
