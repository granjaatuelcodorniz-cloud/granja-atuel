export const previewAuthOrigin='https://granja-atuel-tien-git-d38687-granjaatuelcodorniz-4243s-projects.vercel.app';
export function authOrigin(request:Request){return process.env.NODE_ENV==='production'?previewAuthOrigin:new URL(request.url).origin;}
