import { test, expect } from '@playwright/test';
import { buildUser } from '../../../src/builders/user.builder';
import { recordExploratoryResponse } from '../../../src/helpers/scenario.helper';

test.describe('Auth | POST /login', () => {
  const user = buildUser();

  test.beforeAll(async ({ request }) => {
    const response = await request.post('/usuarios', {
      data: user,
    });

    const body = await response.json();

    console.log('SETUP - criação do usuário');
    console.log('Status:', response.status());
    console.log('Response:', body);

    expect(
      response.status(),
      `Falha ao criar usuário de teste. Response: ${JSON.stringify(body)}`
    ).toBe(201);

    expect(body._id).toBeTruthy();
  });

  test.afterAll(async ({ request }) => {
    const response = await request.get(
      `/usuarios?email=${encodeURIComponent(user.email)}`
    );

    if (!response.ok()) {
      return;
    }

    const body = await response.json();
    const userId = body.usuarios?.[0]?._id;

    if (userId) {
      const deleteResponse = await request.delete(
        `/usuarios/${userId}`
      );

      console.log(
        'CLEANUP - remoção do usuário:',
        deleteResponse.status()
      );
    }
  });

  test('TC-001 | autentica credenciais válidas', async ({ request }) => {
    const response = await request.post('/login', {
      data: {
        email: user.email,
        password: user.password,
      },
    });

    const body = await response.json();

    expect(response.status()).toBe(200);

    expect(body).toEqual(
      expect.objectContaining({
        message: expect.any(String),
        authorization: expect.any(String),
      })
    );

    expect(body.authorization).not.toHaveLength(0);
  });

  test('rejeita senha inválida', async ({ request }) => {
    const response = await request.post('/login', {
      data: { email: user.email, password: 'incorreta' },
    });

    expect(response.status()).toBe(401);
    expect((await response.json()).message).toContain('inválidos');
  });

  test('rejeita e-mail inexistente', async ({ request }) => {
    const response = await request.post('/login', {
      data: { email: 'nao-cadastrado@example.com', password: user.password },
    });

    expect(response.status()).toBe(401);
    expect((await response.json()).message).toContain('inválidos');
  });

  test('rejeita credenciais vazias', async ({ request }, testInfo) => {
    const response = await request.post('/login', {
      data: { email: '', password: '' },
    });

    expect(response.status()).toBe(400);
    expect(await response.json()).toMatchObject({
      email: expect.any(String),
      password: expect.any(String),
    });
    await recordExploratoryResponse(testInfo, 'tc002-credenciais-vazias', response);
  });

  test('TC-002 | registra campos ausentes e tipos não-string', async ({ request }, testInfo) => {
    const variations: { name: string; data: Record<string, unknown> }[] = [
      { name: 'email-ausente', data: { password: user.password } },
      { name: 'email-tipo-number', data: { email: 123, password: user.password } },
      { name: 'password-ausente', data: { email: user.email } },
      { name: 'password-tipo-number', data: { email: user.email, password: 123 } },
    ];

    for (const variation of variations) {
      const response = await request.post('/login', { data: variation.data });
      await recordExploratoryResponse(
        testInfo,
        `tc002-${variation.name}`,
        response
      );
    }
  });

  test('TC-002 | observa campos vazios individualmente', async ({ request }, testInfo) => {
    const variations = [
      { name: 'email-vazio', data: { email: '', password: user.password } },
      { name: 'password-vazio', data: { email: user.email, password: '' } },
    ];

    for (const variation of variations) {
      const response = await request.post('/login', { data: variation.data });
      await recordExploratoryResponse(
        testInfo,
        `tc002-${variation.name}`,
        response
      );
    }
  });
});