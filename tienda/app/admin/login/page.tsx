import LoginForm from '@/components/LoginForm';
import {databaseConfigured} from '@/lib/supabase';
export const dynamic='force-dynamic';
export default function LoginPage(){return <LoginForm configured={databaseConfigured()}/>;}
