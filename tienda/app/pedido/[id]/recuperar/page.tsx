import Link from 'next/link';
import {notFound} from 'next/navigation';
import RestoreOrder from '@/components/RestoreOrder';
import {orderIdPattern} from '@/lib/payment-config';

export const metadata={title:'Recuperar mi pedido · Granja Atuel'};

export default async function RestoreOrderPage({params}:{params:Promise<{id:string}>}){
 const {id}=await params;
 if(!orderIdPattern.test(id))notFound();
 return <main className="inc-shell">
  <header className="inc-header">
   <Link href="/"><img className="logo" src="/logo-granja-atuel-web.webp" alt="Granja Atuel"/></Link>
   <Link className="text-link" href="/#productos">Volver a la tienda</Link>
  </header>
  <section className="inc-panel purchase-privacy">
   <h1>Recuperá tu pedido</h1>
   <p>Abrí el pedido en este navegador para revisar el pago y seguir el envío.</p>
   <RestoreOrder id={id}/>
   <Link className="text-link" href={'/pedido/'+id}>Ayuda con mi pedido</Link>
  </section>
 </main>;
}
