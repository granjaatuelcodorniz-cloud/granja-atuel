import Link from 'next/link';

export default function IncubationPrivacyNotice(){
 return <p className="inc-privacy-notice">Tus registros son privados. Granja Atuel podrá consultarlos para seguimiento y asistencia. No son públicos ni visibles para otros clientes. <Link href="/buenas-practicas#privacidad">Ver Privacidad</Link>.</p>;
}
