---
copilot-command-context-menu-enabled: true
copilot-command-slash-enabled: true
copilot-command-context-menu-order: 10
copilot-command-model-key: ""
copilot-command-last-used: 0
---
Sua tarefa é ligar as entregas recentes do Hugo às metas do PDI dele.

**Passo 1** — Leia todas as metas em `01-Trabalho/PDI/Metas`. Para cada uma, entenda o campo `indicador`: é ele que define o que a meta realmente mede, não só o título.

**Passo 2** — Leia as entregas em `01-Trabalho/Entregas` cujo campo `metas` esteja vazio ou ausente.

**Passo 3** — Para cada entrega, proponha a quais metas ela pertence. Uma entrega pode alimentar mais de uma meta, ou nenhuma.

Responda em uma tabela com estas colunas:

| Entrega | Meta proposta | Por que | Confiança |
|---|---|---|---|

Na coluna **Por que**, cite o trecho concreto da entrega que sustenta a ligação — o que foi feito, não o título. Uma frase.

Na coluna **Confiança**, use `alta`, `média` ou `baixa`. Seja honesto: preferir "baixa" a forçar uma ligação fraca.

Depois da tabela, escreva o YAML pronto para cada entrega, assim:

```
NomeDoArquivo.md →
metas: ["[[Meta - Exemplo]]"]
tags: [entrega, ia-sugeriu]
```

Regras importantes:
- Se uma entrega não se encaixar em nenhuma meta, diga isso claramente em vez de forçar. Trabalho que não alimenta meta nenhuma é um sinal útil — pode indicar que falta uma meta, ou que o Hugo está gastando tempo com o que não desenvolve ele.
- Ao final, se você notar um padrão de entregas sem meta correspondente, aponte: "há N entregas sobre X e nenhuma meta cobre isso — talvez falte uma meta".
- Use exatamente os nomes de arquivo das metas, com `[[ ]]`.
- Não edite os arquivos. Apresente e deixe o Hugo aplicar.
