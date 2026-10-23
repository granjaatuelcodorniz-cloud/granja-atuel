import {NextResponse} from 'next/server';
import {getAdmin,supabaseServer} from '@/lib/supabase';
import {validateProduct} from '@/lib/catalog';
import {sameOrigin,readSmallJson} from '@/lib/request';
export async function PUT(request:Request){
 if(!sameOrigin(request))return NextResponse.json({error:'Origen no permitido.'},{status:403});
 if(!await getAdmin())return NextResponse.json({error:'Iniciá sesión con un administrador autorizado.'},{status:401});
 let product;try{product=validateProduct(await readSmallJson(request));}catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Producto inválido.'},{status:400});}
 const db=await supabaseServer();const {data,error}=await db.from('tienda_productos').update({...product,updated_at:new Date().toISOString()}).eq('id',product.id).select('id').single();
 if(error||!data)return NextResponse.json({error:'No pudimos guardar el producto. Volvé a intentar.'},{status:500});
 return NextResponse.json({ok:true},{headers:{'Cache-Control':'no-store'}});
}
