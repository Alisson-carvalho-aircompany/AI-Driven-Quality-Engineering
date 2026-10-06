import { APIRequestContext } from '@playwright/test';
export const authHeaders=(token:string)=>({Authorization:token});
export async function safeDelete(request:APIRequestContext,url:string,token?:string){try{await request.delete(url,{headers:token?authHeaders(token):undefined});}catch{/* cleanup best-effort */}}