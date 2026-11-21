import 'server-only';
import {createClient} from '@supabase/supabase-js';
import {databaseConfigured} from './supabase';
import type {PaymentLink} from './payment-links';

export const linkOrdersConfigured=()=>databaseConfigured()&&/^[a-f0-9]{64}$/.test(process.env.ATUEL_LINK_ORDERS_KEY??'');

export function linkPurchaseClient(){
 if(!linkOrdersConfigured())return null;
 return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,{
  auth:{persistSession:false,autoRefreshToken:false},
  global:{fetch:(input,init)=>fetch(input,{...init,cache:'no-store',signal:AbortSignal.timeout(8000)})},
 });
}

type StoreLink=Omit<PaymentLink,'updated_at'>;

export async function getPaymentLinks(){
 const links=new Map<string,StoreLink>();
 const db=linkPurchaseClient();
 if(!db)return links;
 const {data,error}=await db.rpc('tienda_payment_links',{p_key:process.env.ATUEL_LINK_ORDERS_KEY});
 if(error){console.error('Payment link catalog unavailable:',error.code);return links;}
 for(const row of (data??[]) as StoreLink[])links.set(row.product_id,row);
 return links;
}
