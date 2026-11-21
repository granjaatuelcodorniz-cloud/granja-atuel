import {NextResponse} from 'next/server';
import {orderVisitor} from '@/lib/order-access';
import {indexableHost,siteOrigin} from '@/lib/site-release';
import {orderIdPattern} from '@/lib/payment-config';
import {currentLinkForOrder,linkOrdersConfigured,readLinkOrder} from '@/lib/link-orders';

export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){
 const {id}=await params;
 const responseHeaders={'Cache-Control':'private, no-store','Referrer-Policy':'no-referrer','X-Robots-Tag':'noindex'};
 if(!orderIdPattern.test(id)||!indexableHost(request.headers.get('host')))return new Response(null,{status:404,headers:responseHeaders});
 const back=new URL('/pedido/'+id,siteOrigin);
 const hash=await orderVisitor(id);
 try{
  const order=hash&&linkOrdersConfigured()?await readLinkOrder(id,hash):null;
  if(!order)return new Response(null,{status:404,headers:responseHeaders});
  const link=await currentLinkForOrder(order);
  if(link)return NextResponse.redirect(link,{status:303,headers:responseHeaders});
 }catch{back.searchParams.set('pago','intentar');return NextResponse.redirect(back,{status:303,headers:responseHeaders});}
 back.searchParams.set('pago','no-disponible');
 return NextResponse.redirect(back,{status:303,headers:responseHeaders});
}
