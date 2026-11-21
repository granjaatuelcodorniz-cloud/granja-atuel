import {canBuy,money,stockLimit,type Product} from './catalog.ts';
import type {PurchaseMode} from './site-release.ts';

export type PaymentLink={product_id:string;url:string;amount_ars:number;updated_at:string};

export function validPaymentLink(url:unknown):url is string {
 return typeof url==='string'&&/^https:\/\/mpago\.la\/[A-Za-z0-9]{1,80}\/?$/.test(url);
}

export function paymentLinkFor(product:Product,link?:Pick<PaymentLink,'url'|'amount_ars'>){
 return canBuy(product)&&link?.amount_ars===product.price&&validPaymentLink(link.url)?link.url:null;
}

export function purchaseStatus(product:Product,mode:PurchaseMode,link?:PaymentLink){
 if(!product.active)return 'La ficha está fuera de la tienda.';
 if(!product.available)return 'Solo consultas por WhatsApp.';
 if(stockLimit(product)===0)return 'Sin stock para vender.';
 if(mode==='test')return 'Compra de prueba.';
 if(mode==='links'){
  if(!link)return 'Falta el enlace de cobro.';
  if(link.amount_ars!==product.price)return 'El enlace cobra '+money(link.amount_ars)+' y debe coincidir con el precio final.';
 }
 return 'Compra en línea habilitada.';
}
