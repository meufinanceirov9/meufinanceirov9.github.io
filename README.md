# Financeiro CRM v13.01

**Build:** `2026-07-08-v13-01-mascara-valores-padronizada`

Esta versão mantém a reconstrução local estável da v13.00 e corrige a experiência de preenchimento dos campos monetários.

## O que mudou na v13.01

- O visual/frontend da v13 foi mantido como padrão do app.
- Todos os campos com valor monetário usam a mesma máscara visual.
- Ao digitar, os centavos sobem de forma padronizada:
  - `1` vira `0,01`
  - `12` vira `0,12`
  - `123` vira `1,23`
  - `1234` vira `12,34`
  - `123456` vira `1.234,56`
- A máscara foi aplicada por delegação de evento, então também funciona em campos criados depois, como edição de histórico e modal da meta.
- Ao focar em um campo de valor, o conteúdo é selecionado para facilitar substituir o valor inteiro.
- Ao sair do campo, o valor é normalizado no formato brasileiro.
- O parser interno continua aceitando `100000`, `100000,00` e `100.000,00` como R$ 100.000,00 em backups/importações/código.

## Base preservada da v13.00

- Código separado em camadas:
  - `core.js`: regras financeiras, cálculos, migração e validação.
  - `app.js`: interface, formulários, eventos e localStorage.
  - `styles.css`: visual.
- Login/Supabase removidos da execução local.
- Dashboard com meta e prazo editáveis.
- Patrimônio completo como base real de cálculo.
- Movimentos depois da base atualizam saldos vivos.
- Rendimento separado de faturamento.
- iFood em dinheiro: carteira sobe pelo recebido e Giro desce pelo troco.
- Backup JSON, importação de backup e exportação CSV.
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

Usar a v13.01 em testes locais e validar todos os campos de valor. Só depois pensar em `v13.10` com Supabase/sincronização.
