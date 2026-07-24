# Financeiro CRM v13.07

Build: `2026-07-24-v13-07-entregas-e-navegacao-movel`

Versão local estável baseada na v13.06. Preserva o padrão visual oficial da linha v13 e melhora a rotina de entregas, a navegação no celular e a localização de registros.

## Melhorias da v13.07

- Adiciona o painel **Semana trabalhada** no Dashboard:
  - semana de segunda a domingo;
  - total de entregas;
  - Pix/depósitos separados do dinheiro líquido;
  - dias registrados e média diária;
  - indicação da quarta-feira esperada para o repasse do iFood.
- Separa a data em que o dinheiro entrou da data da semana trabalhada:
  - `data` continua movimentando o saldo no dia real do recebimento;
  - `competenceDate` organiza o valor na semana correta;
  - um repasse recebido na quarta pode pertencer à semana encerrada no domingo anterior.
- Adiciona o atalho **Registrar entrega** no Dashboard.
- Adiciona atalhos no formulário para Entrega, iFood dinheiro, Salário, Barman e Extra.
- Adiciona feedback tátil suave em celulares compatíveis.
- Cria barra inferior móvel com quatro abas fixas: Início, Registrar, Histórico e Perfil.
- Mantém Rendimentos e demais opções no menu lateral acessado pelo botão superior direito.
- Coloca o logotipo RS no canto superior esquerdo do celular para abrir o Perfil.
- Adiciona filtros no Histórico por texto, mês e tipo de lançamento.
- Mostra categoria e semana de referência nos itens do Histórico.
- Inclui `data_referencia_semana` na exportação CSV.

## Regras preservadas

- Rendimento não entra no faturamento do trabalho.
- Existe no máximo uma base real por dia.
- Atualizar a base do mesmo dia não soma movimentos duas vezes.
- Futuro e Giro continuam com rendimentos separados.
- Os dez pontos automáticos de recuperação continuam ativos.
- Dados v13.06 e backups anteriores migram automaticamente.

## Publicação

Para o endereço atual do app, publique os arquivos extraídos no mesmo site da Netlify. Consulte `COMO_PUBLICAR_NETLIFY.md`.
