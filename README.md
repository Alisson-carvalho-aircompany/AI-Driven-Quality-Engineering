# Automação de API ServeRest com GenAI

Projeto de testes REST baseado no plano de testes de API do Tópico 1.

## Tecnologias
- TypeScript e Node.js
- Playwright Test com `APIRequestContext`
- GitHub Copilot no VS Code como assistente de IA

## Cobertura
Os testes exercitam autenticação, usuários, produtos e carrinhos, incluindo
fluxos positivos, negativos, limites, autenticação/autorização e concorrência.
A matriz de rastreabilidade está em [docs/traceability.md](docs/traceability.md).

## Executar localmente
```bash
npm install
npm test
npm run typecheck
```

O relatório HTML do Playwright é gerado em `playwright-report/` durante a
execução. Para abri-lo:
```bash
npm run test:report
```

Com uma execução recente, gere o PDF acadêmico e a captura do relatório:
```bash
npm run report:pdf
```

O PDF final é `Relatorio_API_Test_Automation_GenAI_Alisson_Carvalho.pdf`.
Ele registra os resultados observados, inclusive falhas reais da API; não
converte uma execução malsucedida em sucesso. O histórico de revisão assistida
por IA está em [docs/genai-review-log.md](docs/genai-review-log.md).

## Repositório
https://github.com/Alisson-carvalho-aircompany/AI-Driven-Quality-Engineering
