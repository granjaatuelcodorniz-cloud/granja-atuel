import Link from 'next/link';
import {redirect} from 'next/navigation';
import {getAdmin} from '@/lib/supabase';
import {currentPaymentConfig} from '@/lib/order-server';
import {checkoutAvailable} from '@/lib/payment-config';

export const dynamic='force-dynamic';
export default async function IntegrationStatus(){
 if(!await getAdmin())redirect('/admin/login');
 const config=currentPaymentConfig();
 const rows=[
  ['Mercado Pago · Granja Atuel',checkoutAvailable(config,process.env)?config?.mode==='test'?'Compra de prueba habilitada':'Checkout habilitado':'Checkout deshabilitado','Desde el detalle de un pedido podés consultar a Mercado Pago y conciliar el pago.'],
  ['Confirmación automática',config?.webhookSecret?'Firma configurada; verificá recepción en Mercado Pago':'Pendiente de configurar en Mercado Pago','El aviso firmado confirma pagos aunque el comprador no vuelva a la tienda.'],
  ['Envíos','Incluidos en el precio · despacho manual','El pedido guarda el domicilio. En Pedidos podés copiar los datos y cargar transportista y seguimiento.'],
  ['Inventario','Control por presentación','Consultá Inventario para actualizar las existencias. Los pedidos de prueba no las descuentan.'],
  ['Recuperación de acceso','Flujo incorporado; falta validar recepción','El cliente solicita el enlace desde Olvidé mi contraseña. Hay que comprobar el correo transaccional de Supabase con su titular.'],
  ['Recordatorios de incubación','En la app y mediante calendario','El cliente descarga las fechas y configura sus avisos en su calendario. No se envían correos de recordatorio.']
 ];
 return <main className="inc-shell"><Link className="text-link" href="/admin">← Volver al panel</Link><p className="eyebrow" style={{marginTop:30}}>GRANJA ATUEL</p><h1>Estado de la tienda</h1><div className="inc-lots">{rows.map(([name,state,detail])=><section className="inc-panel" key={name}><h2>{name}</h2><strong>{state}</strong><p>{detail}</p></section>)}</div></main>;
}
