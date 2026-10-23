export function sameOrigin(request:Request){
 const origin=request.headers.get('origin');
 if(!origin)return false;
 try {const parsed=new URL(origin);return ['http:','https:'].includes(parsed.protocol) && parsed.host===(request.headers.get('host')||new URL(request.url).host);}catch{return false;}
}
export async function readSmallJson(request:Request){
 if(!request.headers.get('content-type')?.includes('application/json'))throw new Error('Formato inválido.');
 const reader=request.body?.getReader();if(!reader)throw new Error('Solicitud vacía.');
 const decoder=new TextDecoder();let size=0;let text='';
 try {while(true){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>16000){await reader.cancel();throw new Error('Solicitud demasiado grande.');}text+=decoder.decode(value,{stream:true});}text+=decoder.decode();}finally{reader.releaseLock();}
 const parsed=JSON.parse(text);if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))throw new Error('Solicitud inválida.');return parsed;
}
