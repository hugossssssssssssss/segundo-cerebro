---
tipo: diaria
data: <% tp.date.now("YYYY-MM-DD") %>
tags: [diaria]
---

# <% tp.date.now("dddd, DD [de] MMMM [de] YYYY", 0, tp.file.title, "YYYY-MM-DD") %>

## Foco de hoje
<!-- Uma coisa. Se tudo der errado e só isso sair, o dia valeu. -->


## Tarefas de hoje

```dataview
TASK
FROM "01-Trabalho" OR "02-Pessoal" OR "00-Inbox"
WHERE !completed AND due <= date(<% tp.date.now("YYYY-MM-DD") %>)
SORT due ASC
```

## Anotações do dia


## Entregas registradas hoje

```dataview
LIST
FROM "01-Trabalho/Entregas"
WHERE data = date(<% tp.date.now("YYYY-MM-DD") %>)
```

## Fechamento
<!-- 2 linhas, à noite. O que andou e o que travou. É isto que alimenta a revisão semanal. -->

**Andou:** 
**Travou:** 
