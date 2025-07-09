/** @type {import('next').NextConfig} */
const nextConfig = {
  // Ensure CSS is processed correctly
  webpack: (config) => {
    return config;
  },
}

module.exports = nextConfig