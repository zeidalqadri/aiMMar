/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Cloudflare Pages configuration
  output: 'export',
  trailingSlash: true,
  skipTrailingSlashRedirect: true,
  distDir: 'out',
  // Environment variables for client-side
      env: {
      CUSTOM_KEY: process.env.CUSTOM_KEY,
      NEXT_PUBLIC_BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL || 'https://aimmar-l8bsedc1k-zeidgeistdotcom.vercel.app',
    },
  // Asset optimization
  assetPrefix: '',
}

export default nextConfig
