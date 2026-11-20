import { createClient } from '@supabase/supabase-js';
import { seedProducts, type Product } from './catalog';
import { databaseConfigured } from './supabase';
export async function getCatalog():Promise<{products:Product[]; source:'database'|'seed'|'unavailable'}> {
  if(!databaseConfigured()) return {products:seedProducts,source:'seed'};
  const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data,error}=await db.from('tienda_productos').select('*').eq('active',true).order('sort_order');
  // Do not silently restore old prices when the configured database fails.
  if(error) {console.error('Catalog database unavailable:',error.code); return {products:[],source:'unavailable'};}
  return {products:data as Product[],source:'database'};
}
