const withTM = require('next-transpile-modules')(['react-grid-layout', 'react-resizable']);

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Add other Next.js configurations here if needed
};

module.exports = withTM(nextConfig);