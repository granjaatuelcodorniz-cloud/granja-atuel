import recipes from './recetas.json' with {type:'json'};
import locations from './clientes.json' with {type:'json'};
import type {SiteContent} from './site-content.ts';

const faqs=[
 ['¿El precio incluye el envío?', 'Sí. Cada presentación tiene un precio final con envío incluido. Podés ver el total antes de pagar.'],
 ['¿Cómo se despacha mi pedido?', 'Preparamos y embalamos tu pedido en San Rafael, Mendoza. Una vez despachado, podrás consultar el código de seguimiento en el detalle de tu pedido.'],
 ['¿Cuál es la diferencia entre los huevos de consumo y los fértiles?', 'En el catálogo los separamos por uso: para tu mesa o para incubar. Si vas a criar codornices, elegí una de las presentaciones de huevos fértiles.'],
 ['¿Dónde puedo comprar en persona?', 'En la sección Dónde comprar podés elegir tu localidad y ver los comercios que ofrecen nuestros productos. Consultá disponibilidad con el comercio.'],
 ['¿Puedo comprar por mayor?', 'Sí. Escribinos por WhatsApp y contanos qué tipo de comercio tenés, en qué localidad y qué cantidades necesitás.'],
];
export const seedContent:SiteContent[]=[
 ...faqs.map(([question,answer],i)=>({id:'pregunta-'+(i+1),kind:'faq' as const,position:i*10,published:true,data:{question,answer},updated_at:''})),
 ...locations.map((p,i)=>({id:'punto-'+(i+1),kind:'location' as const,position:i*10,published:p.activo==='si',data:{name:p.nombre,address:p.direccion,city:p.ciudad,map_url:p.maps_link},updated_at:''})),
 ...recipes.map((r,i)=>({id:'receta-'+i,kind:'recipe' as const,position:i*10,published:true,data:{title:r['Título'],image:'/Recetas/'+r.Imagen,time:r.Tiempo,portions:r.Porciones,difficulty:r['Dif.'],ingredients:r.Ingredientes,steps:r['Preparación'],featured:i===0||i===3||i===4},updated_at:''})),
];
