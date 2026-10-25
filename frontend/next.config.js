/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  async rewrites() {
    const coreApiUrl = process.env.CORE_API_URL || "http://localhost:8000";
    const fontServiceUrl = process.env.FONT_SERVICE_URL || "http://localhost:8002";

    return [
      {
        source: "/api/:path*",
        destination: `${coreApiUrl}/api/:path*`,
      },
      {
        source: "/fonts/:path*",
        destination: `${fontServiceUrl}/fonts/:path*`,
      },
    ];
  },
  // Konva's Node.js entry tries to require 'canvas'; stub it out so the
  // server-side bundle doesn't fail. EditorCanvas uses dynamic import with
  // ssr:false so Konva is never actually executed on the server.
  webpack(config, { isServer }) {
    if (isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        canvas: false,
      };
    }
    return config;
  },
};

module.exports = nextConfig;
