import { APIRequestContext, test, expect } from '@playwright/test';
import {
	buildProduct,
	ProductPayload,
} from '../../../src/builders/product.builder';
import { buildUser } from '../../../src/builders/user.builder';
import { authHeaders, safeDelete } from '../../../src/helpers/api.helper';
import {
	createExpiredAuthorization,
	login,
} from '../../../src/helpers/auth.helper';
import {
	cleanupTestUser,
	createTestUser,
	recordExploratoryResponse,
} from '../../../src/helpers/scenario.helper';

type CartScenario = {
	adminId: string;
	adminToken: string;
	customerId: string;
	customerEmail: string;
	customerPassword: string;
	customerToken: string;
	productId: string;
};

async function createCartScenario(
	request: APIRequestContext,
	productOverrides: Partial<ProductPayload> = {}
): Promise<CartScenario> {
	let adminId = '';
	let adminToken = '';
	let customerId = '';
	let customerToken = '';
	let productId = '';

	try {
		const admin = buildUser({ administrador: 'true' });
		const adminResponse = await request.post('/usuarios', { data: admin });
		expect(adminResponse.status()).toBe(201);
		adminId = (await adminResponse.json())._id;
		adminToken = await login(request, admin.email, admin.password);

		const product = buildProduct(productOverrides);
		const productResponse = await request.post('/produtos', {
			headers: authHeaders(adminToken),
			data: product,
		});
		expect(productResponse.status()).toBe(201);
		productId = (await productResponse.json())._id;

		const customer = buildUser();
		const customerResponse = await request.post('/usuarios', { data: customer });
		expect(customerResponse.status()).toBe(201);
		customerId = (await customerResponse.json())._id;
		customerToken = await login(request, customer.email, customer.password);

		return {
			adminId,
			adminToken,
			customerId,
			customerEmail: customer.email,
			customerPassword: customer.password,
			customerToken,
			productId,
		};
	} catch (error) {
		if (customerToken) {
			await safeDelete(request, '/carrinhos/cancelar-compra', customerToken);
		}
		if (productId && adminToken) {
			await safeDelete(request, `/produtos/${productId}`, adminToken);
		}
		if (customerId) await safeDelete(request, `/usuarios/${customerId}`);
		if (adminId) await safeDelete(request, `/usuarios/${adminId}`);
		throw error;
	}
}

async function cleanupCartScenario(
	request: APIRequestContext,
	scenario: CartScenario
) {
	await safeDelete(
		request,
		'/carrinhos/cancelar-compra',
		scenario.customerToken
	);
	await safeDelete(
		request,
		`/produtos/${scenario.productId}`,
		scenario.adminToken
	);
	await safeDelete(request, `/usuarios/${scenario.customerId}`);
	await safeDelete(request, `/usuarios/${scenario.adminId}`);
}

