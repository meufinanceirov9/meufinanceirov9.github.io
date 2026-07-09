# Financeiro CRM v13.05

Build: `2026-07-09-v13-05-rendimento-automatico-caixinhas`

Versão local estável baseada na v13.04, mantendo o visual aprovado da linha v13 e adicionando ajuda automática para rendimento das caixinhas.

## Melhorias da v13.05

- Mantém o frontend da v13 como padrão visual cravado.
- Mantém máscara monetária padronizada da v13.01.
- Mantém cache/ícone versionado da v13.04.
- Adiciona cálculo assistido de rendimento por diferença diária:
  - compara a base de patrimônio atual com a base anterior;
  - desconta movimentos lançados entre as bases;
  - sugere rendimento provável para Caixinha Futuro e Caixinha Giro;
  - evita tratar uma entrada lançada, como entregas no Giro, como rendimento.
- O formulário de patrimônio completo passa a mostrar uma caixa de “Ajuda do rendimento”.
- Ao registrar nova base, os campos de rendimento Futuro/Giro são preenchidos com a sugestão quando houver diferença provável de CDI.
- O Dashboard mostra “Provável rendimento” na auditoria entre bases.
- Adiciona ação para aplicar o rendimento provável na última base caso ela ainda esteja sem rendimento informado.
- Evita duplicar bases no mesmo dia: ao salvar uma nova base para uma data que já existe, o app atualiza a base daquele dia.
- Ferramenta “Atualizar app e limpar cache” fica oculta no modo usuário e aparece apenas no modo desenvolvedor.

## Regra importante

Rendimento aumenta patrimônio, mas não entra como faturamento de trabalho. Entradas lançadas em Giro/Futuro são descontadas antes do cálculo de rendimento sugerido.

Exemplo testado:

- Futuro: R$ 14.362,91 → R$ 14.370,45 = R$ 7,54 sugerido como rendimento.
- Giro: R$ 529,47 → R$ 574,73 com entrada lançada de R$ 45,00 = apenas R$ 0,26 sugerido como rendimento.
- Total sugerido: R$ 7,80, sem confundir os R$ 45,00 de entregas com CDI.

## Publicação

Suba todos os arquivos desta pasta na raiz do GitHub Pages. Depois acesse:

`https://SEU_USUARIO.github.io/?v=1305`
