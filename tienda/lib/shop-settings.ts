import 'server-only';
import {createClient} from '@supabase/supabase-js';
import {databaseConfigured} from './supabase';
import {defaultSettings,resolveSettings,type ShopSettings} from './admin';

export async function getShopSettings({strict=false}:{strict?:boolean}={}):Promise<ShopSettings>{
 try{
  if(!databaseConfigured())throw new Error('Store settings database is not configured.');
  const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,{
   auth:{persistSession:false,autoRefreshToken:false},
   global:{fetch:(input,init)=>fetch(input,{...init,cache:'no-store',signal:AbortSignal.timeout(8000)})},
  });
  const {data,error}=await db.from('tienda_configuracion').select('data').eq('id','main').single();
  if(error||!data)throw new Error('Store settings unavailable.');
  return resolveSettings(data.data);
 }catch(error){
  if(strict)throw error;
  return defaultSettings;
 }
}
