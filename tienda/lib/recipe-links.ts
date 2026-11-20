import recipes from './recetas.json' with {type:'json'};
import type {SiteContent} from './site-content.ts';

export const slugify=(text:string)=>text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
export const legacyRecipeSlugs=Object.fromEntries(recipes.map((r,i)=>['receta-'+i,slugify(r['Título'])]));
export const recipeSlug=(r:Extract<SiteContent,{kind:'recipe'}>)=>legacyRecipeSlugs[r.id]||r.id;
