import 'server-only';
import {cookies} from 'next/headers';
import {visitor} from './order-server';
import {orderIdPattern} from './payment-config';
import {publicRelease} from './site-release';
import {openOrderAccess,sealOrderAccess} from './order-access-token';

const daySeconds=24*60*60;
const accessCookie=(id:string)=>'ga_order_access_'+id.toLowerCase();

function recoverySecret(){
 const key=process.env.ATUEL_LINK_ORDERS_KEY;
 return publicRelease()&&key&&/^[a-f0-9]{64}$/.test(key)?key:process.env.SUPABASE_SECRET_KEY;
}

export function recoveryPath(id:string,hash:string,delivery:'saved'|'email'){
 const secret=recoverySecret();
 if(!secret||!orderIdPattern.test(id)||!/^[a-f0-9]{64}$/.test(hash))return null;
 const duration=(delivery==='saved'?30:1)*daySeconds*1000;
 return '/pedido/'+id+'/recuperar#'+sealOrderAccess(secret,id,hash,Date.now()+duration,'restore');
}

export async function orderVisitor(id:string){
 if(!orderIdPattern.test(id))return null;
 const secret=recoverySecret();
 const token=secret?(await cookies()).get(accessCookie(id))?.value:null;
 const recovered=secret&&token?openOrderAccess(secret,id,token,'session'):null;
 return recovered?.hash??await visitor();
}

export async function restoreOrderAccess(id:string,token:string){
 const secret=recoverySecret();
 const restored=secret&&orderIdPattern.test(id)?openOrderAccess(secret,id,token,'restore'):null;
 if(!secret||!restored)return false;
 const now=Date.now();
 const maxAge=Math.min(daySeconds,Math.floor((restored.expiresAt-now)/1000));
 if(maxAge<=0)return false;
 const session=sealOrderAccess(secret,id,restored.hash,now+maxAge*1000,'session');
 (await cookies()).set(accessCookie(id),session,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge});
 return true;
}
