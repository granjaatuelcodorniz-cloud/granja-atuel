import {NextResponse} from 'next/server';
import {WebhookSignatureValidator} from 'mercadopago';
import {checkoutReady,reconcilePayment} from '@/lib/order-server';
export async function POST(request:Request){
 const reply=(status:number)=>NextResponse.json({received:status===200},{status,headers:{'Cache-Control':'no-store'}});
 const secret=process.env.MERCADOPAGO_WEBHOOK_SECRET;if(!checkoutReady()||!secret)return reply(503);
 const url=new URL(request.url);const id=url.searchParams.get('data.id');if(!id||!/^\d{1,30}$/.test(id)||url.searchParams.get('type')!=='payment')return reply(400);
 try{WebhookSignatureValidator.validate({xSignature:request.headers.get('x-signature'),xRequestId:request.headers.get('x-request-id'),dataId:id,secret});}catch{return reply(401);}
 // The signed ID only selects the resource; all payment facts come from MP.
 try{await reconcilePayment(id);return reply(200);}catch{return reply(503);}
}
