# Tienda Granja Atuel — desarrollo en paralelo

Aplicación Next.js/TypeScript dentro de `tienda/`, rama `desarrollo/tienda-next`.
El sitio estático original y su configuración Vercel se conservan en la raíz.
No fusionar esta rama ni modificar el proyecto Vercel de producción para probar la tienda.

## Ejecutar

Node 22 o 24. Desde `tienda/`: `npm ci`, configurar `.env.local` a partir de
`.env.example`, `npm run dev`. Validación: `npm test` y `npm run build`.

## Datos y permisos

Se aplicó `tienda_parallel_catalog` en el proyecto Supabase de granja-gestor.
`db/catalog-schema.sql` conserva el SQL aplicado (no volver a ejecutarlo).
Solo se crearon `tienda_productos` y `tienda_admins`. No se modificaron ventas,
clientes, cuentas, finanzas ni usuarios existentes.

El catálogo es público cuando `active=true`. Solo el usuario existente Marcos,
identificado por su UUID de Auth en `tienda_admins`, tiene permisos de edición.
Un usuario autenticado distinto no puede editar ni darse permisos. No se ofrece
registro de compradores. No se usa user_metadata ni service_role.

Admin: `/admin`, usuario `marcos` y su contraseña actual de gestión.
La sesión se verifica en servidor, se renueva mediante proxy y usa cookies HTTP-only.
Los precios iniciales provienen de `data/productos.json` al iniciar el desarrollo.
No se inventaron pesos ni medidas; quedan nulos hasta medir el embalaje real.
La disponibilidad es manual, sin inventario ni reservas automáticas todavía.

## Publicar la vista previa en Vercel

Crear proyecto separado `granja-atuel-tienda-preview`, equipo Granja Atuel,
repositorio `granjaatuelcodorniz-cloud/granja-atuel`, directorio raíz `tienda`.
Desplegar la rama `desarrollo/tienda-next` como preview y mantener la protección
de despliegue. Configurar únicamente las dos variables públicas de `.env.example`.
No asignar los dominios actuales, no modificar DNS ni el proyecto `granja-atuel`.
El conector Vercel rechazó el acceso al equipo con 403 durante esta sesión.

La vista previa lleva banner, robots disallow y cabecera X-Robots-Tag noindex.
Estos controles evitan indexación, pero no sustituyen la protección de Vercel.
No hay endpoints de pago, pedidos reales ni creación de envíos.

## Pendientes antes del lanzamiento

- Pruebas visuales e interacción en escritorio y móvil sobre la URL desplegada.
- Probar inicio de sesión y cambio de precio desde navegador con el propietario.
- CRUD de nuevas presentaciones e imágenes; el primer admin edita las cinco iniciales.
- Definir inventario, reservas y vencimientos sin afectar los registros del criadero.
- Checkout y Mercado Pago de pruebas: precios verificados en servidor, webhook,
  firma, conciliación e idempotencia. Todavía no implementados.
- Correo Argentino/Andreani: accesos, contratos, embalaje, tarifas y cupones.
- Migrar el resto del contenido y anclas SEO; validar `/incubacion` y datos de recetas.
- Revisión de protección de acceso heredada de granja-gestor antes de sumar compradores.
- Solo al aprobar el flujo completo, preparar el cambio de producción y dominio.

El motor de recetas con IA (`api/receta.js`) no se copia ni conecta a claves
de producción. Las recetas existentes sí están disponibles.
