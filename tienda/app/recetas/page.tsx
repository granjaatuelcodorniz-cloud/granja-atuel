import Link from 'next/link';
import {getPublicContent} from '@/lib/site-content-server';
import {recipeSlug} from '@/lib/recipe-links';
import {publicMetadata} from '@/lib/seo';

export const dynamic='force-dynamic';
export async function generateMetadata(){return publicMetadata('/recetas','Recetas con huevos de codorniz · Granja Atuel','Ideas sencillas y recetas con huevos de codorniz de nuestra granja de San Rafael, Mendoza.');}
export default async function Recipes(){
 const recipes=(await getPublicContent('recipe')).filter(r=>r.kind==='recipe');
 return <main className="section recipes-page">
  <Link href="/#recetas" className="text-link">← Volver a Granja Atuel</Link>
  <p className="eyebrow">COCINA CON HUEVOS DE CODORNIZ</p><h1>Ideas para tu mesa.</h1><p>Recetas con huevos de codorniz para tu próxima comida.</p>
  {!recipes.length&&<p className="empty-state">No hay recetas publicadas por el momento.</p>}
  <div className="all-recipes">{recipes.map(r=><article key={r.id} id={r.id}>
   <img src={r.data.image} alt={r.data.title} loading="lazy"/>
   <div><p className="eyebrow">{[r.data.time,r.data.portions&&r.data.portions+' porciones',r.data.difficulty].filter(Boolean).join(' · ')}</p>
    <h2>{r.data.title}</h2><h3>Ingredientes</h3><p style={{whiteSpace:'pre-line'}}>{r.data.ingredients}</p>
    <Link href={'/recetas/'+recipeSlug(r)} className="text-link">Ver preparación →</Link>
   </div>
  </article>)}</div>
 </main>;
}
