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
No hay dudosos ni rotos de recepción. Nacimientos: total, fecha, observaciones y
consentimiento opcional. Se validan límites y las escrituras usan versión para
rechazar cambios simultáneos. Compartir el texto de un resultado es una acción
del cliente, separada del permiso de lectura para la granja.

`/huevos-fertiles` amplía la información y consulta precios actuales del catálogo.
`/admin/incubaciones` muestra solo resultados autorizados, filtrados por especie
con sumas ponderadas, origen, tamaño de muestra y observaciones. No publica
estadísticas ni presenta el desarrollo como fertilidad confirmada.

## Permisos y datos existentes

SQL aplicado, no volver a ejecutar: `db/catalog-schema.sql` y
`db/incubation-schema.sql` y `db/incubation-provider-name.sql`. Antes de sumar clientes se agregó una política RLS
restrictiva a las 15 tablas internas, con membresía explícita para las dos cuentas
existentes de gestión. Sus políticas anteriores se conservan. Las futuras cuentas
internas deben habilitarse deliberadamente por un administrador de la base.
No se modificaron los registros existentes de ventas, finanzas o clientes.

Cada cliente puede leer, crear, actualizar y eliminar únicamente sus lotes.
El administrador de tienda tiene lectura de lotes con consentimiento, sin permiso
de edición de los resultados ajenos. El cliente puede retirar esa autorización.
No se conceden escrituras de membresía a anon/authenticated ni se confía en
user_metadata. Se probó aislamiento, acceso interno y consentimiento con usuarios
temporales dentro de una transacción revertida. No se conservaron datos de prueba.

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
