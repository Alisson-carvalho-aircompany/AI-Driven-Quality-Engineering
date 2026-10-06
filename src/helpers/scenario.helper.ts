import {
  APIRequestContext,
  APIResponse,
  expect,
  TestInfo,
} from '@playwright/test';
import { buildProduct, ProductPayload } from '../builders/product.builder';
import { buildUser, UserPayload } from '../builders/user.builder';
import { authHeaders, safeDelete } from './api.helper';
import { login } from './auth.helper';

export type TestUser = {
  id: string;
  payload: UserPayload;
  token: string;
};

export type TestProduct = {
  id: string;
  payload: ProductPayload;
};

export function buildTestId(): string {
  const characters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  return Array.from({ length: 16 }, () =>
    characters[Math.floor(Math.random() * characters.length)]
  ).join('');
}

export async function createTestUser(
  request: APIRequestContext,
  overrides: Partial<UserPayload> = {}
): Promise<TestUser> {
  const payload = buildUser(overrides);
  const response = await request.post('/usuarios', { data: payload });
  expect(response.status(), await response.text()).toBe(201);
  const body = await response.json();

  return {
    id: body._id,
    payload,
    token: await login(request, payload.email, payload.password),
  };
}

export async function createTestProduct(
  request: APIRequestContext,
  adminToken: string,
  overrides: Partial<ProductPayload> = {}
): Promise<TestProduct> {
  const payload = buildProduct(overrides);
  const response = await request.post('/produtos', {
    headers: authHeaders(adminToken),
    data: payload,
  });
  expect(response.status(), await response.text()).toBe(201);
  const body = await response.json();

  return { id: body._id, payload };
}

export async function cleanupTestUser(
  request: APIRequestContext,
  user: Pick<TestUser, 'id'>
): Promise<void> {
  await safeDelete(request, `/usuarios/${user.id}`);
}

export async function cleanupTestProduct(
  request: APIRequestContext,
  product: Pick<TestProduct, 'id'>,
  adminToken: string
): Promise<void> {
  await safeDelete(request, `/produtos/${product.id}`, adminToken);
}

export async function recordExploratoryResponse(
  testInfo: TestInfo,
  name: string,
  response: APIResponse
): Promise<void> {
  await testInfo.attach(name, {
    body: JSON.stringify(
      {
        status: response.status(),
        body: await response.text(),
      },
      null,
      2
    ),
    contentType: 'application/json',
  });
}