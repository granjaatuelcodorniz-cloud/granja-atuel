export const siteOrigin='https://www.granjaatuel.com.ar';
export const siteHost=new URL(siteOrigin).hostname;

// Only the production build can behave like a store. Only the public host can be indexed.
export const publicRelease=()=>process.env.VERCEL_ENV==='production'&&process.env.ATUEL_PUBLIC_SITE==='true';
export const indexableHost=(host:string|null)=>publicRelease()&&host?.toLowerCase()===siteHost;
export type PurchaseMode='test'|'checkout'|'links';
