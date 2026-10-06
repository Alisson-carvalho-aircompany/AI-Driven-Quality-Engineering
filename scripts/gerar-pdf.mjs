import { chromium } from '@playwright/test';
import { mkdir, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const root = process.cwd();
const reportPath = resolve(root, 'playwright-report', 'index.html');
const evidenceDirectory = resolve(root, 'docs', 'evidencias');
const screenshotPath = resolve(evidenceDirectory, 'relatorio-playwright.png');
const pdfPath = resolve(
  root,
  'Relatorio_API_Test_Automation_GenAI_Alisson_Carvalho.pdf'
);
const candidates = [
  process.env.EDGE_PATH,
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
].filter(Boolean);
const browserPath = candidates.find((candidate) => existsSync(candidate));

if (!existsSync(reportPath)) {
  throw new Error('Relatório HTML não encontrado. Execute npm test antes de gerar o PDF.');
}
if (!browserPath) {
  throw new Error(
    'Nenhum Edge/Chrome encontrado. Defina EDGE_PATH para o executável Chromium.'
  );
}

await mkdir(evidenceDirectory, { recursive: true });
const browser = await chromium.launch({
  executablePath: browserPath,
  headless: true,
  args: ['--no-sandbox'],
});

try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });
  const reportPage = await context.newPage();
  await reportPage.goto(pathToFileURL(reportPath).href, { waitUntil: 'load' });
  await reportPage.waitForTimeout(2000);
  await reportPage.screenshot({ path: screenshotPath, fullPage: false });

  const screenshot = (await readFile(screenshotPath)).toString('base64');
  const page = await context.newPage();
  const html = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<title>Automação de Testes de API com GenAI</title>
