# Documento Mestre — Financeiro CRM v13.00

## Versão-base

- Versão: **v13.00**
- Build: **2026-07-08-v13-00-reconstrucao-local-estavel**
- Estratégia: reconstrução técnica local estável.
- Nuvem/login: **bloqueados nesta versão**. O app funciona sem Supabase e sem chave externa.
- Dados reais: versão iniciada como app zerado, conforme autorização do usuário.

## Objetivo do app

Controlar o patrimônio pessoal, a evolução até uma meta financeira e os movimentos que explicam a variação do dinheiro, evitando misturar faturamento de trabalho com rendimento financeiro.

## Regras principais

1. Patrimônio bruto = Caixinha Futuro + Caixinha Giro + Carteira/espécie + Banco/conta + Outros investimentos.
2. Patrimônio líquido = Patrimônio bruto - Fatura aberta - Outras dívidas.
3. Rendimento aumenta patrimônio, mas não entra como faturamento de trabalho.
4. Compra no cartão aumenta a fatura aberta e reduz o patrimônio líquido.
5. Pagamento do cartão reduz uma conta e reduz a fatura, sem mudar o patrimônio líquido quando a dívida já estava registrada.
6. Transferência não é receita nem despesa; apenas muda o dinheiro de lugar.
7. iFood em dinheiro:
   - Carteira aumenta pelo valor recebido do cliente.
   - Caixinha Giro diminui pelo troco usado.
   - O patrimônio líquido aumenta apenas pelo valor líquido da corrida: recebido - troco.
8. Um registro de patrimônio completo vira a nova base real de cálculo.
9. Movimentos criados depois da última base são aplicados para estimar o saldo vivo atual.
10. A meta principal possui valor e data editáveis. Alterar qualquer um recalcula falta, progresso e ritmo mensal necessário.

## Estrutura dos dados

### settings.goal

- id
- name
- target
- due

### patrimonio[]

- id
- data
- createdAt
- updatedAt
- futuro
- giro
- carteira
- banco
- investimentos
- faturaAberta
- outrasDividas
- rendimentoFuturo
- rendimentoGiro
- observacoes

### movements[]

Tipos aceitos:

- entrada
- saida
- transferencia
- rendimento
- ifood_dinheiro
- cartao
- pagamento_cartao

Campos principais:

- id
- type
- data
- createdAt
- updatedAt
- description
- category
- account
- fromAccount
- toAccount
- value
- received
- change
- notes

## Telas obrigatórias

1. Dashboard
   - Patrimônio líquido.
   - Falta para objetivo.
   - Meta clicável/editável.
   - Prazo clicável/editável.
   - Progresso.
   - Ritmo mensal necessário.
   - Composição do patrimônio.
   - Últimos registros.

2. Registrar
   - Patrimônio completo.
   - Lançamentos de entrada, saída, transferência, rendimento, iFood dinheiro, compra no cartão e pagamento do cartão.

3. Histórico
   - Listagem de patrimônios e movimentos.
   - Edição.
   - Exclusão.
   - Exportação CSV.

4. Rendimentos
   - Registro rápido de rendimento separado para Futuro ou Giro.
   - Rendimento separado do faturamento.

5. Perfil
   - Modo local.
   - Configurações simples.
   - Exportar backup JSON.
   - Importar backup JSON.
   - Exportar CSV.
   - Zerar app.

## Política de versões

- v13.00: reconstrução local estável.
- v13.01, v13.02 etc.: correções pequenas.
- v13.10: futura sincronização em nuvem, se a base local estiver estável.
- v14.00: apenas para mudança grande de produto/arquitetura.

## Checklist mínimo antes de entregar uma versão

- O app abre sem erro de JavaScript.
- O app não tenta fazer login nem conectar Supabase na v13.00.
- É possível registrar patrimônio completo.
- É possível registrar entrada.
- É possível registrar saída.
- É possível registrar transferência.
- É possível registrar rendimento.
- É possível registrar iFood em dinheiro.
- É possível registrar compra no cartão.
- É possível registrar pagamento do cartão.
- O Dashboard recalcula patrimônio e meta.
- Meta de `100000`, `100000,00` ou `100.000,00` vira R$ 100.000,00.
- Alterar prazo da meta muda o ritmo mensal necessário.
- Histórico lista registros.
- Histórico permite editar e excluir.
- Backup JSON exporta.
- Backup JSON importa.
- CSV exporta.
- Fechar e abrir mantém dados no localStorage.
