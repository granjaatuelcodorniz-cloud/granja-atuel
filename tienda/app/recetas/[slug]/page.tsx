import {cache} from 'react';
import Link from 'next/link';
import {notFound} from 'next/navigation';
import {getPublicContent} from '@/lib/site-content-server';
import {recipeSlug} from '@/lib/recipe-links';
import {publicMetadata} from '@/lib/seo';
import {siteOrigin} from '@/lib/site-release';
import StructuredData from '@/components/StructuredData';
export const dynamic='force-dynamic';

const findRecipe=cache(async(slug:string)=>(await getPublicContent('recipe')).find(r=>r.kind==='recipe'&&recipeSlug(r)===slug));
type Props={params:Promise<{slug:string}>};
export async function generateMetadata({params}:Props){
 const {slug}=await params,r=await findRecipe(slug);
 if(!r||r.kind!=='recipe')return {title:'Receta · Granja Atuel'};
 return publicMetadata('/recetas/'+slug,r.data.title+' — Receta con huevos de codorniz | Granja Atuel','Aprendé a preparar '+r.data.title+' con huevos de codorniz de Granja Atuel.',r.data.image,'article');
}

export default async function RecipePage({params}:Props){
 const {slug}=await params,r=await findRecipe(slug);
 if(!r||r.kind!=='recipe')notFound();
 const d=r.data;
 return <main className="section recipes-page">
  <StructuredData value={{'@context':'https://schema.org','@type':'Recipe',name:d.title,image:new URL(d.image,siteOrigin).href,author:{'@type':'Organization',name:'Granja Atuel'},recipeIngredient:[d.ingredients],recipeInstructions:[{'@type':'HowToStep',text:d.steps}]}}/>
  <Link href="/recetas" className="text-link">← Todas las recetas</Link>
  <article className="recipes-single"><p className="eyebrow">RECETAS CON HUEVOS DE CODORNIZ</p><h1>{d.title}</h1>
   <p>{[d.time,d.portions&&d.portions+' porciones',d.difficulty].filter(Boolean).join(' · ')}</p>
   <img src={d.image} alt={d.title} width={800} height={600} fetchPriority="high"/>
   <h2>Ingredientes</h2><p>{d.ingredients}</p>
   <h2>Preparación</h2><p>{d.steps}</p>
   <Link className="button" href="/#productos">Ver huevos para consumo</Link>
  </article>
 </main>;
}
