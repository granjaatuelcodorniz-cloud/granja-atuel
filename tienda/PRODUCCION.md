# Publicación de Granja Atuel

- El sitio público queda en `https://www.granjaatuel.com.ar` y mantiene el dominio y la página de inicio. El proyecto Vercel existente toma Next.js desde `tienda/`. Los dominios de pruebas no se indexan.
- El inicio conserva el título, la descripción, las secciones principales y los destinos de enlaces internos. `/index.html` redirige al inicio. Los enlaces anteriores de recetas redirigen a fichas permanentes; el sitemap usa esas fichas y las publicaciones activas.
- La app de incubación pública mantiene `/incubacion`, su manifiesto y sus archivos. Los lotes se guardan en el navegador, en el mismo origen y con la misma clave. El cuaderno con cuentas permanece en la vista de pruebas.
- Para habilitar el sitio público, el despliegue debe ser de producción con `ATUEL_PUBLIC_SITE=true`, conexión al catálogo Supabase y `MERCADOPAGO_MODE=production`. El entorno de producción puede usar los enlaces vigentes de Mercado Pago mientras se termina la configuración de Checkout Pro. Los enlaces requieren el formulario de envío y un pedido guardado en la tienda. Configurar `ATUEL_LINK_ORDERS_KEY` como variable sensible y registrar solo su hash SHA-256 en `tienda_privado.link_order_keys`. Si cambia el precio o se pausa o agota la publicación, el enlace ya no se abre.
- Verificar cada publicación de producción antes de asignar el dominio. El deployment estático anterior sigue disponible en Vercel para volver atrás. No sustituirlo con una compilación de la rama actual.
- Después del cambio: revisar inicio, catálogo, recetas, incubación y panel en el dominio público; enviar `sitemap.xml` en Search Console. En los siguientes días comparar clics e impresiones por página, cobertura y URLs destacadas con el período anterior. Una publicación técnica correcta no garantiza que las posiciones sean idénticas.

## Pedidos por enlace de pago

- El cliente completa el domicilio antes de pagar. Puede informar el número de operación al volver desde Mercado Pago. Los datos de envío quedan en **Pedidos**.
- Compará el número, el pagador y el importe con la operación aprobada en la cuenta de Granja Atuel. Confirmá el pago en el pedido y cargá el seguimiento cuando despaches. Un número confirmado no puede usarse en otro pedido.
- Los enlaces fijos permiten una presentación por pedido. Checkout Pro conserva su verificación automática y el carrito cuando se habilita en producción.

## Atención y datos de envío

- En la ficha privada del pedido, WhatsApp y el correo de contacto usan los datos de **Portada y contacto**. La consulta se abre con la referencia corta del pedido.
- En **Portada y contacto → Datos de envío**, activá **Pedir DNI de quien recibe** si tu operador lo necesita para el despacho. Se solicita en los próximos pedidos y se consulta en el detalle de entrega del panel.
