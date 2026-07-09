# Testes executados — Financeiro CRM v13.01

## Testes automáticos de core

Arquivo: `tests/core.test.js`

Cobertura principal:

- Parser de dinheiro brasileiro:
  - `100000`
  - `100000,00`
  - `100.000,00`
  - `R$ 100.000,99`
- Máscara visual monetária padronizada:
  - `1` → `0,01`
  - `12` → `0,12`
  - `123` → `1,23`
  - `1234` → `12,34`
  - `123456` → `1.234,56`
- Cálculo de patrimônio bruto e líquido.
- Compra no cartão aumentando fatura aberta.
- Pagamento do cartão sem alterar patrimônio líquido indevidamente.
- iFood em dinheiro: carteira aumenta e Giro diminui pelo troco.
- Rendimento separado de faturamento.
- Alteração de prazo da meta alterando ritmo mensal.
- Validação estrutural do estado.
- Migração de backup embrulhado em `{ data: ... }`.

## Testes manuais recomendados no navegador

1. Abrir o app.
2. Registrar patrimônio completo zerado ou com valores fictícios.
3. Conferir campos de valor: digitar `123456` e confirmar que aparece `1.234,56`.
4. Clicar no valor da meta no Dashboard e digitar `10000000` ou colar `100.000,00` para R$ 100.000,00.
5. Clicar na data do prazo e alterar um mês antes.
6. Confirmar que o ritmo mensal aumenta.
7. Registrar uma entrada.
8. Registrar uma saída.
9. Registrar uma compra no cartão.
10. Registrar pagamento do cartão.
11. Registrar iFood em dinheiro com recebido e troco.
12. Registrar rendimento da Caixinha Futuro.
13. Abrir Histórico.
14. Editar um lançamento.
15. Excluir um lançamento.
16. Exportar backup JSON.
17. Importar backup JSON.
18. Fechar e abrir o navegador e confirmar que os dados locais continuam.

## Observação

A linha v13 local não testa login porque login/nuvem foi intencionalmente desativado nesta etapa.
