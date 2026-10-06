import { test, expect } from '@playwright/test';
import { buildProduct } from '../../../src/builders/product.builder';
import {
	authHeaders,
	safeDelete,
} from '../../../src/helpers/api.helper';
import {
	cleanupTestProduct,
	cleanupTestUser,
	buildTestId,
	createTestProduct,
	createTestUser,
	recordExploratoryResponse,
} from '../../../src/helpers/scenario.helper';
import { createExpiredAuthorization } from '../../../src/helpers/auth.helper';

test.describe('Produtos | API ServeRest', () => {
	test('lista produtos e aplica todos os filtros documentados', async ({ request }) => {
		const admin = await createTestUser(request, { administrador: 'true' });
		const product = await createTestProduct(request, admin.token);

		try {
			const filters = [
				['_id', product.id],
				['nome', product.payload.nome],
				['preco', product.payload.preco],
				['descricao', product.payload.descricao],
				['quantidade', product.payload.quantidade],
			] as const;

			const listResponse = await request.get('/produtos');
			expect(listResponse.status()).toBe(200);
			const list = await listResponse.json();
			expect(list.quantidade).toEqual(expect.any(Number));
			expect(list.produtos).toEqual(expect.any(Array));
			expect(list.produtos[0]).toMatchObject({
				nome: expect.any(String),
				preco: expect.any(Number),
				descricao: expect.any(String),
				quantidade: expect.any(Number),
				_id: expect.any(String),
			});

			for (const [key, value] of filters) {
				const response = await request.get('/produtos', {
					params: { [key]: String(value) },
				});
				expect(response.status()).toBe(200);
				const body = await response.json();
				expect(body.produtos.some((item: { _id: string }) => item._id === product.id)).toBe(
					true
				);
			}

			const combinedResponse = await request.get('/produtos', {
				params: {
					nome: product.payload.nome,
					preco: String(product.payload.preco),
					descricao: product.payload.descricao,
				},
			});
			expect(combinedResponse.status()).toBe(200);
			expect(
				(await combinedResponse.json()).produtos.some(
					(item: { _id: string }) => item._id === product.id
				)
			).toBe(true);

			const missingResponse = await request.get('/produtos', {
				params: { nome: `missing-${Date.now()}` },
			});
			expect(missingResponse.status()).toBe(200);
			expect((await missingResponse.json()).produtos).toHaveLength(0);
		} finally {
			await cleanupTestProduct(request, product, admin.token);
			await cleanupTestUser(request, admin);
		}
	});

	test('TC-013 | valida limites documentados e registra filtros numéricos fora do schema', async (
		{ request },
		testInfo
	) => {
		const validBoundaries: Record<string, string>[] = [
			{ preco: '1' },
			{ quantidade: '0' },
			{ quantidade: '1' },
		];
		for (const params of validBoundaries) {
			const response = await request.get('/produtos', { params });
			expect(response.status()).toBe(200);
			expect((await response.json()).produtos).toEqual(expect.any(Array));
		}

		const exploratoryBoundaries = [
			['preco-zero', { preco: '0' }],
			['preco-negativo', { preco: '-1' }],
			['preco-decimal', { preco: '1.5' }],
			['preco-texto', { preco: 'abc' }],
			['quantidade-negativa', { quantidade: '-1' }],
			['quantidade-decimal', { quantidade: '1.5' }],
			['quantidade-texto', { quantidade: 'abc' }],
		] as const;
		for (const [name, params] of exploratoryBoundaries) {
			const response = await request.get('/produtos', { params });
			await recordExploratoryResponse(testInfo, `tc013-${name}`, response);
		}
	});

	test('cadastra produto e rejeita nome duplicado', async ({ request }) => {
		const admin = await createTestUser(request, { administrador: 'true' });
		const product = await createTestProduct(request, admin.token);

		try {
			const duplicateResponse = await request.post('/produtos', {
				headers: authHeaders(admin.token),
				data: product.payload,
			});
			expect(duplicateResponse.status()).toBe(400);
			expect((await duplicateResponse.json()).message).toContain('Já existe produto');
		} finally {
			await cleanupTestProduct(request, product, admin.token);
			await cleanupTestUser(request, admin);
		}
	});

	test('POST, PUT e DELETE distinguem token ausente, inválido e não administrador', async ({
		request,
	}) => {
		const admin = await createTestUser(request, { administrador: 'true' });
		const customer = await createTestUser(request);
		const product = await createTestProduct(request, admin.token);
		const payload = buildProduct();
		const invalidHeaders = authHeaders('token-invalido');
		const expiredHeaders = authHeaders(
			createExpiredAuthorization(customer.payload.email, customer.payload.password)
		);

		try {
			for (const response of [
				await request.post('/produtos', { data: payload }),
				await request.post('/produtos', { headers: invalidHeaders, data: payload }),
				await request.put(`/produtos/${product.id}`, { data: payload }),
				await request.put(`/produtos/${product.id}`, {
					headers: invalidHeaders,
					data: payload,
				}),
				await request.delete(`/produtos/${product.id}`),
				await request.delete(`/produtos/${product.id}`, { headers: invalidHeaders }),
				await request.post('/produtos', {
					headers: expiredHeaders,
					data: payload,
				}),
				await request.put(`/produtos/${product.id}`, {
					headers: expiredHeaders,
					data: payload,
				}),
				await request.delete(`/produtos/${product.id}`, {
					headers: expiredHeaders,
				}),
			]) {
				expect(response.status()).toBe(401);
				expect((await response.json()).message).toEqual(expect.any(String));
			}

			for (const response of [
				await request.post('/produtos', {
					headers: authHeaders(customer.token),
					data: payload,
				}),
				await request.put(`/produtos/${product.id}`, {
					headers: authHeaders(customer.token),
					data: payload,
				}),
				await request.delete(`/produtos/${product.id}`, {
					headers: authHeaders(customer.token),
				}),
			]) {
				expect(response.status()).toBe(403);
				expect((await response.json()).message).toContain('administradores');
			}

			const deletedUser = await createTestUser(request);
			await cleanupTestUser(request, deletedUser);
			for (const response of [
				await request.post('/produtos', {
					headers: authHeaders(deletedUser.token),
					data: payload,
				}),
				await request.put(`/produtos/${product.id}`, {
					headers: authHeaders(deletedUser.token),
					data: payload,
				}),
				await request.delete(`/produtos/${product.id}`, {
					headers: authHeaders(deletedUser.token),
				}),
			]) {
				expect(response.status()).toBe(401);
			}
		} finally {
			await cleanupTestProduct(request, product, admin.token);
			await cleanupTestUser(request, customer);
			await cleanupTestUser(request, admin);
		}
	});

	test('busca produto por ID e responde 400 para ID inexistente', async (
		{ request },
		testInfo
	) => {
		const admin = await createTestUser(request, { administrador: 'true' });
		const product = await createTestProduct(request, admin.token);

		try {
			const foundResponse = await request.get(`/produtos/${product.id}`);
			expect(foundResponse.status()).toBe(200);
			expect(await foundResponse.json()).toMatchObject({
				_id: product.id,
				nome: product.payload.nome,
			});

			const missingResponse = await request.get('/produtos/zzzzzzzzzzzzzzzz');
			expect(missingResponse.status()).toBe(400);
			expect((await missingResponse.json()).message).toContain('Produto não encontrado');

			const malformedResponse = await request.get('/produtos/id-malformado');
			await recordExploratoryResponse(
				testInfo,
				'tc014-id-malformado',
				malformedResponse
			);
		} finally {
			await cleanupTestProduct(request, product, admin.token);
			await cleanupTestUser(request, admin);
		}
	});

	test('TC-015 | valida request e response de criação de produto', async ({ request }) => {
		const admin = await createTestUser(request, { administrador: 'true' });
		let productId = '';

		try {
			const payload = buildProduct();
			const response = await request.post('/produtos', {
				headers: authHeaders(admin.token),
				data: payload,
			});
			expect(response.status()).toBe(201);
			const body = await response.json();
			expect(body).toMatchObject({
				message: 'Cadastro realizado com sucesso',
				_id: expect.any(String),
			});
			productId = body._id;

			const persistedResponse = await request.get(`/produtos/${productId}`);
			expect(persistedResponse.status()).toBe(200);
			expect(await persistedResponse.json()).toMatchObject({
				nome: payload.nome,
				preco: payload.preco,
				descricao: payload.descricao,
				quantidade: payload.quantidade,
				_id: productId,
			});
		} finally {
			if (productId) {
				await safeDelete(request, `/produtos/${productId}`, admin.token);
			}
			await cleanupTestUser(request, admin);
		}
	});

	test('TC-016 | registra variações exploratórias de campos de produto em POST e PUT', async (
		{ request },
		testInfo
	) => {
		const admin = await createTestUser(request, { administrador: 'true' });
		const variations: { name: string; payload: Record<string, unknown> }[] = [];
		const addVariation = (
			name: string,
			field: string,
			value?: unknown,
			omit = false
		) => {
			const payload: Record<string, unknown> = { ...buildProduct() };
			if (omit) delete payload[field];
			else payload[field] = value;
			variations.push({ name, payload });
		};

		addVariation('nome-ausente', 'nome', undefined, true);
		addVariation('nome-vazio', 'nome', '');
		addVariation('nome-espacos', 'nome', '   ');
		addVariation('nome-tipo-number', 'nome', 123);
		addVariation('descricao-ausente', 'descricao', undefined, true);
		addVariation('descricao-vazia', 'descricao', '');
		addVariation('descricao-espacos', 'descricao', '   ');
		addVariation('descricao-tipo-number', 'descricao', 123);
		addVariation('preco-ausente', 'preco', undefined, true);
		addVariation('preco-zero', 'preco', 0);
		addVariation('preco-negativo', 'preco', -1);
		addVariation('preco-decimal', 'preco', 1.5);
		addVariation('preco-string', 'preco', '100');
		addVariation('quantidade-ausente', 'quantidade', undefined, true);
		addVariation('quantidade-zero', 'quantidade', 0);
		addVariation('quantidade-negativa', 'quantidade', -1);
		addVariation('quantidade-decimal', 'quantidade', 1.5);
		addVariation('quantidade-string', 'quantidade', '10');

		try {
			for (const variation of variations) {
				for (const operation of ['post', 'put'] as const) {
					const putId = buildTestId();
					const response =
						operation === 'post'
							? await request.post('/produtos', {
									headers: authHeaders(admin.token),
									data: variation.payload,
								})
							: await request.put(`/produtos/${putId}`, {
									headers: authHeaders(admin.token),
									data: variation.payload,
								});
					const status = response.status();
					const body = await response.json().catch(() => ({}));
					if (body._id) {
						await safeDelete(
							request,
							`/produtos/${body._id}`,
							admin.token
						);
					} else if (status === 201 && operation === 'put') {
						await safeDelete(request, `/produtos/${putId}`, admin.token);
					}
					await recordExploratoryResponse(
						testInfo,
						`tc016-${operation}-${variation.name}`,
						response
					);
				}
			}
		} finally {
			await cleanupTestUser(request, admin);
		}
	});

	test('edita produto, cria via PUT e rejeita nome duplicado', async ({ request }) => {
		const admin = await createTestUser(request, { administrador: 'true' });
		const product = await createTestProduct(request, admin.token);
		let createdByPutId = '';

		try {
			const updatedPayload = buildProduct();
			const updateResponse = await request.put(`/produtos/${product.id}`, {
				headers: authHeaders(admin.token),
				data: updatedPayload,
			});
			expect(updateResponse.status()).toBe(200);
			expect((await updateResponse.json()).message).toContain('alterado');
			expect((await (await request.get(`/produtos/${product.id}`)).json()).nome).toBe(
				updatedPayload.nome
			);

			const newProductPayload = buildProduct();
			const createResponse = await request.put(`/produtos/${buildTestId()}`, {
				headers: authHeaders(admin.token),
				data: newProductPayload,
			});
			expect(createResponse.status()).toBe(201);
			const createdBody = await createResponse.json();
			createdByPutId = createdBody._id;
			expect(createdBody.message).toBe('Cadastro realizado com sucesso');
			const createdProduct = await request.get(`/produtos/${createdByPutId}`);
			expect(createdProduct.status()).toBe(200);
			expect(await createdProduct.json()).toMatchObject({
				nome: newProductPayload.nome,
				preco: newProductPayload.preco,
				descricao: newProductPayload.descricao,
				quantidade: newProductPayload.quantidade,
				_id: createdByPutId,
			});

			const duplicateNameResponse = await request.put(
				`/produtos/${buildTestId()}`,
				{
					headers: authHeaders(admin.token),
					data: buildProduct({ nome: updatedPayload.nome }),
				}
			);
			expect(duplicateNameResponse.status()).toBe(400);
			expect((await duplicateNameResponse.json()).message).toContain('Já existe produto');
		} finally {
			if (createdByPutId) {
				await request.delete(`/produtos/${createdByPutId}`, {
					headers: authHeaders(admin.token),
				});
			}
			await cleanupTestProduct(request, product, admin.token);
			await cleanupTestUser(request, admin);
		}
	});

	test('exclui produto, retorna 200 para ID inexistente e 400 se estiver em carrinho', async ({
		request,
	}) => {
		const admin = await createTestUser(request, { administrador: 'true' });
		const customer = await createTestUser(request);
		const product = await createTestProduct(request, admin.token);
		let cartCreated = false;

		try {
			const deleteResponse = await request.delete(`/produtos/${product.id}`, {
				headers: authHeaders(admin.token),
			});
			expect(deleteResponse.status()).toBe(200);
			expect((await deleteResponse.json()).message).toContain('Registro excluído');

			const missingResponse = await request.delete('/produtos/zzzzzzzzzzzzzzzz', {
				headers: authHeaders(admin.token),
			});
			expect(missingResponse.status()).toBe(200);
			expect((await missingResponse.json()).message).toContain('Nenhum registro');

			const protectedProduct = await createTestProduct(request, admin.token);
			const cartResponse = await request.post('/carrinhos', {
				headers: authHeaders(customer.token),
				data: {
					produtos: [{ idProduto: protectedProduct.id, quantidade: 1 }],
				},
			});
			expect(cartResponse.status()).toBe(201);
			cartCreated = true;

			const blockedDeleteResponse = await request.delete(
				`/produtos/${protectedProduct.id}`,
				{ headers: authHeaders(admin.token) }
			);
			expect(blockedDeleteResponse.status()).toBe(400);
			expect((await blockedDeleteResponse.json()).message).toContain('carrinho');

			await request.delete('/carrinhos/cancelar-compra', {
				headers: authHeaders(customer.token),
			});
			cartCreated = false;
			await cleanupTestProduct(request, protectedProduct, admin.token);
		} finally {
			if (cartCreated) {
				await safeDelete(request, '/carrinhos/cancelar-compra', customer.token);
			}
			await cleanupTestProduct(request, product, admin.token);
			await cleanupTestUser(request, customer);
			await cleanupTestUser(request, admin);
		}
	});
});