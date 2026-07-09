# Financeiro CRM v13.03

**Build:** `2026-07-09-v13-03-revisao-funcionamento-local`

Esta versão mantém a reconstrução local estável da v13.00, preserva a máscara monetária da v13.01 e o ícone padronizado da v13.02, mas faz uma revisão geral de funcionamento local antes de continuar evoluindo o app.

## O que mudou na v13.03

- O visual/frontend da v13 foi preservado como padrão oficial do app.
- O modo **Ocultar saldos** ficou mais seguro: além dos valores em reais, o app também oculta porcentagens e barras que poderiam revelar indiretamente o patrimônio/meta.
- O lançamento de **iFood em dinheiro** agora bloqueia troco maior que o valor recebido.
- A validação estrutural também sinaliza transferências com origem e destino iguais.
- O registro rápido de rendimento agora cria backup automático antes de salvar.
- A exportação CSV ficou mais completa:
  - inclui patrimônio bruto e líquido;
  - inclui Futuro, Giro, Carteira, Banco, Investimentos, Fatura e Dívidas;
  - inclui Rendimento Futuro e Rendimento Giro registrados na base;
  - usa BOM UTF-8 para abrir melhor no Excel/planilhas.
- Os testes automáticos foram ampliados com migração de backup antigo v13 e validações adicionais.

## Base preservada

- v13.00: reconstrução local estável.
- v13.01: máscara visual monetária padronizada em todos os campos.
- v13.02: ícone da página/favicon padronizado.
- v13.03: revisão de segurança local, privacidade, CSV e validação.

## Regras importantes mantidas

- Login/Supabase continuam fora da execução local.
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

Usar a v13.03 em testes reais no GitHub Pages. Se o uso local continuar estável, a sincronização em nuvem pode entrar só depois, como `v13.10`.
