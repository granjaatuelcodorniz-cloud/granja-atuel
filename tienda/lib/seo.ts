import 'server-only';
import type {Metadata} from 'next';
import {headers} from 'next/headers';
import {indexableHost,siteOrigin} from './site-release';

export const homeTitle='Granja Atuel — Huevos de Codorniz Frescos | San Rafael, Mendoza';
export const homeDescription='Huevos de codorniz frescos y fértiles en San Rafael, Mendoza. Producción propia, envíos a todo el país. Compra directa con Mercado Pago. Huevos de consumo y fértiles para crianza.';

export async function publicMetadata(path:string,title:string,description:string,image='/hero-web.webp',type:'website'|'article'='website'):Promise<Metadata>{
 const index=!!indexableHost((await headers()).get('host'));
 const canonical=siteOrigin+path;
 const imageUrl=new URL(image,siteOrigin).href;
 return {
  title,description,alternates:{canonical},
  robots:{index,follow:index},
  openGraph:{title,description,url:canonical,images:[{url:imageUrl}],locale:'es_AR',siteName:'Granja Atuel',type},
  twitter:{card:'summary_large_image',title,description,images:[imageUrl]},
 };
}
