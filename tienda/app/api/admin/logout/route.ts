import {NextResponse} from 'next/server';
import {supabaseServer,databaseConfigured} from '@/lib/supabase';
import {sameOrigin} from '@/lib/request';
export async function POST(request:Request){if(!sameOrigin(request))return new NextResponse('Origen no permitido',{status:403});if(databaseConfigured()){const db=await supabaseServer();await db.auth.signOut({scope:'local'});}return NextResponse.redirect(new URL('/admin/login',request.url),303);}
