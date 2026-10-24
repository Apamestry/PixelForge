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
};

module.exports = nextConfig;
