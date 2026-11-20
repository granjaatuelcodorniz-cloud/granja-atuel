import Link from 'next/link';
import type {ReactNode} from 'react';
import {publicRelease} from '@/lib/site-release';

export default function IncubationLink({children,className}:{children:ReactNode;className?:string}){
 return publicRelease()?<a className={className} href="/incubacion">{children}</a>:<Link className={className} href="/incubacion">{children}</Link>;
}
