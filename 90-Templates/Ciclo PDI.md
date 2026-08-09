---
tipo: ciclo
criado: <% tp.date.now("YYYY-MM-DD") %>
horizonte: 
area: trabalho
status: em-andamento
tags: [pdi, ciclo]
---

# <% tp.file.title %>

> Revisão trimestral do PDI. Uma hora, quatro vezes por ano.
> É aqui que você percebe se o dia a dia está mesmo empurrando as metas ou só passando.

## Onde cada meta chegou

```dataview
TABLE
  status AS "Status",
  indicador AS "Indicador",
  length(filter(file.inlinks, (x) => x.tipo = "entrega")) AS "Entregas"
FROM "01-Trabalho/PDI/Metas"
SORT status ASC
```

## Tudo que entreguei no período

```dataview
TABLE data AS "Data", metas AS "Alimenta"
FROM "01-Trabalho/Entregas"
WHERE data >= date(AAAA-MM-DD) AND data <= date(AAAA-MM-DD)
SORT data DESC
```
<!-- Troque as duas datas acima pelo início e fim do trimestre. -->

## Avaliação

**Meta que mais andou:**

**Meta que não saiu do lugar — e o motivo honesto:**

**Alguma meta deixou de fazer sentido?**
<!-- Meta que perdeu sentido deve ser cancelada, não arrastada. Escreva por quê. -->

**O que peço para o próximo trimestre:**
<!-- Projeto, treinamento, exposição, mentoria. Leve isto para a conversa com seu gestor. -->

## Argumentos para a próxima conversa de carreira
<!-- Puxe daqui as evidências concretas. Este é o valor real de manter o PDI:
     chegar na conversa com fatos em vez de impressões. -->

