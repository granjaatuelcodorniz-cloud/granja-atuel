import 'server-only';
import {publicRelease,type PurchaseMode} from './site-release';

export function getPurchaseMode():PurchaseMode {
 if(!publicRelease())return 'test';
 // Keep new orders in the selected payment flow if a credential becomes unavailable.
 return process.env.MERCADOPAGO_ENABLE_PRODUCTION==='true'?'checkout':'links';
}
