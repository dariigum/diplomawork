/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  images: {
    unoptimized: true,
  },
  serverExternalPackages: ['better-sqlite3'],
}

export default nextConfig
