---
tipo: pessoa
criado: <% tp.date.now("YYYY-MM-DD") %>
area: trabalho
cargo: 
time: 
tags: [pessoa]
---

# <% tp.file.title %>

**Cargo:** 
**Time:** 

## Contexto
<!-- Como se relaciona com o seu trabalho. -->


## Como trabalhar bem com essa pessoa
<!-- Prefere mensagem ou call? Gosta de detalhe ou de resumo? Que tipo de argumento convence?
     Isto não é cálculo, é consideração — e economiza muito atrito. -->


## Histórico
<!-- Conversas importantes, com data. -->


## Reuniões

```dataview
LIST
FROM "01-Trabalho/Reunioes"
WHERE contains(participantes, this.file.name) OR contains(file.outlinks, this.file.link)
SORT data DESC
```
