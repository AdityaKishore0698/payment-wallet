/** @type {import('next').NextConfig} */

// Local development: the browser calls the Next.js server, which proxies
// /api/* to the FastAPI backend (so no CORS setup is needed for `npm run dev`).
//
// Hosted (Vercel): NEXT_PUBLIC_API_URL is set to the absolute Render API URL,
// requests go straight there, and this rewrite is disabled.
const API_PROXY_TARGET = process.env.API_PROXY_TARGET || "http://localhost:8000";

const nextConfig = {
  output: "standalone",
  async rewrites() {
    if (process.env.VERCEL) return [];
    return [
      {
        source: "/api/:path*",
        destination: `${API_PROXY_TARGET}/:path*`,
      },
    ];
  },
};

export default nextConfig;
