import {validateProduct,validImageUrl,type Product} from './catalog.ts';
export type ManagedProduct=Product&{sku:string;details:string;gallery:ProductImage[];stock_tracking:boolean;stock_quantity:number;stock_minimum:number;sort_order:number;updated_at:string};
export type ProductImage={url:string;alt:string};
export type Media={id:string;url:string;path:string|null;name:string;alt:string;archived:boolean;created_at:string};
export type StockMovement={id:string;product_id:string;delta:number;previous_quantity:number;new_quantity:number;reason:string;created_at:string};
export type AdminOrder={id:string;customer_name:string;customer_email:string;total_cents:number;status:string;created_at:string;items:{id:string;title:string;quantity:number;unit_price:number}[];fulfillment_status:string;fulfillment_version:number;admin_notes:string;shipping_carrier:string;tracking_code:string};
export const fulfillmentLabels:Record<string,string>={new:'Por preparar',preparing:'En preparación',ready:'Listo para entregar',dispatched:'Despachado',delivered:'Entregado',cancelled:'Cancelado'};
export const categoryLabels:Record<string,string>={consumo:'Huevos de consumo',fertiles:'Huevos fértiles',insumos:'Insumos'};
export const defaultSettings={business_name:'Granja Atuel',location:'San Rafael, Mendoza',whatsapp:'5492604351288',contact_email:'',instagram:'',hero_title:'Lo bueno empieza en el origen.',hero_description:'Pequeños huevos, grandes posibilidades. De nuestra granja a tu mesa, con el cuidado de siempre.',hero_image:'/hero-web.webp'};
export type ShopSettings=typeof defaultSettings;
export function managedProduct(p:Product):ManagedProduct{return {sku:'',details:'',gallery:[],stock_tracking:false,stock_quantity:0,stock_minimum:5,sort_order:0,updated_at:'',...p} as ManagedProduct;}
function text(b:Record<string,unknown>,key:string,max:number,required=false){const v=b[key];if(typeof v!=='string'||v.length>max||(required&&!v.trim()))throw new Error('Revisá el campo '+key+'.');return v.trim();}
export function validateAdminProduct(b:Record<string,unknown>){
 const base=validateProduct(b);
 const sku=text(b,'sku',60);if(sku&&!/^[a-zA-Z0-9_./ -]+$/.test(sku))throw new Error('Usá letras, números, espacios, puntos o guiones en el SKU.');
 const details=text(b,'details',6000);
 if(typeof b.stock_tracking!=='boolean'||!Number.isInteger(b.stock_minimum)||Number(b.stock_minimum)<0||Number(b.stock_minimum)>1000000)throw new Error('Revisá el control de stock.');
 if(!Number.isInteger(b.sort_order)||Number(b.sort_order)<0||Number(b.sort_order)>9999)throw new Error('Orden inválido.');
 if(!Array.isArray(b.gallery)||b.gallery.length>8)throw new Error('Podés incluir hasta 8 imágenes.');
 const gallery=b.gallery.map((image:unknown)=>{if(!image||typeof image!=='object')throw new Error('Imagen inválida.');const i=image as Record<string,unknown>;if(typeof i.url!=='string'||!validImageUrl(i.url)||typeof i.alt!=='string'||i.alt.length>200)throw new Error('Revisá las imágenes.');return {url:i.url,alt:i.alt.trim()};});
 if(new Set(gallery.map(i=>i.url)).size!==gallery.length)throw new Error('Hay imágenes repetidas.');
 if(gallery.length&&gallery[0].url!==base.image)throw new Error('La primera imagen debe ser la portada.');
 return {...base,sku,details,gallery,stock_tracking:b.stock_tracking,stock_minimum:Number(b.stock_minimum),sort_order:Number(b.sort_order)};
}
export function validateStock(b:Record<string,unknown>){
 if(typeof b.product_id!=='string'||!/^[a-z0-9-]{1,64}$/.test(b.product_id))throw new Error('Producto inválido.');
 if(!Number.isInteger(b.delta)||Number(b.delta)===0||Math.abs(Number(b.delta))>1000000)throw new Error('Ingresá un movimiento distinto de cero.');
 if(!Number.isInteger(b.expected_quantity)||Number(b.expected_quantity)<0||Number(b.expected_quantity)>1000000||Number(b.expected_quantity)+Number(b.delta)<0||Number(b.expected_quantity)+Number(b.delta)>1000000)throw new Error('El stock no puede quedar negativo ni superar 1.000.000.');
 if(typeof b.request_key!=='string'||!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(b.request_key))throw new Error('Identificador de movimiento inválido.');
 if(text(b,'reason',300,true).length<3)throw new Error('Escribí un motivo de al menos 3 caracteres.');
 return {product_id:b.product_id,delta:Number(b.delta),expected_quantity:Number(b.expected_quantity),request_key:b.request_key,reason:text(b,'reason',300,true)};
}
export function validateSettings(b:Record<string,unknown>):ShopSettings{
 const out=Object.fromEntries(Object.keys(defaultSettings).map(k=>[k,text(b,k,k==='hero_description'?700:200,['business_name','location','hero_title','hero_description'].includes(k))])) as ShopSettings;
 if(!/^\d{8,15}$/.test(out.whatsapp))throw new Error('WhatsApp debe incluir país y área, solo números.');
 if(out.contact_email&&!/^\S+@\S+\.\S+$/.test(out.contact_email))throw new Error('Correo inválido.');
 if(out.instagram&&!/^https:\/\/(www\.)?instagram\.com\/[a-zA-Z0-9_.]+\/?$/.test(out.instagram))throw new Error('Ingresá el enlace de tu perfil de Instagram.');
 if(!validImageUrl(out.hero_image))throw new Error('Imagen de portada inválida.');
 return out;
}
export function validateOrderUpdate(b:Record<string,unknown>){
 if(typeof b.id!=='string'||!/^[a-f0-9-]{36}$/i.test(b.id)||typeof b.fulfillment_status!=='string'||!Object.hasOwn(fulfillmentLabels,b.fulfillment_status))throw new Error('Pedido o estado inválido.');
 return {id:b.id,fulfillment_status:b.fulfillment_status,admin_notes:text(b,'admin_notes',2000),shipping_carrier:text(b,'shipping_carrier',80),tracking_code:text(b,'tracking_code',120)};
}
export function validImageBytes(bytes:Uint8Array,type:string){return (type==='image/png'&&bytes.length>8&&[137,80,78,71,13,10,26,10].every((n,i)=>bytes[i]===n))||(type==='image/jpeg'&&bytes.length>3&&bytes[0]===255&&bytes[1]===216&&bytes[2]===255)||(type==='image/webp'&&bytes.length>12&&String.fromCharCode(...bytes.slice(0,4))==='RIFF'&&String.fromCharCode(...bytes.slice(8,12))==='WEBP');}
