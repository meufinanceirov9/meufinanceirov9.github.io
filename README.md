# Financeiro CRM v12.07 — atualização confiável e layout polido

Melhorias desta versão:

- Adicionado `service-worker.js` real para o PWA atualizar melhor no GitHub Pages.
- Adicionado `version.json` para o app detectar novas versões.
- Adicionado `manifest.webmanifest` real com start_url `./?v=1207`.
- Ícones com cache-bust `?v=1207` para evitar o quadrado vazio no topo e no iPhone.
- Botão **Carregar atualização** agora limpa cache do app antes de recarregar.
- Pequenos polimentos de layout, contraste, chips de versão e modo.
- Mantém o fluxo público: abre direto no Dashboard; conta fica no Perfil.

## Publicar no GitHub Pages

Envie **todos os arquivos da pasta extraída** diretamente na raiz do repositório `meufinanceirov9.github.io` e faça commit.

Depois teste por:

```text
https://meufinanceirov9.github.io/?v=1207
```

Quando o cache atualizar, o link normal também deve abrir certo:

```text
https://meufinanceirov9.github.io/
```
