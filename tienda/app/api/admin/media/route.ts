import {randomUUID} from 'node:crypto';
import {supabaseServer} from '@/lib/supabase';
import {authorizeAdmin,adminReply} from '@/lib/admin-server';
import {readSmallJson} from '@/lib/request';
import {validImageBytes} from '@/lib/admin';
export async function POST(request:Request){
 const access=await authorizeAdmin(request);if(access.error)return access.error;
 if(!request.headers.get('content-type')?.includes('multipart/form-data')||Number(request.headers.get('content-length')||0)>2300000)return adminReply({error:'Subí una imagen de hasta 2 MB.'},400);
 try{const form=await request.formData();const file=form.get('file');if(!(file instanceof File)||!['image/webp','image/jpeg','image/png'].includes(file.type)||file.size<12||file.size>2097152)return adminReply({error:'Usá WebP, JPG o PNG de hasta 2 MB.'},400);
 const bytes=new Uint8Array(await file.arrayBuffer());if(!validImageBytes(bytes,file.type))return adminReply({error:'El archivo no contiene una imagen compatible.'},400);
 const name=String(form.get('name')||file.name).slice(0,150);const alt=String(form.get('alt')||'').slice(0,200);const path='products/'+randomUUID()+'.'+({'image/webp':'webp','image/jpeg':'jpg','image/png':'png'}[file.type]);const db=await supabaseServer();const upload=await db.storage.from('tienda-productos').upload(path,bytes,{contentType:file.type,cacheControl:'31536000',upsert:false});if(upload.error)return adminReply({error:'No pudimos subir la imagen.'},500);
 const url=db.storage.from('tienda-productos').getPublicUrl(path).data.publicUrl;const result=await db.from('tienda_imagenes').insert({url,path,name,alt}).select('*').single();if(result.error)return adminReply({error:'La imagen se subió, pero no pudimos registrarla en la biblioteca.'},500);
 return adminReply({media:result.data});}catch{return adminReply({error:'No pudimos procesar la imagen.'},400);}
}
export async function PUT(request:Request){const access=await authorizeAdmin(request);if(access.error)return access.error;try{const b=await readSmallJson(request);if(typeof b.id!=='string'||!/^[a-f0-9-]{36}$/i.test(b.id)||typeof b.name!=='string'||!b.name.trim()||b.name.length>150||typeof b.alt!=='string'||b.alt.length>200||typeof b.archived!=='boolean')return adminReply({error:'Revisá los datos de la imagen.'},400);const db=await supabaseServer();const {data,error}=await db.from('tienda_imagenes').update({name:b.name.trim(),alt:b.alt.trim(),archived:b.archived}).eq('id',b.id).select('*').single();if(error)return adminReply({error:'No pudimos guardar la imagen.'},500);return adminReply({media:data});}catch{return adminReply({error:'Solicitud inválida.'},400);}}
