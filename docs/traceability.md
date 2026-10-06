# Cobertura do Plano e Swagger ServeRest 3.2.2

| TC | Situação | Evidência/limite |
| --- | --- | --- |
| TC-001 | Coberto | Login válido (`200`), senha inválida e e-mail inexistente (`401`). |
| TC-002 | Coberto | E-mail/senha válidos, ausentes, vazios individualmente/em conjunto e tipos number; casos sem resposta contratada ficam anexados ao relatório. |
| TC-003 | Coberto | Rotas protegidas testam token válido, ausente, inválido, expirado assinado e token de usuário removido. |
| TC-004 | Coberto | Filtros individuais/combinados, `administrador=true/false`, inexistente e schema da coleção. |
| TC-005 | Coberto | Cadastro com administrador true/false, `message`, `_id` e persistência de todos os campos. |
| TC-006 | Coberto | Ausência, vazio, espaços, tipos incompatíveis, e-mail inválido e variações de administrador; resposta registrada sem status inventado. |
| TC-007 | Coberto | E-mail duplicado retorna `400`. |
| TC-008 | Coberto | ID existente/inexistente; ID malformado registrado como exploratório. |
| TC-009 | Coberto | `PUT` existente (`200`) e inexistente (`201`), com persistência validada. |
| TC-010 | Coberto | E-mail em conflito no `PUT` retorna `400`. |
| TC-011 | Coberto | Exclusão normal/inexistente (`200`) e usuário com carrinho (`400`, `idCarrinho`). |
| TC-012 | Coberto | Filtros individuais/combinados e schema dos produtos. |
| TC-013 | Coberto | Limites documentados; valores fora do schema registrados como exploratórios. |
| TC-014 | Coberto | Produto existente/inexistente; ID malformado registrado como exploratório. |
| TC-015 | Coberto | Criação admin (`201`), schema de resposta e persistência do produto. |
| TC-016 | Coberto | POST/PUT com campos ausentes, vazios, espaços, tipos inválidos e bordas numéricas; respostas anexadas. |
| TC-017 | Coberto | Nome duplicado retorna `400`. |
| TC-018 | Coberto | POST/PUT/DELETE com token ausente, inválido, expirado e usuário comum (`401/403`). |
| TC-019 | Coberto | `PUT` existente (`200`) e inexistente (`201`), com persistência de todos os campos. |
| TC-020 | Coberto | Nome duplicado (`400`), token inválido/ausente/expirado (`401`) e usuário comum (`403`). |
| TC-021 | Coberto | Remoção elegível/inexistente (`200`), produto em carrinho (`400`), token (`401/403`) e IDs dos carrinhos. |
| TC-022 | Coberto | Filtros individuais/combinados e estrutura dos carrinhos. |
| TC-023 | Parcial: divergência da API | Mínimos válidos são exercitados; `quantidadeTotal=0`, permitido pelo Swagger, retorna `400` na API. Respostas fora do schema ficam anexadas. |
| TC-024 | Coberto | Carrinho existente/inexistente; ID malformado registrado como exploratório. |
| TC-025 | Coberto | Carrinho com um e múltiplos produtos; itens, preços unitários, totais e usuário validados. |
| TC-026 | Coberto | Mesmo produto repetido retorna `400`. |
| TC-027 | Coberto | Segundo carrinho do usuário retorna `400`. |
| TC-028 | Coberto | Produto inexistente retorna `400`. |
| TC-029 | Coberto | Quantidades `1`, `N-1`, `N`, `N+1`, zero, negativa, decimal, string e ausente; casos exploratórios registram resposta. |
| TC-030 | Coberto | POST/DELETE com token ausente, inválido e expirado retornam `401`. |
| TC-031 | Coberto | Conclusão com/sem carrinho, autenticação e estado final/estoque. |
| TC-032 | Coberto | Cancelamento com/sem carrinho, autenticação e restauração de estoque. |
| TC-033 | Coberto | Totais de carrinho multi-item conferem com soma de quantidade e preço vezes quantidade. |
| TC-034 | Parcial | POST repetido após `201` não duplica carrinho nem baixa estoque; timeout de rede real não é simulado deterministicamente. |
| TC-035 | Implementado; falha intermitente | Corridas de compra/cancelamento estão automatizadas. Duplos cancelamentos podem repor a mesma unidade; em 3 de 5 repetições o estoque terminou em `2` em vez de `1`. |

## Cobertura de operações

As 16 operações OpenAPI possuem testes. Casos exploratórios anexam status e corpo ao relatório Playwright, sem impor oráculos não documentados.

## Divergências observadas

- `POST /login` com credenciais vazias retorna `400`, não listado no Swagger.
- `DELETE /produtos/{_id}` retorna `idCarrinhos` (plural), embora o schema declare `idCarrinho`.
- `GET /carrinhos?quantidadeTotal=0` retorna `400` (“deve ser um número positivo”), embora o Swagger declare mínimo zero.
- A concorrência no cancelamento pode repor estoque mais de uma vez; o teste TC-035 preserva essa falha como regressão detectada.

“Coberto” significa que os datasets descritos na matriz têm execução automatizada; não significa enumerar todo valor arbitrário possível. Expiração real é exercitada com JWT HS256 expirado, e timeout de transporte permanece exploratório por não haver um mecanismo confiável de simular perda de resposta na API remota.
