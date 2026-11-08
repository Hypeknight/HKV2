// The private disposable Codespace proxy rewrites form Origin to this loopback
// host. Enable its exact development origin only for the explicit local review.
const localPulseReview = process.env.NODE_ENV === 'development' &&
  process.env.HYPEKNIGHT_COMMUNITY_PULSE_LOCAL_REVIEW === '1' &&
  /^[a-z0-9-]+$/.test(process.env.CODESPACE_NAME || '') &&
  process.env.NEXT_PUBLIC_SITE_URL === `https://${process.env.CODESPACE_NAME}-3234.app.github.dev` &&
  process.env.NEXT_PUBLIC_SUPABASE_URL === 'http://127.0.0.1:55471';

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
      ...(localPulseReview ? { allowedOrigins: ['localhost:3234'] } : {})
    }
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**'
      }
    ]
  }
};

export default nextConfig;
