# Tienda y cuaderno de incubaciones Granja Atuel

Desarrollo aislado en `tienda/`, rama `desarrollo/tienda-next`, PR #1 en borrador.
El proyecto Vercel `granja-atuel-tienda-preview` usa esta carpeta. No fusionar ni
promover a producción antes de la validación completa. La web estática original
se conserva en la raíz; no se cambiaron dominios ni DNS.

## Desarrollo y validación

Node 22 o 24: `npm ci`, `.env.local` desde `.env.example`, `npm run dev`.
Validar con `npm test`, `npm run build`, `node tests/smoke.mjs`.
Solo hay claves públicas de Supabase; no se utiliza service_role.

## Incubaciones

`/incubacion` es una app nueva con registros por cuenta. No importa ni consulta
el historial localStorage de la versión anterior. `/incubacion.html` redirige a
la nueva app únicamente en este proyecto de pruebas.

Alta mínima: cantidad y fecha de inicio. Nombre, origen, incubadora, notas y
protocolo son opcionales. Al elegir otro proveedor se solicita y guarda su nombre. El protocolo inicial es Coturnix (ovoscopía día 10,
fin del volteo día 14, nacimiento estimado día 16, según el protocolo de Granja Atuel). El día de carga es día 0.
Las fechas se calculan por calendario y el día actual en Argentina.

Ovoscopía: solo se ingresan descartados; `developing` se calcula en Postgres.
No hay dudosos ni rotos de recepción. Nacimientos: total, fecha y observaciones. Se validan límites y las escrituras usan versión para
rechazar cambios simultáneos. Compartir el texto de un resultado es una acción
del cliente, separada de la consulta interna de la granja.

`/huevos-fertiles` amplía la información y consulta precios actuales del catálogo.
`/admin/incubaciones` muestra los registros para seguimiento interno, filtrados por especie
con sumas ponderadas, origen, tamaño de muestra y observaciones. No publica
estadísticas ni presenta el desarrollo como fertilidad confirmada.

## Permisos y datos existentes

SQL aplicado, no volver a ejecutar: `db/catalog-schema.sql` y
`db/incubation-schema.sql`, `db/incubation-provider-name.sql` y
`db/incubation-internal-access.sql`. Antes de sumar clientes se agregó una política RLS
restrictiva a las 15 tablas internas, con membresía explícita para las dos cuentas
existentes de gestión. Sus políticas anteriores se conservan. Las futuras cuentas
internas deben habilitarse deliberadamente por un administrador de la base.
No se modificaron los registros existentes de ventas, finanzas o clientes.

Cada cliente puede leer, crear, actualizar y eliminar únicamente sus lotes.
El administrador de tienda tiene lectura interna de todos los lotes, sin permiso
de edición de resultados ajenos. El aviso está visible antes del ingreso y en
Mis incubaciones; `/buenas-practicas#privacidad` explica el uso para seguimiento.
El campo histórico `share_results` se conserva sin modificar y no habilita
publicación ni condiciona el acceso interno. No hay registros públicos.
No se conceden escrituras de membresía a anon/authenticated ni se confía en
user_metadata. `tests/incubation-access.sql` comprueba lectura de administrador,
aislación entre clientes, denegación anónima y políticas de escritura por titular
en una transacción de solo lectura, sin crear datos de prueba.

La sesión usa cookies HTTP-only y validación de usuario en servidor/proxy.
Registro e ingreso: Supabase Auth con correo y contraseña. El registro conserva
la configuración de confirmación y envío de correo del proyecto existente.
Actualmente el proyecto tiene autoconfirmación de correo habilitada y permite
registro directo; no se cambió esa configuración. Falta validar con el propietario
su primer registro/ingreso desde la preview. Antes del lanzamiento, configurar y
validar correo transaccional, recuperación de contraseña y URL de confirmación
para la nueva web sin alterar las aplicaciones de gestión.

Admin catálogo: `/admin`, usuario `marcos` y su contraseña actual de gestión.
Los precios se consultan en Supabase. Pesos y medidas siguen pendientes de medir.

## Pendientes antes de vender

- Prueba de cuenta real, correo y recuperación de acceso; revisión de privacidad.
- Prueba de edición de catálogo desde la cuenta del propietario.
- Inventario, reservas, checkout y Mercado Pago de pruebas, webhook firmado e idempotente.
- Correo Argentino y Andreani: credenciales, embalajes, condiciones, tarifas y cupones.
- Validar información comercial definitiva de huevos fértiles con la granja.
- Verificar URLs/SEO, pedidos completos y recién entonces planificar producción.

La preview conserva protección Vercel, banner y noindex. No cobra ni genera envíos.
No se reutilizan credenciales de Teinvito ni se conecta el motor de recetas con IA.

## Acceso con Google en preview

El proveedor Google se configura en Supabase con las credenciales del cliente OAuth
web. Se usa PKCE con cookies HTTP-only, intercambio de código en `/auth/callback`
y retorno fijo a `/incubacion`. Los errores se muestran sin datos del proveedor.
La entrada desde URLs inmutables redirige primero al alias estable de pruebas para
que el verificador y el callback compartan host. No habilitar en producción sin
actualizar el origen canónico en ambas rutas y las listas permitidas del proveedor.
Se conserva la configuración Auth existente; no se concede ningún permiso de
administración por ingresar con Google. La prueba final requiere que el propietario
complete el selector de cuenta de Google desde el alias estable.

## Pedidos y Checkout Pro: solo pruebas

