import type { NextConfig } from "next";

// GitHub Pages serves this project at https://<user>.github.io/pk-dex/.
// The deploy workflow sets NEXT_PUBLIC_BASE_PATH=/pk-dex; locally it is empty.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  output: "export", // fully static site in ./out
  basePath,
  trailingSlash: true, // /unit/soldier/ -> unit/soldier/index.html, works on any static host
  images: { unoptimized: true },
  // Changes every build, so client caches (search index) refresh after a deploy.
  env: { NEXT_PUBLIC_BUILD_ID: process.env.GITHUB_SHA?.slice(0, 8) ?? String(Date.now()) },
  // Cache Components/PPR need a Node server; a static export is already fully
  // prerendered HTML served from GitHub's CDN, so they're off here.
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
