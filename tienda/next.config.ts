import type { NextConfig } from 'next';
const config: NextConfig = {
  async redirects(){return [{source:'/incubacion.html',destination:'/incubacion',permanent:false}];},
  async headers() { return [{ source: '/:path*', headers: [
    { key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' },
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    { key: 'X-Frame-Options', value: 'DENY' }
  ] }]; }
};
export default config;