<style>
@page { size: A4; margin: 15mm 17mm 16mm; }
* { box-sizing: border-box; }
body { margin: 0; color: #192638; font: 10pt/1.42 Arial, Helvetica, sans-serif; }
.page { min-height: 264mm; break-after: page; page-break-after: always; position: relative; }
.page:last-child { break-after: auto; page-break-after: auto; }
.cover { min-height: 264mm; padding: 33mm 15mm 20mm; display: flex; flex-direction: column; justify-content: space-between; color: #fff; background: linear-gradient(145deg,#10213b,#173d67 58%,#087e8b); }
.eyebrow { font-size: 10pt; letter-spacing: 2px; text-transform: uppercase; color: #a9e8e3; font-weight: 700; }
h1 { font-size: 31pt; line-height: 1.14; margin: 18mm 0 7mm; max-width: 145mm; }
.subtitle { font-size: 14pt; color: #e0eef7; max-width: 135mm; }
.cover-rule { width: 28mm; height: 2px; background: #4fd1c5; margin: 12mm 0; }
.cover-meta { display: grid; grid-template-columns: 1fr 1fr; gap: 8mm; font-size: 11pt; }
.cover-meta strong { display: block; color: #a9e8e3; font-size: 8pt; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 2mm; }
.cover-note { color: #c3d4e2; font-size: 9pt; }
h2 { font-size: 19pt; line-height: 1.2; color: #12345a; margin: 0 0 5mm; padding-bottom: 3mm; border-bottom: 2px solid #36b7b2; }
h3 { font-size: 12pt; color: #0d6671; margin: 5mm 0 2mm; }
p { margin: 0 0 3mm; }
ul, ol { padding-left: 6mm; margin: 2mm 0 4mm; }
li { margin: 0 0 1.5mm; }
.lead { font-size: 11pt; color: #3d5268; }
.callout { background: #edf7f8; border-left: 3px solid #15969a; padding: 3mm 4mm; margin: 4mm 0; }
.warning { background: #fff5e9; border-left-color: #e28a16; }
.success { background: #edf7ef; border-left-color: #34844f; }
.grid { display: grid; grid-template-columns: 1fr 1fr; gap: 3mm; }
.card { border: 1px solid #dce5eb; border-radius: 2mm; padding: 3mm; }
.card strong { color: #12345a; }
table { width: 100%; border-collapse: collapse; margin: 3mm 0 4mm; font-size: 8.6pt; }
th { color: #fff; background: #153c61; text-align: left; font-weight: 700; }
th, td { border: 1px solid #d4dfe7; padding: 2.2mm; vertical-align: top; }
tr:nth-child(even) td { background: #f5f8fa; }
code, pre { font-family: Consolas, 'Courier New', monospace; }
pre { background: #14243a; color: #edf5fb; padding: 4mm; border-radius: 2mm; font-size: 9pt; line-height: 1.55; white-space: pre-wrap; }
.kpis { display: grid; grid-template-columns: repeat(3,1fr); gap: 3mm; margin: 4mm 0; }
.kpi { padding: 3mm; text-align: center; background: #f2f6f8; border: 1px solid #dce5eb; }
.kpi b { display: block; font-size: 20pt; color: #173d67; }
.kpi span { font-size: 8.5pt; color: #516477; }
.evidence { margin-top: 3mm; text-align: center; }
.evidence img { width: 100%; height: 78mm; object-fit: cover; object-position: top center; border: 1px solid #ccd8e0; }
.caption { color: #586d80; font-size: 8pt; margin-top: 1mm; }
.small { font-size: 8.5pt; color: #4d5f70; }
.url { overflow-wrap: anywhere; color: #087e8b; }
.check { color: #1d6b43; font-weight: 700; }
.fail { color: #a53c24; font-weight: 700; }
</style>
</head>
<body>
<section class="page cover">
 <div>
  <div class="eyebrow">Qualidade de software · API testing</div>
  <h1>API Test Automation<br>with GenAI</h1>
  <div class="subtitle">Automação de testes REST da ServeRest com análise crítica de respostas e evidências de execução</div>
  <div class="cover-rule"></div>
 </div>
 <div>
  <div class="cover-meta">
   <div><strong>Aluno</strong>Alisson Carvalho de Souza</div>
   <div><strong>Data</strong>05 de outubro de 2026</div>
   <div><strong>API testada</strong>compassuol.serverest.dev</div>
   <div><strong>Assistente de IA</strong>GitHub Copilot no VS Code</div>
  </div>
  <p class="cover-note" style="margin-top:12mm">Projeto executável em TypeScript e Playwright Test · Relatório de validação técnica</p>
 </div>
</section>

<section class="page">
 <h2>1. Introdução e escolhas</h2>
 <p class="lead">O objetivo foi automatizar cenários REST reais para autenticação, usuários, produtos e carrinhos, com respostas verificadas por contrato, estado e comportamento observável.</p>
 <h3>Assistente de IA e tecnologia</h3>
 <table>
  <tr><th>Item</th><th>Escolha aplicada</th></tr>
  <tr><td>Assistente GenAI</td><td>GitHub Copilot integrado ao VS Code. Nesta execução, foi usado para interpretar o enunciado, apoiar a revisão e investigação dos testes, analisar a cobertura e organizar o log e o relatório.</td></tr>
  <tr><td>Linguagem e runtime</td><td>TypeScript e Node.js 24.21.0.</td></tr>
  <tr><td>Automação</td><td>Playwright Test 1.63.0, com <code>APIRequestContext</code> para chamadas HTTP; não são testes de interface gráfica.</td></tr>
  <tr><td>Aplicação alvo</td><td><span class="url">https://compassuol.serverest.dev/</span>, serviço remoto de demonstração.</td></tr>
 </table>
 <h3>Estratégia adotada</h3>
 <ul>
  <li>Separação por recurso e rastreabilidade dos casos TC-001 a TC-035 na matriz do projeto.</li>
  <li>Dados de teste únicos por execução; usuários e produtos preparados pelos próprios testes e removidos em rotinas de limpeza.</li>
  <li>Validação de status HTTP, corpo da resposta, persistência e efeitos sobre carrinhos/estoque.</li>
  <li>Entradas exploratórias sem oráculo documentado registram a resposta observada, sem assumir um status esperado.</li>
 </ul>
 <div class="callout"><strong>Premissa registrada.</strong> O plano integral produzido no Tópico 1 não está anexado separadamente ao checkout. Para executar a atividade, foram adotados o plano referenciado no README e a matriz de rastreabilidade já existente; a escolha de Copilot é a ferramenta usada nesta execução no VS Code.</div>
 <h3>Repositório do projeto</h3>
 <p class="url">https://github.com/Alisson-carvalho-aircompany/AI-Driven-Quality-Engineering</p>
</section>

<section class="page">
 <h2>2. Desenvolvimento e cenários</h2>
 <p>A suíte cobre as 16 operações documentadas da API, agrupadas nos quatro recursos solicitados. Há 30 testes Playwright; alguns testes exercitam mais de uma operação ou várias entradas. A matriz TC-001 a TC-035 está em <code>docs/traceability.md</code>.</p>
 <table>
  <tr><th>Recurso / operações</th><th>Cenários positivos</th><th>Negativos e de borda</th></tr>
  <tr><td><strong>Autenticação</strong><br><code>POST /login</code></td><td>Login com credenciais válidas; validação do token recebido.</td><td>Senha incorreta, e-mail inexistente, credenciais vazias, ausentes e tipos incompatíveis.</td></tr>
  <tr><td><strong>Usuários</strong><br><code>GET/POST /usuarios</code><br><code>GET/PUT/DELETE /usuarios/{id}</code></td><td>Listagem e filtros; criação com perfis administrador e comum; consulta, edição, exclusão e persistência.</td><td>E-mail duplicado; campos inválidos/vazios; ID inexistente ou malformado; conflito de e-mail no PUT; remoção condicionada por carrinho.</td></tr>
  <tr><td><strong>Produtos</strong><br><code>GET/POST /produtos</code><br><code>GET/PUT/DELETE /produtos/{id}</code></td><td>Filtros; criação, consulta, edição e remoção com usuário administrador; confirmação de estado e estoque.</td><td>Nome duplicado; campos e limites inválidos; ID inexistente; token ausente, inválido ou expirado; usuário sem permissão; produto associado a carrinho.</td></tr>
  <tr><td><strong>Carrinhos</strong><br><code>GET/POST /carrinhos</code><br><code>GET /carrinhos/{id}</code><br><code>POST /carrinhos/concluir-compra</code><br><code>DELETE /carrinhos/cancelar-compra</code></td><td>Carrinhos com um/múltiplos produtos; preço e total; conclusão de compra, cancelamento e impacto no estoque.</td><td>Produto inexistente, quantidade inválida/sem estoque, repetição de produto, segundo carrinho, falta de autenticação e corridas concorrentes.</td></tr>
 </table>
 <h3>Comandos para execução</h3>
 <pre>npm install
npm test
npm run typecheck
npm run test:report
npm run report:pdf</pre>
 <p class="small">Configuração da URL: <code>BASE_URL</code> (valor padrão no Playwright: <code>https://compassuol.serverest.dev</code>). Relatório HTML: <code>playwright-report/</code>. PDF: arquivo com o nome desta entrega na raiz do projeto.</p>
</section>

<section class="page">
 <h2>3. Evidências e resultados</h2>
 <p>Execução funcional realizada contra o serviço remoto em 05/10/2026; relatório produzido pelo Playwright Test.</p>
 <div class="kpis">
  <div class="kpi"><b>30</b><span>testes executados</span></div>
  <div class="kpi"><b class="check">29</b><span>aprovados</span></div>
  <div class="kpi"><b class="fail">1</b><span>falha reproduzida</span></div>
 </div>
 <table>
  <tr><th>Validação</th><th>Resultado observado</th></tr>
  <tr><td><code>npm run typecheck</code></td><td class="check">Aprovado; TypeScript sem erros.</td></tr>
  <tr><td>Autenticação isolada</td><td class="check">6/6 testes aprovados.</td></tr>
  <tr><td>Execução completa subsequente</td><td>29 aprovados; 1 falhou em <code>TC-035</code>; duração aproximada de 1,6 min.</td></tr>
  <tr><td>Primeira execução completa</td><td>Um timeout de 30 s no hook de autenticação; 24 aprovados e cinco não executados. O teste isolado e a execução completa seguinte passaram pela autenticação.</td></tr>
 </table>
 <div class="callout warning"><strong>Falha preservada — concorrência no estoque.</strong> Em <code>tests/api/carts/carts.spec.ts</code>, o teste disputa a última unidade e executa cancelamentos simultâneos. A resposta observada deixou o estoque em <strong>2</strong>, embora o estado correto após a reposição de uma unidade fosse <strong>1</strong> (assertiva falhou: esperado 1, recebido 2). O teste permaneceu ativo para evidenciar a inconsistência; o defeito é da API remota, não corrigível neste projeto de testes.</div>
 <div class="evidence"><img src="data:image/png;base64,${screenshot}" alt="Captura do relatório HTML do Playwright gerado pela execução completa"></div>
 <p class="caption">Figura 1 — Captura do relatório HTML real do Playwright. O PDF é gerado a partir do relatório da execução mais recente.</p>
 <p class="small">A API é remota e compartilhada; latência e estado externo podem variar. Uma falha de teste não foi reclassificada como aprovação.</p>
</section>

<section class="page">
 <h2>4. Uso da GenAI e revisão crítica</h2>
 <p>O assistente ajudou a transformar o enunciado em uma conferência de cobertura, inspecionar builders, helpers, testes e matriz existentes, analisar resultados das chamadas HTTP reais e produzir documentação reprodutível. O teste e o código foram tratados como hipóteses a validar, não como autoridade.</p>
 <table>
  <tr><th>Etapa apoiada pela IA</th><th>Validação/ajuste humano</th></tr>
  <tr><td>Geração e organização dos cenários por recurso.</td><td>Comparação com a matriz e as chamadas efetivamente executadas; cobertura positiva, negativa e de borda descrita sem prometer estados não exercitados.</td></tr>
  <tr><td>Revisão de dados de teste, autenticação, preparação e limpeza.</td><td>Verificação do typecheck e execução real; os seis cenários de login foram repetidos isoladamente após timeout inicial.</td></tr>
  <tr><td>Sugestões de assertions e revisão de cobertura.</td><td>Checagem de status, schema, persistência e estoque. Na entrada exploratória sem contrato, o teste anexa a resposta em vez de inventar um status obrigatório.</td></tr>
  <tr><td>Diagnóstico de falha e documentação.</td><td>TC-035 manteve a assertiva de estoque. O resultado 2, em vez de 1, ficou registrado como falha da API; não foi desativado nem convertido em sucesso.</td></tr>
 </table>
 <h3>Registro dos ajustes nesta execução</h3>
 <ol>
  <li><strong>Timeout de autenticação:</strong> primeiro hook excedeu 30 s. Reexecução isolada (6/6) e execução completa seguinte não reproduziram o timeout; documentado como intermitência observada, sem atribuir causa não comprovada.</li>
  <li><strong>Corrida de compra/cancelamento:</strong> resultado observado contraria a conservação do estoque. Assertiva preservada para detectar regressão; correção necessária na aplicação alvo.</li>
  <li><strong>Relato:</strong> 29/30 apresentado como resultado parcial, com evidência e comando para reproduzir, sem esconder a falha.</li>
 </ol>
 <div class="callout"><strong>Limite de proveniência.</strong> O checkout não contém prompts ou histórico da etapa de geração anterior. Assim, o log descreve somente o uso e os ajustes verificáveis nesta execução, sem atribuir à IA alterações cuja autoria não pôde ser comprovada.</div>
 <p class="small">Log completo: <code>docs/genai-review-log.md</code>. Rastreabilidade: <code>docs/traceability.md</code>.</p>
</section>

<section class="page">
 <h2>5. Conferência final e conclusão</h2>
 <table>
  <tr><th>Requisito do enunciado</th><th>Verificação</th></tr>
  <tr><td>Assistente de IA e stack selecionados.</td><td class="check">Copilot no VS Code; TypeScript, Node.js e Playwright Test identificados.</td></tr>
  <tr><td>Cenários de autenticação, usuários, produtos e carrinhos.</td><td class="check">Cobertos na suíte e mapeados na matriz TC-001 a TC-035.</td></tr>
  <tr><td>Resultados realmente executados.</td><td class="check">Typecheck aprovado; 29/30 na execução completa mais recente; a falha de concorrência está explicitada.</td></tr>
  <tr><td>Evidências e link do repositório.</td><td class="check">Captura do relatório Playwright incorporada; link GitHub incluído.</td></tr>
  <tr><td>Uso da IA e log de ajustes/validações.</td><td class="check">Ferramenta, uso, limites, evidências, decisões e defeito documentados.</td></tr>
  <tr><td>Placeholders e premissas.</td><td class="check">Sem campos em aberto; ausência do plano integral do Tópico 1 foi indicada como premissa.</td></tr>
 </table>
 <h3>Conclusão</h3>
 <p>A automação exercita operações e regras importantes da Serverest e pode ser executada com os comandos listados. A validação estática e a autenticação passaram. A execução funcional mais recente detectou um defeito concorrente de reposição duplicada de estoque; portanto, a suíte não está totalmente aprovada e o achado deve ser tratado pela equipe responsável pela API.</p>
 <h3>Fontes</h3>
 <ul>
  <li>API ServeRest: <span class="url">https://compassuol.serverest.dev/</span></li>
  <li>Repositório e código-fonte: <span class="url">https://github.com/Alisson-carvalho-aircompany/AI-Driven-Quality-Engineering</span></li>
  <li>Relatório HTML de execução Playwright: arquivo local <code>playwright-report/index.html</code>, gerado com <code>npm test</code>.</li>
 </ul>
</section>
</body>
</html>`;

  await page.setContent(html, { waitUntil: 'load' });
  await page.pdf({
    path: pdfPath,
    format: 'A4',
    printBackground: true,
    preferCSSPageSize: true,
  });
  await context.close();
} finally {
  await browser.close();
}

console.log(`PDF gerado: ${pdfPath}`);
console.log(`Evidência do relatório: ${screenshotPath}`);
