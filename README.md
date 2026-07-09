# Financeiro CRM v13.04

Build: `2026-07-09-v13-04-backup-auditoria-cache-icone`

Base visual preservada da linha v13. Esta versão mantém o modo local estável e melhora conferência, cache e favicon.

## Melhorias da v13.04

- Mantém o visual aprovado da v13 como identidade fixa.
- Mantém a máscara monetária padronizada da v13.01.
- Mantém o ícone visual da v13.02/v13.03, agora com nomes únicos de arquivo para driblar cache agressivo do navegador.
- Adiciona botão em **Perfil > Atualização > Atualizar app e limpar cache**.
- Service worker agora usa **network-first para navegação/HTML**, reduzindo chance de ficar preso em tela ou ícone antigo.
- Dashboard ganhou card de **Conferência / Patrimônio auditado** quando houver diferença entre as duas últimas bases ou movimentos posteriores à base atual.
- A auditoria mostra variação entre bases, parte explicada por movimentos e parte sem classificação.
- O resumo mensal passa a considerar também rendimentos preenchidos nos campos de rendimento da base de patrimônio.
- Testes ampliados para auditoria de variação entre patrimônios e rendimento informado em base.

## Sobre o backup analisado

No backup de 09/07/2026 v13.03, a estrutura está válida. A diferença de R$ 7,80 entre os patrimônios de 08/07 e 09/07 aparece como sem classificação, causada por aumento de R$ 7,54 na Caixinha Futuro e R$ 0,26 na Caixinha Giro. Isso parece rendimento/variação de base, mas não foi registrado nos campos de rendimento. A v13.04 passa a avisar isso no Dashboard.

## Publicação

Suba todos os arquivos da pasta para a raiz do GitHub Pages. Depois de publicar, abra:

`https://SEU_USUARIO.github.io/?v=1304`

Se o navegador continuar mostrando ícone antigo, vá em Perfil e use **Atualizar app e limpar cache**.
