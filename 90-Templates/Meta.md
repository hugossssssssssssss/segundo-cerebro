---
tipo: meta
criado: <% tp.date.now("YYYY-MM-DD") %>
horizonte: 
prazo: 
area: trabalho
status: a-fazer
indicador: 
tags: [pdi, meta]
---

# <% tp.file.title %>

## O que eu quero alcançar
<!-- Em uma frase, no seu idioma, sem jargão corporativo. -->


## Por que isso importa
<!-- Para sua carreira, não para a empresa. Se você não souber responder, a meta não é sua. -->


## Como vou saber que cheguei lá
<!-- O `indicador` do frontmatter em versão longa. Precisa ser algo observável:
     "receber um projeto de branding completo sozinho" é observável.
     "melhorar em branding" não é. -->


## Como pretendo chegar
- [ ] 
- [ ] 


## Entregas que alimentam esta meta

```dataview
TABLE WITHOUT ID
  file.link AS "Entrega",
  data AS "Data",
  choice(contains(tags, "ia-sugeriu"), "🤖 conferir", "✓") AS ""
FROM "01-Trabalho/Entregas"
WHERE contains(metas, this.file.link)
SORT data DESC
```

## Notas relacionadas

```dataview
LIST
FROM [[]]
WHERE tipo != "entrega"
```
