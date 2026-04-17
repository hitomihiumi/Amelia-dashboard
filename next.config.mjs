/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ["192.168.88.213"],
  sassOptions: {
    compiler: "modern",
    silenceDeprecations: ["legacy-js-api"],
  },
  images: {
    qualities: [75, 90, 100],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.discordapp.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "media.discordapp.net",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "images-ext-1.discordapp.net",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "images-ext-2.discordapp.net",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
