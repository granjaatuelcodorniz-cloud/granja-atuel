import 'server-only';
import {createClient} from '@supabase/supabase-js';
import {databaseConfigured} from './supabase';
import {seedContent} from './site-content-seed';
import type {ContentKind,SiteContent} from './site-content';
export const contentFields='id,kind,data,published,position,updated_at' as const;

export async function getPublicContent(kind?:ContentKind):Promise<SiteContent[]> {
 if(!databaseConfigured())return seedContent.filter(c=>c.published&&(!kind||c.kind===kind));
 const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,{auth:{persistSession:false,autoRefreshToken:false}});
 let query=db.from('tienda_contenidos').select(contentFields).eq('published',true);
 if(kind)query=query.eq('kind',kind);
 const {data,error}=await query.order('position').order('id').limit(500);
 if(error){console.error('Store content unavailable:',error.code);return [];}
 return data as SiteContent[];
}
