/** @type {import('next').NextConfig} */
const nextConfig = {
  // Ensure CSS is processed correctly
  webpack: (config) => {
    return config;
  },
  // Configure output directory for static export
  output: 'export',
  // Disable image optimization since Cloudflare Pages doesn't support it
  images: {
    unoptimized: true,
  },
}

module.exports = nextConfig