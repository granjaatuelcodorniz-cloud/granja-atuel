import type { Metadata } from 'next';
import './globals.css';
export const metadata:Metadata={title:'Granja Atuel · De nuestra granja a tu mesa',description:'Huevos de codorniz de San Rafael, Mendoza. Consumo, huevos fértiles e insumos.',robots:{index:false,follow:false}};
export default function RootLayout({children}:{children:React.ReactNode}) {return <html lang="es-AR"><body>{children}</body></html>;}
