import {WebhookSignatureValidator} from 'mercadopago';
import {paymentIdPattern} from './payment-config.ts';

export function verifiedWebhookPaymentId(request:Request,secret:string){
 const url=new URL(request.url);
 const ids=url.searchParams.getAll('data.id');
 const types=url.searchParams.getAll('type');
 const xRequestId=request.headers.get('x-request-id');
 const signature=request.headers.get('x-signature');
 if(ids.length!==1||!paymentIdPattern.test(ids[0])||types.length!==1||types[0]!=='payment'||!xRequestId||xRequestId.length>200||!signature||signature.length>300)return null;
 try{
  WebhookSignatureValidator.validate({xSignature:signature,xRequestId,dataId:ids[0],secret});
  return ids[0];
 }catch{return null;}
}
