const BASE_RAW = 'https://raw.githubusercontent.com/granjaatuelcodorniz-cloud/granja-atuel/main/';
const RECETAS_JSON = BASE_RAW + 'data/recetas.json';
const SITE_URL = 'https://www.granjaatuel.com.ar';
const FALLBACK_IMG = BASE_RAW + 'huevos-fertiles.webp';

function slugify(str) {
  return str.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export default async function handler(req, res) {
  const { slug } = req.query;

  if (!slug) {
    return res.redirect(302, SITE_URL);
  }

  try {
    const response = await fetch(RECETAS_JSON, { cache: 'no-store' });
    const recetas = await response.json();
    const receta = recetas.find(r => slugify(r['Título'] || r['titulo'] || '') === slug);

    if (!receta) {
      return res.redirect(302, `${SITE_URL}/#recetas`);
    }

    const titulo = receta['Título'] || receta['titulo'] || '';
    const emoji  = receta['Emoji']  || receta['emoji']  || '🥚';
    const tiempo = receta['Tiempo'] || receta['tiempo'] || '';
    const porc   = receta['Porciones'] || receta['porciones'] || '';
    const dif    = receta['Dif.']   || receta['dificultad'] || '';
    const img    = receta['Imagen'] || receta['imagen'] || '';

    const imgUrl  = img ? `${BASE_RAW}Recetas/${img}` : FALLBACK_IMG;
    const pageUrl = `${SITE_URL}/api/receta?slug=${slug}`;
    const destUrl = `${SITE_URL}/#receta-${slug}`;

    const description = `${emoji} ${titulo} — receta con huevos de codorniz. Tiempo: ${tiempo}. ${porc} porciones. Dificultad: ${dif}. Por Granja Atuel, San Rafael, Mendoza.`;

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>${titulo} — Receta con huevos de codorniz | Granja Atuel</title>
  <meta name="description" content="${description}" />
  <meta property="og:type"         content="article" />
  <meta property="og:site_name"    content="Granja Atuel" />
  <meta property="og:title"        content="${titulo} — Receta con huevos de codorniz" />
  <meta property="og:description"  content="${description}" />
  <meta property="og:image"        content="${imgUrl}" />
  <meta property="og:image:width"  content="800" />
  <meta property="og:image:height" content="600" />
  <meta property="og:url"          content="${pageUrl}" />
  <meta name="twitter:card"        content="summary_large_image" />
  <meta name="twitter:title"       content="${titulo} — Receta con huevos de codorniz" />
  <meta name="twitter:description" content="${description}" />
  <meta name="twitter:image"       content="${imgUrl}" />
  <meta http-equiv="refresh" content="0; url=${destUrl}" />
  <link rel="canonical" href="${destUrl}" />
</head>
<body>
  <p>Redirigiendo a la receta...</p>
  <script>window.location.replace('${destUrl}');</script>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
    res.status(200).send(html);

  } catch (err) {
    console.error('Error en /api/receta:', err);
    res.redirect(302, SITE_URL);
  }
}
