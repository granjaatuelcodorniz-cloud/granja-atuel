import {adminReply} from '@/lib/admin-server';
import {getAdminSession} from '@/lib/supabase';
import {sameOrigin,readSmallJson} from '@/lib/request';

const factorName='Granja Atuel';

export async function POST(request:Request){
 if(!sameOrigin(request))return adminReply({error:'Origen no permitido.'},403);
 const session=await getAdminSession();
 if(!session)return adminReply({error:'Iniciá sesión como administrador.'},401);
 if(session.verified)return adminReply({verified:true});
 let body;
 try{body=await readSmallJson(request);}catch{return adminReply({error:'Revisá los datos.'},400);}
 const {db}=session;
 const {data:factors,error}=await db.auth.mfa.listFactors();
 if(error)return adminReply({error:'No pudimos consultar tus verificaciones. Intentá de nuevo.'},503);

 if(body.action==='enroll'){
  if(factors.totp.length)return adminReply({error:'Ya tenés una aplicación configurada. Actualizá la página para ingresar el código.'},409);
  const abandoned=factors.all.filter(f=>f.factor_type==='totp'&&f.status==='unverified'&&f.friendly_name===factorName);
  for(const factor of abandoned){
   if((await db.auth.mfa.unenroll({factorId:factor.id})).error)return adminReply({error:'No pudimos reiniciar la configuración. Intentá de nuevo.'},503);
  }
  const result=await db.auth.mfa.enroll({factorType:'totp',friendlyName:factorName});
  if(result.error)return adminReply({error:'No pudimos iniciar la configuración. Intentá de nuevo.'},503);
  return adminReply({factorId:result.data.id,qr:result.data.totp.qr_code,secret:result.data.totp.secret});
 }

 if(body.action!=='verify'||typeof body.code!=='string'||!/^[0-9]{6}$/.test(body.code))
  return adminReply({error:'Ingresá el código de seis dígitos.'},400);
 const allowed=factors.totp.length?factors.totp:factors.all.filter(f=>f.factor_type==='totp'&&f.status==='unverified'&&f.friendly_name===factorName);
 const factor=allowed.find(f=>f.id===body.factorId);
 if(!factor)return adminReply({error:'La configuración cambió. Actualizá la página e intentá de nuevo.'},400);
 const result=await db.auth.mfa.challengeAndVerify({factorId:factor.id,code:body.code});
 if(result.error)return adminReply({error:result.error.status===429?'Esperá un momento antes de volver a intentar.':'Revisá que el código sea el actual de tu aplicación e intentá de nuevo.'},result.error.status===429?429:400);
 return adminReply({verified:true});
}
