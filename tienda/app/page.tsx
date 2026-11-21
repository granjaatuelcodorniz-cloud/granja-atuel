import {getCatalog} from '@/lib/products';
import {getShopSettings} from '@/lib/shop-settings';
import {getPublicContent} from '@/lib/site-content-server';
import {legacyPurchaseLink} from '@/lib/legacy-purchases';
import {getPurchaseMode} from '@/lib/current-purchase';
import {legacyRecipeSlugs,recipeSlug} from '@/lib/recipe-links';
import {homeDescription,homeTitle,publicMetadata} from '@/lib/seo';
import {publicRelease,siteOrigin} from '@/lib/site-release';
import Storefront from '@/components/Storefront';
import StructuredData from '@/components/StructuredData';
import './storefront.css';

export const dynamic='force-dynamic';
export const generateMetadata=()=>publicMetadata('/',homeTitle,homeDescription);

export default async function Home(){
 const [catalog,settings,content]=await Promise.all([getCatalog(),getShopSettings(),getPublicContent()]);
 const mode=getPurchaseMode();
 const linkProductIds=mode==='links'?catalog.products.filter(p=>legacyPurchaseLink(p)).map(p=>p.id):[];
 const recipePaths=Object.fromEntries(content.flatMap(r=>r.kind==='recipe'?[[r.id,recipeSlug(r)]]:[]));
 const recipeAliases=Object.fromEntries(Object.entries(legacyRecipeSlugs).filter(([id])=>recipePaths[id]).map(([id,slug])=>['receta-'+slug,recipePaths[id]]));
 const business={
  '@type':'LocalBusiness','@id':siteOrigin+'/#granja',name:settings.business_name,url:siteOrigin+'/',
  description:homeDescription,image:new URL(settings.hero_image,siteOrigin).href,
  logo:siteOrigin+'/logo-granja-atuel-web.webp',telephone:'+'+settings.whatsapp,
  ...(settings.contact_email?{email:settings.contact_email}:{}),
  address:{'@type':'PostalAddress',addressLocality:'San Rafael',addressRegion:'Mendoza',addressCountry:'AR'},
  sameAs:['https://www.mercadolibre.com.ar/tienda/granja-atuel',...(settings.instagram?[settings.instagram]:[])],
 };
 return <>
  <StructuredData value={{'@context':'https://schema.org','@graph':[business,
   {'@type':'WebSite','@id':siteOrigin+'/#sitio',url:siteOrigin+'/',name:settings.business_name,inLanguage:'es-AR',publisher:{'@id':business['@id']}},
   ...(catalog.products.length?[{'@type':'ItemList',name:'Productos de Granja Atuel',itemListElement:catalog.products.map((p,i)=>({'@type':'ListItem',position:i+1,name:p.name+' · '+p.description,url:siteOrigin+'/producto/'+p.id}))}]:[]),
  ]}}/>
  <Storefront {...catalog} settings={settings} content={content} purchaseMode={mode} linkProductIds={linkProductIds} legacyIncubation={publicRelease()} recipePaths={recipePaths} recipeAliases={recipeAliases}/>
 </>;
}
