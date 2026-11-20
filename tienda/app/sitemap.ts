import type {MetadataRoute} from 'next';
import {headers} from 'next/headers';
import {getCatalog} from '@/lib/products';
import {recipeSlug} from '@/lib/recipe-links';
import {getPublicContent} from '@/lib/site-content-server';
import {indexableHost,siteOrigin} from '@/lib/site-release';
export const dynamic='force-dynamic';

export default async function sitemap():Promise<MetadataRoute.Sitemap>{
 if(!indexableHost((await headers()).get('host')))return [];
 const [catalog,entries]=await Promise.all([getCatalog(),getPublicContent('recipe')]);
 return [
  ...['/','/huevos-fertiles','/recetas','/buenas-practicas'].map(path=>({url:siteOrigin+path})),
  ...catalog.products.map(p=>({url:siteOrigin+'/producto/'+p.id,lastModified:p.updated_at||undefined})),
  ...entries.flatMap(r=>r.kind==='recipe'?[{url:siteOrigin+'/recetas/'+recipeSlug(r),lastModified:r.updated_at||undefined}]:[]),
 ];
}
