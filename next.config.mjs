function serverActionAllowedOrigins() {
  const origins = new Set(['localhost:3000', '127.0.0.1:3000'])
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL
  if (appUrl) {
    try {
      origins.add(new URL(appUrl).host)
    } catch {
      // ignore invalid URL in env
    }
  }
  return [...origins]
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
      allowedOrigins: serverActionAllowedOrigins(),
    },
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
