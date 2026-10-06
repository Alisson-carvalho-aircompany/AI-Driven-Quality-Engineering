# ServeRest API Automation with GenAI

Automação REST baseada no API Test Plan do Topic 1.

## Stack
- TypeScript
- Playwright Test / APIRequestContext
- Node.js

## Princípios de engenharia
- Testes independentes e determinísticos
- Builders para dados únicos
- Setup/cleanup explícitos
- Assertions de status + contrato + estado
- Rastreabilidade TC -> teste automatizado
- Segredos/configuração fora do código
- Human Review do conteúdo gerado por GenAI

## Executar
```bash
npm install
npm test
```

Relatório HTML:
```bash
npm run test:report
```
