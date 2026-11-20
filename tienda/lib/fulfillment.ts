export function validateFulfillment(data:{fulfillment_status:string;shipping_carrier:string;tracking_code:string},paymentStatus:string){
 if(['preparing','ready','dispatched','delivered'].includes(data.fulfillment_status)&&paymentStatus!=='approved')throw new Error('El pago debe estar aprobado antes de preparar o entregar el pedido.');
 if(data.fulfillment_status==='dispatched'&&(!data.shipping_carrier.trim()||!data.tracking_code.trim()))throw new Error('Para marcar despachado, indicá el transportista y el código de seguimiento.');
}
