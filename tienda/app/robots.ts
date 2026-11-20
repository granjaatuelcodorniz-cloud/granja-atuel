import type {MetadataRoute} from 'next';
import {headers} from 'next/headers';
import {indexableHost,siteOrigin} from '@/lib/site-release';
export const dynamic='force-dynamic';
export default async function robots():Promise<MetadataRoute.Robots>{
 if(!indexableHost((await headers()).get('host')))return {rules:{userAgent:'*',disallow:'/'}};
 return {rules:{userAgent:'*',allow:['/','/api/receta'],disallow:['/admin','/checkout','/pedido/','/api/','/auth/','/incubacion/recuperar','/data/']},sitemap:siteOrigin+'/sitemap.xml'};
}
