import Link from 'next/link';
import {getShopSettings} from '@/lib/shop-settings';

export const dynamic='force-dynamic';
export const metadata={title:'Buenas Prácticas · Términos y Privacidad · Granja Atuel'};

export default async function GoodPracticesPage(){
 const settings=await getShopSettings();
 return <>
  <div className="preview-bar"><span>VISTA DE PRUEBAS</span>Nueva web de Granja Atuel</div>
  <header className="header"><Link href="/"><img className="logo" src="/logo-granja-atuel-web.webp" alt="Granja Atuel"/></Link><nav className="inc-nav"><Link href="/incubacion">Mis incubaciones</Link><Link href="/">Volver a la tienda</Link></nav></header>
  <main className="inc-shell practices-shell">
   <p className="eyebrow">INFORMACIÓN CLARA, CUIDADO COMPARTIDO</p>
   <h1>Buenas Prácticas</h1><p>Términos y Privacidad de la app de incubaciones.</p><p className="inc-small">Actualizado el 24 de octubre de 2026.</p>
   <nav className="inc-actions practices-nav" aria-label="Contenido"><Link className="text-link" href="#terminos">Términos de uso</Link><Link className="text-link" href="#privacidad">Privacidad</Link><Link className="text-link" href="#contacto">Contacto</Link></nav>
   <section className="inc-panel" id="terminos"><h2>Términos de uso</h2><p>La app permite registrar incubaciones, seguir sus etapas y consultar el historial desde tu cuenta. Podés utilizarla con huevos de Granja Atuel, de otro proveedor o de producción propia.</p><p>Las fechas y los protocolos son orientativos y pueden ajustarse al crear el lote. Los registros son aportados por cada usuario; la app no diagnostica embriones ni garantiza nacimientos. Los huevos con desarrollo se calculan restando los descartados a la cantidad inicial y no equivalen a una medición de fertilidad confirmada.</p><p>Cada cliente administra sus propios registros. Cuidá el acceso a tu cuenta e ingresá información lo más precisa posible para que el seguimiento sea útil.</p></section>
   <section className="inc-panel" id="privacidad"><h2>Privacidad</h2><h3>Registros de incubación y seguimiento</h3><p>Las incubaciones que registres estarán vinculadas a tu cuenta. El equipo autorizado de Granja Atuel podrá consultar esos registros para brindar asistencia, realizar el seguimiento de los resultados y mejorar sus productos y servicios.</p><p>Los registros individuales no se mostrarán públicamente ni serán visibles para otros usuarios. Cualquier publicación que permita identificarte requerirá tu autorización previa.</p><h3>Información que utilizamos</h3><p>Utilizamos el correo asociado a tu cuenta para identificarte y gestionar tu acceso. Los registros pueden incluir el nombre del lote, la especie, el origen y proveedor, las cantidades, las fechas, la incubadora, las notas y las observaciones que ingreses.</p><p>El acceso de Granja Atuel es para consulta interna y seguimiento. No necesitás activar una autorización en cada lote y tus registros no se publican automáticamente.</p><h3>Control de tus registros</h3><p>Desde tu cuenta podés consultar tus incubaciones, corregir las etapas disponibles y eliminar tus lotes. Si necesitás asistencia con tus datos o tu cuenta, contactanos por los canales indicados abajo.</p><p>Las cookies de sesión permiten mantener tu acceso. Ingresar con Google o con correo y contraseña no habilita por sí solo el envío de mensajes comerciales.</p></section>
   <section className="inc-panel" id="contacto"><h2>Contacto</h2><p>Para consultas sobre el funcionamiento de la app o el uso de tus registros, escribí a {settings.business_name}.</p><div className="inc-actions">{settings.contact_email&&<a className="text-link" href={'mailto:'+settings.contact_email}>{settings.contact_email}</a>}<a className="text-link" href={'https://wa.me/'+settings.whatsapp}>Contactar por WhatsApp</a></div></section>
  </main>
 </>;
}
