/** @type {import('next').NextConfig} */
const nextConfig = {
  // Leaflet requires this for SSR compatibility
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      'leaflet': 'leaflet/dist/leaflet-src.js',
    };
    return config;
  },
};

module.exports = nextConfig;
