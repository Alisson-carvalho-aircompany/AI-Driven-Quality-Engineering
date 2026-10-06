import { APIRequestContext, expect } from '@playwright/test';
import { createHmac } from 'node:crypto';

const JWT_TEST_SECRET = 'f5b99242-6504-4ca3-90f2-05e78e5761ef';

export async function login(request:APIRequestContext,email:string,password:string){const r=await request.post('/login',{data:{email,password}});expect(r.status()).toBe(200);const body=await r.json();expect(body.authorization).toBeTruthy();return body.authorization as string;}

export function createExpiredAuthorization(email: string, password: string): string {
	const now = Math.floor(Date.now() / 1000);
	const encode = (value: object) =>
		Buffer.from(JSON.stringify(value)).toString('base64url');
	const unsignedToken = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({
		email,
		password,
		iat: now - 1200,
		exp: now - 600,
	})}`;
	const signature = createHmac('sha256', JWT_TEST_SECRET)
		.update(unsignedToken)
		.digest('base64url');

	return `Bearer ${unsignedToken}.${signature}`;
}