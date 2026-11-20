import {NextResponse} from 'next/server';
import {currentPaymentConfig,reconcilePayment,PaymentProviderError,PaymentVerificationError} from '@/lib/order-server';
import {paymentIdPattern} from '@/lib/payment-config';
import {verifiedWebhookPaymentId} from '@/lib/payment-webhook';

export async function POST(request:Request){
 const reply=(status:number)=>NextResponse.json({received:status===200},{status,headers:{'Cache-Control':'no-store'}});
 const config=currentPaymentConfig();
 if(!config?.webhookSecret)return reply(503);
 if(config.mode==='production'&&request.headers.get('host')!==new URL(config.origin).host)return reply(404);
 const url=new URL(request.url);
 const id=url.searchParams.get('data.id');
 if(url.searchParams.get('type')!=='payment'||!id||!paymentIdPattern.test(id))return reply(400);
 if(!verifiedWebhookPaymentId(request,config.webhookSecret))return reply(401);
 try{await reconcilePayment(config,id);return reply(200);}
 catch(e){
  if(e instanceof PaymentProviderError&&e.status===404)return reply(200);
  if(e instanceof PaymentVerificationError)console.warn('MP_WEBHOOK_NOT_CONFIRMED',e.code);
  return reply(503);
 }
}
