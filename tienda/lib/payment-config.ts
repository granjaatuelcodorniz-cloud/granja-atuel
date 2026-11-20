export const GranjaAtuelMercadoPagoApp = '7544098919599369';
export const GranjaAtuelTestSeller = '3450457878';
export const testShopOrigin = 'https://granja-atuel-tien-git-d38687-granjaatuelcodorniz-4243s-projects.vercel.app';
export const productionShopOrigin = 'https://www.granjaatuel.com.ar';
export const paymentIdPattern = /^\d{1,30}$/;
export const orderIdPattern = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
export type PaymentMode = 'test' | 'production';
export type PaymentConfig = {mode:PaymentMode;token:string;webhookSecret:string;origin:string};
type PaymentEnvironment = Readonly<Record<string,string|undefined>>;

export function shopMode(env:PaymentEnvironment):PaymentMode {
 return env.VERCEL_ENV==='production'&&env.MERCADOPAGO_MODE==='production'?'production':'test';
}

// Production always needs the separate credentials and an explicit switch.
export function checkoutAvailable(config:PaymentConfig|null,env:PaymentEnvironment):boolean {
 return !!config&&(config.mode==='test'||env.MERCADOPAGO_ENABLE_PRODUCTION==='true');
}
export function paymentConfig(env:PaymentEnvironment):PaymentConfig|null {
 if(!env.SUPABASE_SECRET_KEY?.trim()||!env.NEXT_PUBLIC_SUPABASE_URL)return null;
 if(env.VERCEL_ENV==='preview'&&env.MERCADOPAGO_MODE==='test'){
  const token=env.MERCADOPAGO_ACCESS_TOKEN?.trim();
  if(!token||env.MERCADOPAGO_TEST_SELLER_ID?.trim()!==GranjaAtuelTestSeller)return null;
  return {mode:'test',token,origin:testShopOrigin,webhookSecret:env.MERCADOPAGO_WEBHOOK_SECRET?.trim()||''};
 }
 if(shopMode(env)!=='production')return null;
 const token=env.MERCADOPAGO_PRODUCTION_ACCESS_TOKEN?.trim();
 const webhookSecret=env.MERCADOPAGO_PRODUCTION_WEBHOOK_SECRET?.trim();
 return token&&webhookSecret?{mode:'production',token,webhookSecret,origin:productionShopOrigin}:null;
}

export function preferenceSeller(preference:Record<string,unknown>,orderId:string,mode:PaymentMode):string|null {
 const collector=(typeof preference.collector_id==='number'||typeof preference.collector_id==='string')?String(preference.collector_id):'';
 if(preference.external_reference!==orderId||!paymentIdPattern.test(collector))return null;
 if(mode==='test')return collector===GranjaAtuelTestSeller?collector:null;
 // The live preference must have been created for the verified Granja Atuel application.
 return collector!==GranjaAtuelTestSeller&&String(preference.client_id)===GranjaAtuelMercadoPagoApp?collector:null;
}
