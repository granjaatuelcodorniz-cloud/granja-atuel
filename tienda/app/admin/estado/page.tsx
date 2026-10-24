import Link from 'next/link';
import {redirect} from 'next/navigation';
import {getAdmin} from '@/lib/supabase';
import {checkoutReady} from '@/lib/order-server';
export const dynamic='force-dynamic';
export default async function IntegrationStatus(){
 if(!await getAdmin())redirect('/admin/login');
 const payment=checkoutReady(),webhook=!!process.env.MERCADOPAGO_WEBHOOK_SECRET;
 const rows=[
  ['Mercado Pago de pruebas',payment?'Configurado':'Faltan variables de prueba','El cobro productivo sigue deshabilitado.'],
  ['Firma de notificaciones',webhook?'Secreto configurado':'Falta el secreto de webhook','También se debe comprobar que Mercado Pago pueda acceder al endpoint protegido por Vercel.'],
  ['Correo Argentino y Andreani','Pendiente de credenciales y condiciones','La web aún no cotiza envíos ni genera rótulos.'],
  ['Reservas de stock para ventas reales','Pendiente de la activación comercial','Los pedidos de prueba no reservan ni descuentan existencias reales.'],
  ['Recuperación de acceso','Flujo incorporado; falta validar recepción','El cliente solicita el enlace desde Olvidé mi contraseña. Hay que comprobar el correo transaccional de Supabase con su titular.'],
  ['Recordatorios de incubación','En la app y mediante calendario','El cliente descarga las fechas y configura sus avisos en su calendario. No se envían correos de recordatorio.']
 ];
 return <main className="inc-shell"><Link className="text-link" href="/admin">← Volver al dashboard</Link><p className="eyebrow" style={{marginTop:30}}>ANTES DE PASAR A PRODUCCIÓN</p><h1>Estado de las integraciones</h1><p>El proyecto sigue en paralelo y en modo de pruebas.</p><div className="inc-lots">{rows.map(([name,state,detail])=><section className="inc-panel" key={name}><h2>{name}</h2><strong>{state}</strong><p>{detail}</p></section>)}</div></main>;
}
