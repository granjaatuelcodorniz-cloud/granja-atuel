export type Product = {
  id: string; name: string; description: string; category: 'consumo' | 'fertiles' | 'insumos';
  price: number; image: string; active: boolean; available: boolean;
  weight_grams: number | null; height_cm: number | null; width_cm: number | null; length_cm: number | null;
};
export const seedProducts: Product[] = [
  { id:'consumo-5', name:'Huevos de consumo', description:'5 docenas · 60 huevos', category:'consumo', price:25000, image:'/huevos-consumo1.webp', active:true, available:true },
  { id:'consumo-10', name:'Huevos de consumo', description:'10 docenas · 120 huevos', category:'consumo', price:38000, image:'/huevos-consumo1.webp', active:true, available:true },
  { id:'fertiles-5', name:'Huevos fértiles', description:'5 docenas · 60 huevos para incubar', category:'fertiles', price:54000, image:'/huevos-fertiles1.webp', active:true, available:true },
  { id:'fertiles-10', name:'Huevos fértiles', description:'10 docenas · 120 huevos para incubar', category:'fertiles', price:98000, image:'/huevos-fertiles1.webp', active:true, available:true },
  { id:'blister-200', name:'Blíster para codorniz', description:'200 unidades · Capacidad de una docena', category:'insumos', price:82000, image:'/maples-x-200-unidades.webp', active:true, available:true },
].map(p=>({...p, weight_grams:null, height_cm:null, width_cm:null, length_cm:null})) as Product[];
export const money = (amount:number) => new Intl.NumberFormat('es-AR',{style:'currency',currency:'ARS',maximumFractionDigits:0}).format(amount);
export type CartLine = {id:string; quantity:number};
export function normalizeCart(value:unknown):CartLine[] {
  if(!Array.isArray(value)) return [];
  const result = new Map<string,number>();
  for(const row of value.slice(0,50)) {
    if(!row || typeof row.id!=='string' || !Number.isInteger(row.quantity) || row.quantity<1) continue;
    result.set(row.id, Math.min(20,(result.get(row.id)||0)+row.quantity));
  }
  return [...result].map(([id,quantity])=>({id,quantity}));
}
export function summarizeCart(lines:CartLine[], products:Product[]) {
  const items = normalizeCart(lines).map(line=>({ ...line, product:products.find(p=>p.id===line.id && p.active && p.available) })).filter((item):item is CartLine & {product:Product}=>!!item.product);
  return {items, total:items.reduce((sum,item)=>sum+item.product.price*item.quantity,0), count:items.reduce((sum,item)=>sum+item.quantity,0)};
}
export function validateProduct(input:unknown): Product {
  if(!input || typeof input!=='object') throw new Error('Producto inválido.');
  const p=input as Record<string,unknown>;
  if(typeof p.id!=='string'||!/^[a-z0-9-]{1,64}$/.test(p.id)) throw new Error('Identificador inválido.');
  if(typeof p.name!=='string'||p.name.trim().length<3||p.name.length>100) throw new Error('Revisá el nombre.');
  if(typeof p.description!=='string'||p.description.length>500) throw new Error('Descripción demasiado larga.');
  if(!['consumo','fertiles','insumos'].includes(String(p.category))) throw new Error('Categoría inválida.');
  if(typeof p.price!=='number'||!Number.isSafeInteger(p.price)||p.price<1||p.price>100000000) throw new Error('Ingresá un precio entero mayor a cero.');
  if(typeof p.image!=='string'||!/^\/[a-zA-Z0-9_][a-zA-Z0-9_./-]*\.(webp|png|jpg|jpeg)$/.test(p.image)||p.image.includes('..')) throw new Error('Imagen inválida.');
  if(typeof p.active!=='boolean'||typeof p.available!=='boolean') throw new Error('Estado inválido.');
  const dimensions = ['weight_grams','height_cm','width_cm','length_cm'] as const;
  for(const field of dimensions) if(p[field]!==null && (typeof p[field]!=='number'||!Number.isInteger(p[field])||Number(p[field])<1||Number(p[field])>100000)) throw new Error('Peso y medidas deben ser enteros positivos o quedar vacíos.');
  return {id:p.id,name:p.name.trim(),description:p.description,category:p.category as Product['category'],price:p.price,image:p.image,active:p.active,available:p.available,weight_grams:p.weight_grams as number|null,height_cm:p.height_cm as number|null,width_cm:p.width_cm as number|null,length_cm:p.length_cm as number|null};
}
