import 'server-only';
import {checkoutAvailable} from './payment-config';
import {currentPaymentConfig} from './order-server';
import {publicRelease,type PurchaseMode} from './site-release';

export function getPurchaseMode():PurchaseMode {
 if(!publicRelease())return 'test';
 return checkoutAvailable(currentPaymentConfig(),process.env)?'checkout':'links';
}
