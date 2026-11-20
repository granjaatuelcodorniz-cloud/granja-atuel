import type {Metadata} from 'next';
import Script from 'next/script';
import {headers} from 'next/headers';
import {siteOrigin,indexableHost} from '@/lib/site-release';
import './globals.css';

export const metadata:Metadata={
 metadataBase:new URL(siteOrigin),
 title:'Granja Atuel · Huevos de codorniz en Mendoza',
 description:'Huevos de codorniz de San Rafael, Mendoza. Huevos de consumo, fértiles e insumos.',
 robots:{index:false,follow:false},icons:{icon:'/favicon.png'},
};
export default async function RootLayout({children}:{children:React.ReactNode}){
 const track=indexableHost((await headers()).get('host'));
 return <html lang="es-AR"><body>{children}{track&&<Script src="/_vercel/insights/script.js" strategy="afterInteractive"/>}</body></html>;
}
