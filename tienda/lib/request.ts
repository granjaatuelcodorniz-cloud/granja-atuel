export function sameOrigin(request:Request){
 const origin=request.headers.get('origin');
 return !!origin && origin===new URL(request.url).origin;
}
export async function readSmallJson(request:Request){
 if(!request.headers.get('content-type')?.includes('application/json'))throw new Error('Formato inválido.');
 const reader=request.body?.getReader();if(!reader)throw new Error('Solicitud vacía.');
 const decoder=new TextDecoder();let size=0;let text='';
 try {while(true){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>16000){await reader.cancel();throw new Error('Solicitud demasiado grande.');}text+=decoder.decode(value,{stream:true});}text+=decoder.decode();}finally{reader.releaseLock();}
 return JSON.parse(text);
}
