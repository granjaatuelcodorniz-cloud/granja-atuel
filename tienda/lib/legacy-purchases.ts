import {canBuy,type Product} from './catalog.ts';

// Published links and price snapshots from the former storefront.
const activeLinks:Record<string,{price:number;url:string}>={
 'consumo-5':{price:25000,url:'https://mpago.la/11TRxkJ'},
 'consumo-10':{price:38000,url:'https://mpago.la/1HPrFSq'},
 'fertiles-5':{price:54000,url:'https://mpago.la/2qbsnRt'},
 'fertiles-10':{price:98000,url:'https://mpago.la/27Cp2BJ'},
 'blister-200':{price:82000,url:'https://mpago.la/1yqnBnb'},
};
export function legacyPurchaseLink(product:Product){
 if(!canBuy(product)||!Object.hasOwn(activeLinks,product.id))return null;
 const link=activeLinks[product.id];
 return link.price===product.price?link.url:null;
}
export function productInquiry(p:Product,whatsapp:string){
 return 'https://wa.me/'+whatsapp+'?text='+encodeURIComponent('Hola, quería consultar por '+p.name+' · '+p.description+'.');
}
