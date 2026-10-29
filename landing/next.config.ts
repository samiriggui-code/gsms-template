import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  async redirects() {
    // « / » → langue du navigateur (anglais si Accept-Language commence par en), sinon français
    return [
      { source: "/", has: [{ type: "header", key: "accept-language", value: "^en.*" }], destination: "/en", permanent: false },
      { source: "/", destination: "/fr", permanent: false },
    ];
  },
};

export default nextConfig;
