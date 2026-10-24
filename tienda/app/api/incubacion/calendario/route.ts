import {supabaseServer,databaseConfigured} from '@/lib/supabase';
import {calendarFor} from '@/lib/incubation-report';
import type {Lot} from '@/lib/incubation';
export async function GET(){
 if(!databaseConfigured())return new Response('Conexión no disponible.',{status:503});
 const db=await supabaseServer();const {data:{user}}=await db.auth.getUser();
 if(!user)return new Response('Ingresá a tu cuenta.',{status:401});
 const {data,error}=await db.from('incubacion_lotes').select('*').eq('owner_id',user.id).is('born',null);
 if(error)return new Response('No pudimos consultar tus incubaciones.',{status:503});
 return new Response(calendarFor((data??[]) as Lot[]),{headers:{'Content-Type':'text/calendar; charset=utf-8','Content-Disposition':'attachment; filename="incubaciones-granja-atuel.ics"','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
}
