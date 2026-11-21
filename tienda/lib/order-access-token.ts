import {createCipheriv,createDecipheriv,createHmac,randomBytes} from 'node:crypto';

type Purpose='restore'|'session';
const context='granja-atuel/order-access/v1';
const hashPattern=/^[a-f0-9]{64}$/;

function accessKey(secret:string){
 return createHmac('sha256',secret).update(context).digest();
}

export function sealOrderAccess(secret:string,id:string,hash:string,expiresAt:number,purpose:Purpose){
 if(!hashPattern.test(hash))throw new Error('Invalid order session');
 const nonce=randomBytes(12);
 const cipher=createCipheriv('aes-256-gcm',accessKey(secret),nonce);
 cipher.setAAD(Buffer.from(purpose+':'+id.toLowerCase()));
 const payload=Buffer.concat([cipher.update(JSON.stringify({hash,expiresAt}),'utf8'),cipher.final()]);
 return Buffer.concat([nonce,cipher.getAuthTag(),payload]).toString('base64url');
}

export function openOrderAccess(secret:string,id:string,token:string,purpose:Purpose,now=Date.now()){
 if(!/^[A-Za-z0-9_-]{40,256}$/.test(token))return null;
 try{
  const bytes=Buffer.from(token,'base64url');
  const decipher=createDecipheriv('aes-256-gcm',accessKey(secret),bytes.subarray(0,12));
  decipher.setAAD(Buffer.from(purpose+':'+id.toLowerCase()));
  decipher.setAuthTag(bytes.subarray(12,28));
  const payload=JSON.parse(Buffer.concat([decipher.update(bytes.subarray(28)),decipher.final()]).toString('utf8'));
  if(!hashPattern.test(payload.hash)||!Number.isSafeInteger(payload.expiresAt)||payload.expiresAt<=now)return null;
  return {hash:payload.hash as string,expiresAt:payload.expiresAt as number};
 }catch{return null;}
}
