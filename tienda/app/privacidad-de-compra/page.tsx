import Link from 'next/link';
import {getShopSettings} from '@/lib/shop-settings';

export const metadata={title:'Privacidad de compra · Granja Atuel'};

export default async function PurchasePrivacy(){
 const settings=await getShopSettings();
 const whatsapp='https://wa.me/'+settings.whatsapp+'?text='+encodeURIComponent('Hola, quisiera consultar por los datos de mi pedido.');
 return <main className="inc-shell">
  <header className="inc-header">
   <Link href="/"><img className="logo" src="/logo-granja-atuel-web.webp" alt="Granja Atuel"/></Link>
   <Link className="text-link" href="/#productos">Volver a la tienda</Link>
  </header>
  <article className="inc-panel purchase-privacy">
   <h1>Privacidad de compra</h1>
   <p>{settings.business_name}, de San Rafael, Mendoza, usa los datos que ingresás para gestionar tu pedido, verificar el pago, coordinar la entrega y atender consultas sobre la compra.</p>
   <section>
    <h2>Datos que usamos</h2>
    <p>Al guardar el pedido registramos el nombre y apellido, correo, teléfono y domicilio de entrega. El DNI de quien recibe se solicita cuando el despacho lo requiere. Los datos marcados como obligatorios permiten preparar la entrega. Podés dejar en blanco las referencias opcionales.</p>
   </section>
   <section>
    <h2>Pago y entrega</h2>
    <p>Mercado Pago procesa el pago en su propio sitio. La tienda guarda el estado, importe y número de operación para identificarlo y dejar constancia. Compartimos con el transportista los datos necesarios para entregar el pedido.</p>
   </section>
   <section>
    <h2>Pedidos pendientes y acceso</h2>
    <p>Los datos se guardan al iniciar el pedido, antes del pago. Si queda pendiente, se conservan para conciliar pagos informados, retomar el pedido y atender consultas mientras sean necesarios para esas finalidades.</p>
    <p>La ficha del pedido usa una cookie para reconocer tu acceso en ese navegador. Si guardás un enlace privado para recuperar el pedido, mantenelo en un lugar seguro.</p>
   </section>
   <section>
    <h2>Tus datos y contacto</h2>
    <p>Podés solicitar acceso, rectificación, actualización o supresión de tus datos. Indicá la referencia del pedido si la tenés para que podamos identificarlo y verificar la solicitud.</p>
    <div className="inc-actions">
     {settings.contact_email&&<a className="text-link" href={'mailto:'+settings.contact_email}>Contactar por correo</a>}
     <a className="text-link" href={whatsapp} target="_blank" rel="noreferrer">Consultar por WhatsApp</a>
    </div>
   </section>
  </article>
 </main>;
}
