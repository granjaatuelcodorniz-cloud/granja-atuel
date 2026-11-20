import 'server-only';
import {createClient} from '@supabase/supabase-js';
import {databaseConfigured} from './supabase';
import {defaultSettings,resolveSettings,type ShopSettings} from './admin';
export async function getShopSettings():Promise<ShopSettings>{if(!databaseConfigured())return defaultSettings;const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,{auth:{persistSession:false,autoRefreshToken:false}});const {data,error}=await db.from('tienda_configuracion').select('data').eq('id','main').single();if(error)return defaultSettings;return resolveSettings(data.data);}
