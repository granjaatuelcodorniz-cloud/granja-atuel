import type { NextConfig } from 'next';
const config: NextConfig = {
  async redirects(){return [{source:'/incubacion.html',destination:'/incubacion',permanent:false}];},
  async headers() { return [{ source: '/:path*', headers: [
    { key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' },
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    { key: 'X-Frame-Options', value: 'DENY' }
  ] },{source:'/auth/callback',headers:[{key:'Referrer-Policy',value:'no-referrer'}]},{source:'/pedido/:path*',headers:[{key:'Referrer-Policy',value:'no-referrer'},{key:'Cache-Control',value:'private, no-store'}]},{source:'/incubacion/recuperar',headers:[{key:'Referrer-Policy',value:'no-referrer'},{key:'Cache-Control',value:'private, no-store'}]},{source:'/checkout',headers:[{key:'Cache-Control',value:'private, no-store'}]}]; }
};
export default config;
