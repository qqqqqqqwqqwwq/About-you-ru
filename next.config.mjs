/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "cdn.aboutstatic.com" },
      { protocol: "https", hostname: "cdn.aboutyou.cloud" },
      { protocol: "https", hostname: "img.aboutstatic.com" },
    ],
  },
};

export default nextConfig;
