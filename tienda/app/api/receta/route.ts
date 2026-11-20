import {NextResponse} from 'next/server';
import {getPublicContent} from '@/lib/site-content-server';
import {recipeSlug} from '@/lib/recipe-links';
import {publicRelease,siteOrigin} from '@/lib/site-release';

export async function GET(request:Request){
 const url=new URL(request.url);
 const slug=url.searchParams.get('slug');
 const origin=publicRelease()?siteOrigin:url.origin;
 const r=slug&&/^[a-z0-9-]{1,120}$/.test(slug)?(await getPublicContent('recipe')).find(r=>r.kind==='recipe'&&recipeSlug(r)===slug):null;
 return r?NextResponse.redirect(new URL('/recetas/'+slug,origin),308):NextResponse.redirect(new URL('/recetas',origin),302);
}
