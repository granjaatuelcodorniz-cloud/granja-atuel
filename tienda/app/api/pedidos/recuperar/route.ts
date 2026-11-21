import {NextResponse} from 'next/server';
import {restoreOrderAccess} from '@/lib/order-access';
import {sameOrigin,readSmallJson} from '@/lib/request';
import {indexableHost,publicRelease} from '@/lib/site-release';

export async function POST(request:Request){
 const reply=(body:unknown,status=200)=>NextResponse.json(body,{status,headers:{'Cache-Control':'private, no-store'}});
 if(!sameOrigin(request)||(publicRelease()&&!indexableHost(request.headers.get('host'))))return reply({error:'Abrí el enlace desde la dirección oficial de la tienda.'},403);
 let input;
 try{input=await readSmallJson(request);}catch{return reply({error:'Revisá el enlace recibido.'},400);}
 if(typeof input.id!=='string'||typeof input.token!=='string'||!await restoreOrderAccess(input.id,input.token))
  return reply({error:'El enlace venció o está incompleto. Pedinos un acceso nuevo.'},400);
 return reply({redirect:'/pedido/'+input.id});
}
