import type {NextConfig} from 'next';
import {publicRelease,siteHost} from './lib/site-release';

const release=publicRelease();
const noindex={key:'X-Robots-Tag',value:'noindex, nofollow, noarchive'};
const security=[
 {key:'X-Content-Type-Options',value:'nosniff'},
 {key:'Referrer-Policy',value:'strict-origin-when-cross-origin'},
 {key:'X-Frame-Options',value:'DENY'},
];
const noStore={key:'Cache-Control',value:'private, no-store'};
const config:NextConfig={
 async redirects(){
  return [
   {source:'/index.html',destination:'/',permanent:true},
   ...(release?[{source:'/incubacion/recuperar',destination:'/incubacion',permanent:false}]:[{source:'/incubacion.html',destination:'/incubacion',permanent:false}]),
  ];
 },
 async rewrites(){
  // The installed PWA and its browser-local records stay at both former paths.
  return {beforeFiles:release?[{source:'/incubacion',destination:'/incubacion.html'}]:[],afterFiles:[],fallback:[]};
 },
 async headers(){
  const canonicalPattern=siteHost.replace(/\./g,'\\.');
  return [
   {source:'/:path*',headers:security},
   release?{source:'/:path*',missing:[{type:'host',value:canonicalPattern}],headers:[noindex]}:{source:'/:path*',headers:[noindex]},
   {source:'/admin/:path*',headers:[noStore,noindex]},
   {source:'/auth/callback',headers:[{key:'Referrer-Policy',value:'no-referrer'},noindex]},
   {source:'/pedido/:path*',headers:[{key:'Referrer-Policy',value:'no-referrer'},noStore,noindex]},
   {source:'/incubacion/recuperar',headers:[{key:'Referrer-Policy',value:'no-referrer'},noStore,noindex]},
   {source:'/checkout',headers:[noStore,noindex]},
   {source:'/sw.js',headers:[{key:'Cache-Control',value:'public, max-age=0, must-revalidate'},noindex]},
  ];
 },
};
export default config;
