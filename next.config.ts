import type { NextConfig } from 'next';
import { validateProductionEnvironment } from './lib/env/production';

// Local builds keep the credential-free demo. A live Vercel production deploy
// must fail early with setting names instead of serving a broken workspace.
if (process.env.VERCEL_ENV === 'production') validateProductionEnvironment(process.env);

const config: NextConfig = {
  outputFileTracingRoot: process.cwd(),
  poweredByHeader: false,
  experimental: { serverActions: { bodySizeLimit: '256kb' } },
  async headers() {
    return [{ source: '/(.*)', headers: [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' }
    ] }];
  }
};
export default config;
