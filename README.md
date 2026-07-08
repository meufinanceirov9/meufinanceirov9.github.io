# Financeiro CRM v13.00

**Build:** `2026-07-08-v13-00-reconstrucao-local-estavel`

Esta versão é uma reconstrução técnica local estável feita a partir da linha v12.x, com o objetivo de parar os remendos e organizar o app como um sistema financeiro pessoal mais seguro.

## O que mudou

- Código separado em camadas:
  - `core.js`: regras financeiras, cálculos, migração e validação.
  - `app.js`: interface, formulários, eventos e localStorage.
  - `styles.css`: visual.
- Login/Supabase removidos da execução da v13.00.
- O app abre em modo local, sem tentar usar chave inválida.
- Dashboard mantém meta e prazo editáveis.
- Alterar meta ou prazo recalcula falta, progresso, barra e ritmo mensal.
- Patrimônio completo virou base real de cálculo.
- Movimentos depois da base atualizam saldos vivos.
- Rendimento fica separado de faturamento.
- iFood em dinheiro possui regra explícita: carteira sobe pelo recebido e Giro desce pelo troco.
- Backup JSON e importação de backup mantidos como prioridade.
- Histórico com edição e exclusão.

## Arquivos importantes

- `index.html`
- `core.js`
- `app.js`
- `styles.css`
- `DOCUMENTO_MESTRE_FINANCEIRO_CRM.md`
- `TESTES_v13.md`
- `tests/core.test.js`
- `manifest.webmanifest`
- `service-worker.js`
- `version.json`

## Próxima etapa recomendada

Usar a v13.00 por alguns testes locais. Só depois pensar em `v13.10` com Supabase/sincronização.
