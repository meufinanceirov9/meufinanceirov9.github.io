# Documento Mestre — Financeiro CRM v13.07

## Versão-base

- Versão: **v13.07**
- Build: **2026-07-24-v13-07-entregas-e-navegacao-movel**
- Estratégia: reconstrução técnica local estável, preservando o visual v13 como padrão do app.
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

11. O frontend/visual da v13 é o padrão oficial do app e deve ser preservado nas próximas versões, salvo pedido explícito de redesign.
12. Todos os campos monetários devem usar a mesma máscara visual de centavos subindo ao digitar. Ex.: `1` → `0,01`, `123` → `1,23`, `123456` → `1.234,56`.

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
- capturedAt
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
- competenceDate
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
- v13.01: máscara de valores monetários padronizada, preservando visual v13.
- v13.02: ícone da página/favicon padronizado com o visual v13 do app.
- v13.03: revisão de funcionamento local, privacidade do modo ocultar saldos, validações extras e CSV completo.
- v13.04: auditoria entre bases, cache e ícones versionados.
- v13.05: rendimento automático assistido das caixinhas.
- v13.06: corte correto da base diária, deduplicação, rendimentos separados e recuperação automática.
- v13.07: semana de entregas, data de competência, atalhos, filtros e navegação móvel com quatro abas.
- v13.10: futura sincronização em nuvem, se a base local estiver estável.
- v14.00: apenas para mudança grande de produto/arquitetura.

## Checklist mínimo antes de entregar uma versão

- O app abre sem erro de JavaScript.
- O app não tenta fazer login nem conectar Supabase na linha v13 local.
- É possível registrar patrimônio completo.
- É possível registrar entrada.
- É possível registrar saída.
- É possível registrar transferência.
- É possível registrar rendimento.
- É possível registrar iFood em dinheiro.
- É possível registrar compra no cartão.
- É possível registrar pagamento do cartão.
- O Dashboard recalcula patrimônio e meta.
- Parser interno aceita `100000`, `100000,00` ou `100.000,00` como R$ 100.000,00.
- Máscara visual monetária é igual em todos os campos: `123456` vira `1.234,56`.
- Alterar prazo da meta muda o ritmo mensal necessário.
- Histórico lista registros.
- Histórico permite editar e excluir.
- Backup JSON exporta.
- Backup JSON importa.
- CSV exporta com componentes completos do patrimônio.
- Modo ocultar saldos não revela valores por porcentagem/barra.
- iFood em dinheiro bloqueia troco maior que recebido.
- Fechar e abrir mantém dados no localStorage.

## Atualização v13.04 — auditoria, cache e ícone

- O visual da linha v13 continua imutável como padrão aprovado.
- Favicon/ícone de aba passa a usar arquivo versionado específico (`favicon-v13-04`) para evitar cache antigo do Chrome.
- O app ganha uma rotina manual de atualização/limpeza de cache em Perfil.
- A navegação HTML do service worker passa a usar network-first.
- A auditoria entre bases deve identificar variações de patrimônio que não foram explicadas por movimentos.
- Diferenças positivas sem movimentos podem indicar rendimento CDI ou ajuste de base; o app não deve classificar automaticamente como faturamento.
- Rendimentos preenchidos nos campos da base diária devem entrar no resumo de rendimentos do mês.

## Atualização v13.05 — rendimento automático assistido

Objetivo: o usuário não deve precisar calcular manualmente o rendimento diário das Caixinhas do Nubank comparando saldo anterior e saldo atual.

Regra implementada:

1. Ao registrar uma nova base de patrimônio, o app compara os saldos atuais com a base anterior.
2. Movimentos lançados entre as bases são descontados da diferença.
3. A sobra positiva em Caixinha Futuro e Caixinha Giro é sugerida como rendimento provável/CDI.
4. Entradas reais, como entregas lançadas na Caixinha Giro, não devem ser tratadas como rendimento.
5. Rendimento sugerido pode ser aplicado nos campos `rendimentoFuturo` e `rendimentoGiro` da base.
6. O Dashboard mostra o rendimento provável na auditoria entre as últimas bases.
7. Uma nova base para uma data já existente atualiza a base daquele dia em vez de criar duplicidade.
8. Ferramentas técnicas de cache ficam ocultas no modo usuário e aparecem apenas em modo desenvolvedor.

Exemplo de referência:

- Base anterior: Futuro R$ 14.362,91 e Giro R$ 529,47.
- Nova base: Futuro R$ 14.370,45 e Giro R$ 574,73.
- Movimento lançado entre bases: entrada de R$ 45,00 no Giro.
- Rendimento sugerido: Futuro R$ 7,54; Giro R$ 0,26; total R$ 7,80.

## Atualização v13.06 — consistência e segurança dos dados

1. Cada base possui `capturedAt`, que representa o horário em que aqueles saldos reais foram conferidos.
2. Ao atualizar a base do mesmo dia, o corte avança e impede que lançamentos já refletidos nos saldos sejam somados de novo.
3. Backups antigos com várias bases na mesma data são normalizados para uma base, conservando a captura mais recente.
4. Lançamentos retroativos de dias intermediários explicam a variação entre bases mesmo quando foram digitados depois.
5. Rendimento informado na base deixa de aparecer como diferença pendente no Dashboard.
6. Futuro e Giro possuem totais mensais próprios e histórico com valores automáticos e manuais.
7. Antes de alterações importantes, o app guarda até dez pontos locais de recuperação.
8. A importação bloqueia JSON sem estrutura reconhecida, valida os dados e pede confirmação com a quantidade de registros.

## Atualização v13.07 — entregas e navegação móvel

1. A semana de entregas vai de segunda a domingo.
2. `data` representa quando o dinheiro efetivamente entrou e continua sendo usada nos saldos.
3. `competenceDate` é opcional e representa a semana em que o trabalho foi realizado.
4. Entradas com categoria Entrega e registros de iFood em dinheiro alimentam o resumo semanal.
5. O iFood em dinheiro considera como faturamento líquido `recebido - troco`.
6. O Dashboard separa entrega via depósito/Pix e em espécie.
7. O formulário possui atalhos para as fontes de renda mais usadas.
8. No celular, Início, Registrar, Histórico e Perfil ficam fixos na barra inferior.
9. Rendimentos permanece acessível pelo menu superior, evitando excesso de abas na barra principal.
10. O Histórico pode ser filtrado por busca, mês e tipo sem alterar ou excluir dados.
