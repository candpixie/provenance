/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow importing the shared engine from ../src (outside the web app dir).
  experimental: { externalDir: true },
  webpack: (config) => {
    // The engine uses ESM ".js" import specifiers that resolve to ".ts" sources.
    config.resolve.extensionAlias = { ".js": [".ts", ".tsx", ".js", ".jsx"] };
    return config;
  },
};
export default nextConfig;
