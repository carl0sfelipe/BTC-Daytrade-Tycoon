/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ["cdn.binance.com"],
  },
  experimental: {
    // better-sqlite3 is a native addon — bundling it breaks the .node binding
    // lookup at runtime, so the Prisma driver stack must stay external.
    serverComponentsExternalPackages: [
      "@prisma/client",
      "@prisma/adapter-better-sqlite3",
      "better-sqlite3",
    ],
  },
};

export default nextConfig;