test.describe('Carrinhos | API ServeRest', () => {
	test('TC-025/033 | valida carrinho com múltiplos produtos, totais e cancelamento', async (
		{ request },
		testInfo
	) => {
		const scenario = await createCartScenario(request);
		let secondProductId = '';

		try {
			const secondProductPayload = buildProduct({ preco: 50, quantidade: 5 });
			const secondProductResponse = await request.post('/produtos', {
				headers: authHeaders(scenario.adminToken),
				data: secondProductPayload,
			});
			expect(secondProductResponse.status()).toBe(201);
			secondProductId = (await secondProductResponse.json())._id;

			const createResponse = await request.post('/carrinhos', {
				headers: authHeaders(scenario.customerToken),
				data: {
					produtos: [
						{ idProduto: scenario.productId, quantidade: 2 },
						{ idProduto: secondProductId, quantidade: 3 },
					],
				},
			});
			expect(createResponse.status()).toBe(201);
			const created = await createResponse.json();
			expect(created._id).toBeTruthy();

			const getResponse = await request.get(`/carrinhos/${created._id}`);
			expect(getResponse.status()).toBe(200);
			expect(await getResponse.json()).toMatchObject({
				produtos: [
					{
						idProduto: scenario.productId,
						quantidade: 2,
						precoUnitario: 100,
					},
					{
						idProduto: secondProductId,
						quantidade: 3,
						precoUnitario: 50,
					},
				],
				precoTotal: 350,
				quantidadeTotal: 5,
				idUsuario: scenario.customerId,
				_id: created._id,
			});

			const filters = [
				['_id', created._id],
				['precoTotal', '350'],
				['quantidadeTotal', '5'],
				['idUsuario', scenario.customerId],
			] as const;
			const listResponse = await request.get('/carrinhos');
			expect(listResponse.status()).toBe(200);
			expect((await listResponse.json()).carrinhos).toEqual(expect.any(Array));

			for (const [key, value] of filters) {
				const response = await request.get('/carrinhos', {
					params: { [key]: value },
				});
				expect(response.status()).toBe(200);
				const body = await response.json();
				expect(
					body.carrinhos.some((cart: { _id: string }) => cart._id === created._id)
				).toBe(true);
			}
			const combinedFiltersResponse = await request.get('/carrinhos', {
				params: {
					idUsuario: scenario.customerId,
					precoTotal: '350',
					quantidadeTotal: '5',
				},
			});
			expect(combinedFiltersResponse.status()).toBe(200);
			expect(
				(await combinedFiltersResponse.json()).carrinhos.some(
					(cart: { _id: string }) => cart._id === created._id
				)
			).toBe(true);

			const reducedProduct = await request.get(`/produtos/${scenario.productId}`);
			expect((await reducedProduct.json()).quantidade).toBe(8);
			const reducedSecondProduct = await request.get(`/produtos/${secondProductId}`);
			expect((await reducedSecondProduct.json()).quantidade).toBe(2);

			const blockedUserDelete = await request.delete(
				`/usuarios/${scenario.customerId}`
			);
			expect(blockedUserDelete.status()).toBe(400);
			expect((await blockedUserDelete.json()).idCarrinho).toBe(created._id);

			const blockedProductDelete = await request.delete(
				`/produtos/${scenario.productId}`,
				{ headers: authHeaders(scenario.adminToken) }
			);
			expect(blockedProductDelete.status()).toBe(400);
			expect((await blockedProductDelete.json()).idCarrinhos).toContain(created._id);

			const cancelResponse = await request.delete('/carrinhos/cancelar-compra', {
				headers: authHeaders(scenario.customerToken),
			});
			expect(cancelResponse.status()).toBe(200);
			expect((await cancelResponse.json()).message).toContain(
				'Registro excluído com sucesso'
			);

			const restoredProduct = await request.get(`/produtos/${scenario.productId}`);
			expect((await restoredProduct.json()).quantidade).toBe(10);
			expect((await request.get(`/carrinhos/${created._id}`)).status()).toBe(400);
			const malformedCartResponse = await request.get('/carrinhos/id-malformado');
			await recordExploratoryResponse(
				testInfo,
				'tc024-id-malformado',
				malformedCartResponse
			);

			const restoredSecondProduct = await request.get(
				`/produtos/${secondProductId}`
			);
			expect((await restoredSecondProduct.json()).quantidade).toBe(5);
		} finally {
			await safeDelete(
				request,
				'/carrinhos/cancelar-compra',
				scenario.customerToken
			);
			if (secondProductId) {
				await safeDelete(
					request,
					`/produtos/${secondProductId}`,
					scenario.adminToken
				);
			}
			await cleanupCartScenario(request, scenario);
		}
	});

	test('TC-027/034 | repetição de POST não duplica carrinho nem baixa estoque novamente', async (
		{ request },
		testInfo
	) => {
		const scenario = await createCartScenario(request);
		const cart = {
			produtos: [{ idProduto: scenario.productId, quantidade: 1 }],
		};
		const invalidTokenHeaders = authHeaders('token-invalido');
		const expiredTokenHeaders = authHeaders(
			createExpiredAuthorization(
				scenario.customerEmail,
				scenario.customerPassword
			)
		);

		try {
			for (const response of [
				await request.post('/carrinhos', { data: cart }),
				await request.post('/carrinhos', {
					headers: invalidTokenHeaders,
					data: cart,
				}),
				await request.post('/carrinhos', {
					headers: expiredTokenHeaders,
					data: cart,
				}),
			]) {
				expect(response.status()).toBe(401);
				expect((await response.json()).message).toEqual(expect.any(String));
			}

			const invalidRequests = [
				{
					produtos: [
						{ idProduto: scenario.productId, quantidade: 1 },
						{ idProduto: scenario.productId, quantidade: 1 },
					],
				},
				{ produtos: [{ idProduto: 'zzzzzzzzzzzzzzzz', quantidade: 1 }] },
				{ produtos: [{ idProduto: scenario.productId, quantidade: 11 }] },
			];
			for (const invalidCart of invalidRequests) {
				const response = await request.post('/carrinhos', {
					headers: authHeaders(scenario.customerToken),
					data: invalidCart,
				});
				expect(response.status()).toBe(400);
				expect((await response.json()).message).toEqual(expect.any(String));
			}

			const firstResponse = await request.post('/carrinhos', {
				headers: authHeaders(scenario.customerToken),
				data: cart,
			});
			expect(firstResponse.status()).toBe(201);
			const firstCart = await firstResponse.json();

			const duplicateResponse = await request.post('/carrinhos', {
				headers: authHeaders(scenario.customerToken),
				data: cart,
			});
			expect(duplicateResponse.status()).toBe(400);
			expect((await duplicateResponse.json()).message).toEqual(expect.any(String));
			await recordExploratoryResponse(
				testInfo,
				'tc034-retry-apos-sucesso',
				duplicateResponse
			);

			const cartsForUser = await request.get('/carrinhos', {
				params: { idUsuario: scenario.customerId },
			});
			expect((await cartsForUser.json()).carrinhos).toMatchObject([
				{ _id: firstCart._id },
			]);
			const productAfterRetry = await request.get(
				`/produtos/${scenario.productId}`
			);
			expect((await productAfterRetry.json()).quantidade).toBe(9);
		} finally {
			await cleanupCartScenario(request, scenario);
		}
	});

	test('TC-023 | valida limites dos filtros numéricos de carrinhos', async (
		{ request },
		testInfo
	) => {
		const scenario = await createCartScenario(request);
		try {
			const validBoundaries: Record<string, string>[] = [
				{ precoTotal: '1' },
				{ quantidadeTotal: '1' },
			];
			for (const params of validBoundaries) {
				const response = await request.get('/carrinhos', { params });
				expect(response.status()).toBe(200);
				expect((await response.json()).carrinhos).toEqual(expect.any(Array));
			}

			const exploratoryBoundaries = [
				['quantidade-zero-minimo-documentado', { quantidadeTotal: '0' }],
				['preco-zero', { precoTotal: '0' }],
				['preco-negativo', { precoTotal: '-1' }],
				['preco-decimal', { precoTotal: '1.5' }],
				['preco-texto', { precoTotal: 'abc' }],
				['quantidade-negativa', { quantidadeTotal: '-1' }],
				['quantidade-decimal', { quantidadeTotal: '1.5' }],
				['quantidade-texto', { quantidadeTotal: 'abc' }],
			] as const;
			for (const [name, params] of exploratoryBoundaries) {
				const response = await request.get('/carrinhos', { params });
				await recordExploratoryResponse(testInfo, `tc023-${name}`, response);
			}
		} finally {
			await cleanupCartScenario(request, scenario);
		}
	});

	test('TC-029 | valida quantidades de estoque e registra entradas fora do contrato', async (
		{ request },
		testInfo
	) => {
		const scenario = await createCartScenario(request);
		try {
			for (const quantity of [1, 9, 10]) {
				const response = await request.post('/carrinhos', {
					headers: authHeaders(scenario.customerToken),
					data: {
						produtos: [{ idProduto: scenario.productId, quantidade: quantity }],
					},
				});
				expect(response.status()).toBe(201);
				const created = await response.json();
				const cartResponse = await request.get(`/carrinhos/${created._id}`);
				expect((await cartResponse.json()).quantidadeTotal).toBe(quantity);

				const cancelResponse = await request.delete(
					'/carrinhos/cancelar-compra',
					{ headers: authHeaders(scenario.customerToken) }
				);
				expect(cancelResponse.status()).toBe(200);
			}

			const aboveStockResponse = await request.post('/carrinhos', {
				headers: authHeaders(scenario.customerToken),
				data: {
					produtos: [{ idProduto: scenario.productId, quantidade: 11 }],
				},
			});
			expect(aboveStockResponse.status()).toBe(400);

			const exploratoryQuantities: {
				name: string;
				product: Record<string, unknown>;
			}[] = [
				{ name: 'zero', product: { idProduto: scenario.productId, quantidade: 0 } },
				{ name: 'negativa', product: { idProduto: scenario.productId, quantidade: -1 } },
				{ name: 'decimal', product: { idProduto: scenario.productId, quantidade: 1.5 } },
				{ name: 'string', product: { idProduto: scenario.productId, quantidade: '1' } },
				{ name: 'ausente', product: { idProduto: scenario.productId } },
			];
			for (const variation of exploratoryQuantities) {
				const response = await request.post('/carrinhos', {
					headers: authHeaders(scenario.customerToken),
					data: { produtos: [variation.product] },
				});
				const status = response.status();
				await recordExploratoryResponse(
					testInfo,
					`tc029-quantidade-${variation.name}`,
					response
				);
				if (status === 201) {
					await request.delete('/carrinhos/cancelar-compra', {
						headers: authHeaders(scenario.customerToken),
					});
				}
			}
		} finally {
			await cleanupCartScenario(request, scenario);
		}
	});

	test('TC-035 | dois usuários disputam a última unidade sem estoque negativo', async ({
		request,
	}) => {
		const scenario = await createCartScenario(request, { quantidade: 1 });
		const secondCustomer = await createTestUser(request);
		const customers = [
			{ id: scenario.customerId, token: scenario.customerToken },
			{ id: secondCustomer.id, token: secondCustomer.token },
		];

		try {
			const outcomes = await Promise.all(
				customers.map(async (customer) => {
					const response = await request.post('/carrinhos', {
						headers: authHeaders(customer.token),
						data: {
							produtos: [{ idProduto: scenario.productId, quantidade: 1 }],
						},
					});
					return { customer, response, status: response.status() };
				})
			);

			expect(outcomes.filter((item) => item.status === 201)).toHaveLength(1);
			expect(outcomes.filter((item) => item.status === 400)).toHaveLength(1);

			const depletedProduct = await request.get(
				`/produtos/${scenario.productId}`
			);
			expect((await depletedProduct.json()).quantidade).toBe(0);

			for (const outcome of outcomes) {
				const response = await request.get('/carrinhos', {
					params: { idUsuario: outcome.customer.id },
				});
				const body = await response.json();
				expect(body.carrinhos).toHaveLength(outcome.status === 201 ? 1 : 0);
			}

			const winner = outcomes.find((item) => item.status === 201)!;
			const concurrentCancels = await Promise.all([
				request.delete('/carrinhos/cancelar-compra', {
					headers: authHeaders(winner.customer.token),
				}),
				request.delete('/carrinhos/cancelar-compra', {
					headers: authHeaders(winner.customer.token),
				}),
			]);
			expect(concurrentCancels.map((response) => response.status())).toEqual([
				200,
				200,
			]);
			const restoredProduct = await request.get(
				`/produtos/${scenario.productId}`
			);
			expect((await restoredProduct.json()).quantidade).toBe(1);
		} finally {
			for (const customer of customers) {
				await safeDelete(
					request,
					'/carrinhos/cancelar-compra',
					customer.token
				);
			}
			await cleanupCartScenario(request, scenario);
			await cleanupTestUser(request, secondCustomer);
		}
	});

	test('TC-035 | cancelamento e nova compra concorrentes preservam o estoque', async ({
		request,
	}) => {
		const scenario = await createCartScenario(request, { quantidade: 1 });
		const secondCustomer = await createTestUser(request);

		try {
			const initialCart = await request.post('/carrinhos', {
				headers: authHeaders(scenario.customerToken),
				data: {
					produtos: [{ idProduto: scenario.productId, quantidade: 1 }],
				},
			});
			expect(initialCart.status()).toBe(201);

			const [firstCancel, secondCancel, competingOrder] = await Promise.all([
				request.delete('/carrinhos/cancelar-compra', {
					headers: authHeaders(scenario.customerToken),
				}),
				request.delete('/carrinhos/cancelar-compra', {
					headers: authHeaders(scenario.customerToken),
				}),
				request.post('/carrinhos', {
					headers: authHeaders(secondCustomer.token),
					data: {
						produtos: [{ idProduto: scenario.productId, quantidade: 1 }],
					},
				}),
			]);

			expect(firstCancel.status()).toBe(200);
			expect(secondCancel.status()).toBe(200);
			expect([201, 400]).toContain(competingOrder.status());

			const stock = (await (
				await request.get(`/produtos/${scenario.productId}`)
			).json()).quantidade;
			expect(stock).toBe(competingOrder.status() === 201 ? 0 : 1);
			const secondCustomerCarts = await request.get('/carrinhos', {
				params: { idUsuario: secondCustomer.id },
			});
			expect((await secondCustomerCarts.json()).carrinhos).toHaveLength(
				competingOrder.status() === 201 ? 1 : 0
			);
		} finally {
			await safeDelete(
				request,
				'/carrinhos/cancelar-compra',
				secondCustomer.token
			);
			await cleanupCartScenario(request, scenario);
			await cleanupTestUser(request, secondCustomer);
		}
	});

	test('conclui a compra removendo o carrinho sem devolver o estoque', async ({ request }) => {
		const scenario = await createCartScenario(request);

		try {
			const createResponse = await request.post('/carrinhos', {
				headers: authHeaders(scenario.customerToken),
				data: {
					produtos: [{ idProduto: scenario.productId, quantidade: 1 }],
				},
			});
			expect(createResponse.status()).toBe(201);
			const created = await createResponse.json();

			const finishResponse = await request.delete('/carrinhos/concluir-compra', {
				headers: authHeaders(scenario.customerToken),
			});
			expect(finishResponse.status()).toBe(200);
			expect((await finishResponse.json()).message).toContain(
				'Registro excluído com sucesso'
			);

			expect((await request.get(`/carrinhos/${created._id}`)).status()).toBe(400);
			const productResponse = await request.get(`/produtos/${scenario.productId}`);
			expect((await productResponse.json()).quantidade).toBe(9);
		} finally {
			await cleanupCartScenario(request, scenario);
		}
	});

	test('DELETE concluir e cancelar respondem 401 sem token e 200 sem carrinho', async ({
		request,
	}) => {
		const scenario = await createCartScenario(request);
		const expiredTokenHeaders = authHeaders(
			createExpiredAuthorization(
				scenario.customerEmail,
				scenario.customerPassword
			)
		);

		try {
			for (const path of [
				'/carrinhos/concluir-compra',
				'/carrinhos/cancelar-compra',
			]) {
				for (const headers of [
					undefined,
					authHeaders('token-invalido'),
					expiredTokenHeaders,
				]) {
					const response = await request.delete(path, { headers });
					expect(response.status()).toBe(401);
					expect((await response.json()).message).toEqual(expect.any(String));
				}
			}

			for (const path of [
				'/carrinhos/concluir-compra',
				'/carrinhos/cancelar-compra',
			]) {
				const response = await request.delete(path, {
					headers: authHeaders(scenario.customerToken),
				});
				expect(response.status()).toBe(200);
				expect((await response.json()).message).toContain(
					'Não foi encontrado carrinho'
				);
			}

			const revokedCustomer = await createTestUser(request);
			await cleanupTestUser(request, revokedCustomer);
			for (const response of [
				await request.post('/carrinhos', {
					headers: authHeaders(revokedCustomer.token),
					data: {
						produtos: [{ idProduto: scenario.productId, quantidade: 1 }],
					},
				}),
				await request.delete('/carrinhos/concluir-compra', {
					headers: authHeaders(revokedCustomer.token),
				}),
				await request.delete('/carrinhos/cancelar-compra', {
					headers: authHeaders(revokedCustomer.token),
				}),
			]) {
				expect(response.status()).toBe(401);
			}
		} finally {
			await cleanupCartScenario(request, scenario);
		}
	});
});