`/checkout` calcula desde el catálogo, crea un pedido privado y genera una
preferencia de Checkout Pro. La ruta solo opera con VERCEL_ENV=preview,
MERCADOPAGO_MODE=test y el ID de vendedor de pruebas configurado en MERCADOPAGO_TEST_SELLER_ID.
Antes de abrir el enlace se valida que el collector_id devuelto por la preferencia
coincida con ese ID obtenido del panel de credenciales de prueba, y que la
referencia coincida con el pedido. El proveedor rechazó /users/me con 403; no se
usa esa consulta. No se identifica el entorno por el formato de las claves.
Nunca determina el entorno mirando solo el prefijo APP_USR de la clave.
El cliente debe aceptar el mismo total que se muestra: si cambió, se rechaza el
intento antes de generar el pago. La clave de intento y el hash de la solicitud
impiden crear otro pedido por doble envío o alterar uno existente. No hay
reservas, descuento de stock, despachos ni escritura en las ventas de gestión.

SQL aplicado: `db/orders-schema.sql`. Las tablas tienen RLS, sin acceso cliente
de escritura. Solo el backend con `SUPABASE_SECRET_KEY` crea pedidos y registra
pagos; el administrador autorizado tiene lectura. No se imprime ni envía esta
clave al navegador. El comprador accede a su pedido por una cookie aleatoria
HTTP-only, cuyo hash se guarda en la base. No se usan UUIDs como autorización.
La página de retorno nunca confía en los estados recibidos por query string;
consulta a Mercado Pago. Valida vendedor, moneda, importe, referencia y entorno
de prueba, incluida la excepción del collector de prueba verificado que se detalla abajo. Los pagos se registran con bloqueo por pedido y por fecha del proveedor:
no duplican por reintentos ni degradan un aprobado por otro intento rechazado.

`/api/mercadopago/webhook` valida firma con el SDK oficial fijado a 3.6.1 y vuelve
a consultar el recurso a Mercado Pago. Requiere MERCADOPAGO_WEBHOOK_SECRET.
La protección de Vercel puede impedir recibir notificaciones externas: antes de
usar webhooks se debe resolver el acceso a esa ruta y probar entrega real. No se
retiró la protección. Mientras tanto, la página de pedido tiene conciliación
manual/automática al abrir por POST desde la sesión autorizada.

Configuración pendiente: SUPABASE_SECRET_KEY (clave secreta del proyecto, solo
Preview y Secret) y firma de webhook. La Public Key queda preparada para SDK de
interfaz, aunque la redirección a init_point no la necesita. El código está
preparado para probar, pero NO se verificó aún un pago real de sandbox. Las
credenciales sensibles de Vercel no se pueden leer desde el conector.

Antes de producción: correo de pedidos, historial ligado a cuenta, inventario y
reservas, políticas de entrega, rate limiting, monitoreo, privacidad, conciliación
completa de pagos divididos y prueba extremo a extremo. Ningún parámetro permite
activar cobros productivos en esta versión.

Los pagos de usuarios de prueba pueden devolver live_mode=true. Para ese caso
solo se acepta el collector 3450457878, verificado en el panel de credenciales
de prueba de Granja Atuel, y debe coincidir también con la configuración del
servidor. Un collector real u otro ID no obtiene esa excepción. Se conservan
las validaciones de pedido, moneda, importe, estado y fecha. Al regresar se
consulta el payment_id directamente; el status de la URL nunca autoriza el pago.


## Dashboard personalizado

/admin incluye resumen con datos reales del entorno de prueba, catálogo con alta,
edición, duplicación y archivo por despublicación, editor de fichas con descripción
completa, SKU, orden, peso y medidas. Cada producto tiene una ficha pública en
/producto/[id] y galería de hasta 8 imágenes, con portada, orden y textos alternativos.

La biblioteca admite JPG/PNG/WebP y convierte en el navegador a WebP (máximo
1800 px, hasta 2 MB). El servidor verifica tamaño, MIME y firma del archivo.
El bucket tienda-productos sirve imágenes públicas; solo administradores pueden
subir y consultar la biblioteca. Archivar oculta el selector sin romper las fichas.

El inventario usa presentaciones completas. El control se activa por producto:
cero impide agregar al carrito y el servidor rechaza cantidades superiores al
stock. Los ingresos, salidas y recuentos usan un RPC transaccional exclusivo de
service_role, accesible desde la API autenticada de administración. Cada movimiento
tiene motivo, autor e identificador de intento; usa bloqueo y comprobación del
stock esperado. El cliente no puede escribir stock_quantity directamente.
Las compras simuladas no reservan ni descuentan stock real.

Pedidos: últimos 200, búsqueda, filtros de pago, detalle, notas internas,
preparación y seguimiento manual. El estado financiero sigue siendo autoritativo
de Mercado Pago. Los cambios no disparan mensajes ni despachos. Configuración
edita portada, WhatsApp, contacto, Instagram y ubicación de la nueva tienda.

Migración aditiva: db/dashboard-schema.sql, aplicada a granja-gestor bajo el nombre
tienda_admin_dashboard_catalog_inventory_media. No modifica tablas de finanzas ni
la web estática. Validación: pruebas unitarias, build, pruebas HTTP de accesos y
CSRF, y transacciones SQL con rollback para CRUD de administrador, bloqueo de
escritura de stock, idempotencia y saldo no negativo. La prueba de carga de
imágenes y el recorrido visual requieren la sesión del administrador en /admin.
