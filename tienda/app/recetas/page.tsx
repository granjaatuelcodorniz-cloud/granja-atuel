import Link from 'next/link';
import {getPublicContent} from '@/lib/site-content-server';

export const dynamic='force-dynamic';
export const metadata={title:'Recetas con huevos de codorniz · Granja Atuel'};
export default async function Recipes(){
 const recipes=(await getPublicContent('recipe')).filter(r=>r.kind==='recipe');
 return <main className="section recipes-page">
  <Link href="/#recetas" className="text-link">← Volver a Granja Atuel</Link>
  <p className="eyebrow">COCINA CON HUEVOS DE CODORNIZ</p><h1>Ideas para tu mesa.</h1><p>Recetas con huevos de codorniz para tu próxima comida.</p>
  {!recipes.length&&<p className="empty-state">No hay recetas publicadas por el momento.</p>}
  <div className="all-recipes">{recipes.map(({id,data:r})=><article key={id} id={id}><img src={r.image} alt={r.title} loading="lazy"/><div><p className="eyebrow">{[r.time,r.portions&&r.portions+' porciones',r.difficulty].filter(Boolean).join(' · ')}</p><h2>{r.title}</h2><h3>Ingredientes</h3><p style={{whiteSpace:'pre-line'}}>{r.ingredients}</p><h3>Preparación</h3><p style={{whiteSpace:'pre-line'}}>{r.steps}</p></div></article>)}</div>
 </main>;
}
