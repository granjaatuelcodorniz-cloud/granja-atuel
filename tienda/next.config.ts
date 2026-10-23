import type { NextConfig } from 'next';
const config: NextConfig = {
  async rewrites(){return [{source:'/incubacion',destination:'/incubacion.html'}];},
  async headers() { return [{ source: '/:path*', headers: [
    { key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' },
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    { key: 'X-Frame-Options', value: 'DENY' }
  ] }]; }
};
export default config;
