/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    // The engine uses ESM ".js" import specifiers that resolve to ".ts" sources.
    config.resolve.extensionAlias = { ".js": [".ts", ".tsx", ".js", ".jsx"] };
    return config;
  },
};
export default nextConfig;
