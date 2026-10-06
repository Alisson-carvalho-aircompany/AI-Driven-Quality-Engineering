import { test, expect } from '@playwright/test';
import { buildUser } from '../../../src/builders/user.builder';
import {
  cleanupTestUser,
  buildTestId,
  createTestUser,
  recordExploratoryResponse,
} from '../../../src/helpers/scenario.helper';

test.describe('Usuários | API ServeRest', () => {
  test('lista usuários e aplica todos os filtros documentados', async ({ request }) => {
    const user = await createTestUser(request);
    const admin = await createTestUser(request, { administrador: 'true' });

    try {
      const filters = [
        ['_id', user.id],
        ['nome', user.payload.nome],
        ['email', user.payload.email],
        ['password', user.payload.password],
        ['administrador', user.payload.administrador],
      ] as const;

      const listResponse = await request.get('/usuarios');
      expect(listResponse.status()).toBe(200);
      const list = await listResponse.json();
      expect(list.quantidade).toEqual(expect.any(Number));
      expect(list.usuarios).toEqual(expect.any(Array));
      expect(list.usuarios[0]).toMatchObject({
        nome: expect.any(String),
        email: expect.any(String),
        password: expect.any(String),
        administrador: expect.stringMatching(/^(true|false)$/),
        _id: expect.any(String),
      });

      for (const [key, value] of filters) {
        const response = await request.get('/usuarios', {
          params: { [key]: value },
        });
        expect(response.status()).toBe(200);
        const body = await response.json();
        expect(body.usuarios.some((item: { _id: string }) => item._id === user.id)).toBe(
          true
        );
      }

      for (const [account, value] of [
        [user, 'false'],
        [admin, 'true'],
      ] as const) {
        const response = await request.get('/usuarios', {
          params: { administrador: value },
        });
        expect(response.status()).toBe(200);
        expect(
          (await response.json()).usuarios.some(
            (item: { _id: string }) => item._id === account.id
          )
        ).toBe(true);
      }

      const combinedResponse = await request.get('/usuarios', {
        params: { email: user.payload.email, administrador: 'false' },
      });
      expect(combinedResponse.status()).toBe(200);
      expect((await combinedResponse.json()).usuarios).toHaveLength(1);

      const missingResponse = await request.get('/usuarios', {
        params: { email: `missing.${Date.now()}@example.com` },
      });
      expect(missingResponse.status()).toBe(200);
      expect((await missingResponse.json()).usuarios).toHaveLength(0);
    } finally {
      await cleanupTestUser(request, user);
      await cleanupTestUser(request, admin);
    }
  });

  test('TC-005 | cadastra usuário com administrador true e false e valida resposta', async ({
    request,
  }) => {
    const createdIds: string[] = [];

    try {
      for (const administrator of ['true', 'false'] as const) {
        const payload = buildUser({ administrador: administrator });
        const response = await request.post('/usuarios', { data: payload });
        expect(response.status()).toBe(201);
        const body = await response.json();
        expect(body).toMatchObject({
          message: 'Cadastro realizado com sucesso',
          _id: expect.any(String),
        });
        createdIds.push(body._id);

        const persistedResponse = await request.get(`/usuarios/${body._id}`);
        expect(persistedResponse.status()).toBe(200);
        expect(await persistedResponse.json()).toMatchObject({
          nome: payload.nome,
          email: payload.email,
          password: payload.password,
          administrador: payload.administrador,
          _id: body._id,
        });
      }
    } finally {
      for (const id of createdIds) {
        await request.delete(`/usuarios/${id}`);
      }
    }
  });

  test('TC-006 | registra respostas exploratórias para campos inválidos de usuário', async (
    { request },
    testInfo
  ) => {
    const variations: { name: string; data: Record<string, unknown> }[] = [];
    const addVariation = (
      name: string,
      field: string,
      value?: unknown,
      omit = false
    ) => {
      const data: Record<string, unknown> = { ...buildUser() };
      if (omit) delete data[field];
      else data[field] = value;
      variations.push({ name, data });
    };

    addVariation('nome-ausente', 'nome', undefined, true);
    addVariation('nome-vazio', 'nome', '');
    addVariation('nome-espacos', 'nome', '   ');
    addVariation('nome-tipo-number', 'nome', 123);
    addVariation('email-ausente', 'email', undefined, true);
    addVariation('email-vazio', 'email', '');
    addVariation('email-espacos', 'email', '   ');
    addVariation('email-malformado', 'email', 'email-invalido');
    addVariation('email-tipo-number', 'email', 123);
    addVariation('password-ausente', 'password', undefined, true);
    addVariation('password-vazio', 'password', '');
    addVariation('password-espacos', 'password', '   ');
    addVariation('password-tipo-number', 'password', 123);
    addVariation('administrador-boolean', 'administrador', true);
    addVariation('administrador-uppercase', 'administrador', 'TRUE');
    addVariation('administrador-fora-enum', 'administrador', 'admin');
    addVariation('administrador-ausente', 'administrador', undefined, true);

    const createdIds: string[] = [];
    try {
      for (const variation of variations) {
        const response = await request.post('/usuarios', { data: variation.data });
        const status = response.status();
        const body = await response.json();
        if (status === 201 && body._id) createdIds.push(body._id);
        await recordExploratoryResponse(
          testInfo,
          `tc006-${variation.name}`,
          response
        );
      }
    } finally {
      for (const id of createdIds) {
        await request.delete(`/usuarios/${id}`);
      }
    }
  });

  test('cadastra usuário e rejeita e-mail duplicado', async ({ request }) => {
    const user = await createTestUser(request);

    try {
      const duplicateResponse = await request.post('/usuarios', {
        data: user.payload,
      });
      expect(duplicateResponse.status()).toBe(400);
      expect((await duplicateResponse.json()).message).toContain('email');
    } finally {
      await cleanupTestUser(request, user);
    }
  });

  test('busca usuário por ID e responde 400 para ID inexistente', async (
    { request },
    testInfo
  ) => {
    const user = await createTestUser(request);

    try {
      const foundResponse = await request.get(`/usuarios/${user.id}`);
      expect(foundResponse.status()).toBe(200);
      expect(await foundResponse.json()).toMatchObject({
        _id: user.id,
        email: user.payload.email,
      });

      const missingResponse = await request.get('/usuarios/zzzzzzzzzzzzzzzz');
      expect(missingResponse.status()).toBe(400);
      expect((await missingResponse.json()).message).toContain('não encontrado');

      const malformedResponse = await request.get('/usuarios/id-malformado');
      await recordExploratoryResponse(
        testInfo,
        'tc008-id-malformado',
        malformedResponse
      );
    } finally {
      await cleanupTestUser(request, user);
    }
  });

  test('edita usuário, cria via PUT e rejeita e-mail duplicado', async ({ request }) => {
    const user = await createTestUser(request);
    let createdByPutId = '';

    try {
      const updatedPayload = buildUser({ nome: 'QA usuário atualizado' });
      const updateResponse = await request.put(`/usuarios/${user.id}`, {
        data: updatedPayload,
      });
      expect(updateResponse.status()).toBe(200);
      expect((await updateResponse.json()).message).toContain('alterado');
      expect((await (await request.get(`/usuarios/${user.id}`)).json()).nome).toBe(
        updatedPayload.nome
      );

      const newPayload = buildUser();
      const createResponse = await request.put(`/usuarios/${buildTestId()}`, {
        data: newPayload,
      });
      expect(createResponse.status()).toBe(201);
      const createdBody = await createResponse.json();
      createdByPutId = createdBody._id;
      expect(createdBody.message).toBe('Cadastro realizado com sucesso');

      const createdPersistedResponse = await request.get(
        `/usuarios/${createdByPutId}`
      );
      expect(createdPersistedResponse.status()).toBe(200);
      expect(await createdPersistedResponse.json()).toMatchObject({
        nome: newPayload.nome,
        email: newPayload.email,
        password: newPayload.password,
        administrador: newPayload.administrador,
        _id: createdByPutId,
      });

      const duplicateEmailResponse = await request.put(
        `/usuarios/${buildTestId()}`,
        { data: buildUser({ email: updatedPayload.email }) }
      );
      expect(duplicateEmailResponse.status()).toBe(400);
      expect((await duplicateEmailResponse.json()).message).toContain('email');
    } finally {
      if (createdByPutId) {
        await request.delete(`/usuarios/${createdByPutId}`);
      }
      await cleanupTestUser(request, user);
    }
  });

  test('exclui usuário e retorna 200 quando o ID não existe', async ({ request }) => {
    const user = await createTestUser(request);

    const deleteResponse = await request.delete(`/usuarios/${user.id}`);
    expect(deleteResponse.status()).toBe(200);
    expect((await deleteResponse.json()).message).toContain('Registro excluído');

    const missingResponse = await request.delete(`/usuarios/${buildTestId()}`);
    expect(missingResponse.status()).toBe(200);
    expect((await missingResponse.json()).message).toContain('Nenhum registro');
  });
});