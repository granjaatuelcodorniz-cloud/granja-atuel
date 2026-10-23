import LoginForm from '@/components/LoginForm';
import {databaseConfigured} from '@/lib/supabase';
export default function LoginPage(){return <LoginForm configured={databaseConfigured()}/>;}
