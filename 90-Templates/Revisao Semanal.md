---
tipo: diaria
data: <% tp.date.now("YYYY-MM-DD") %>
tags: [revisao, semanal]
---

# Revisão da semana <% tp.date.now("gggg-[S]ww") %>

> 20 minutos, uma vez por semana. É o único ritual que o sistema realmente precisa.

## 1. Esvaziar o Inbox

```dataview
LIST
FROM "00-Inbox"
SORT file.ctime ASC
```

Para cada item: vira tarefa, vira nota em algum lugar, ou é apagado. **Não deixe nada aqui.**
Se estiverem muitos, rode o prompt *Triagem do Inbox* no chat.

## 2. Entregas sem meta atribuída

```dataview
TABLE data AS "Data"
FROM "01-Trabalho/Entregas"
WHERE !metas OR length(metas) = 0
SORT data DESC
```

Se tiver alguma, rode o prompt *Classificar entregas* no chat e aprove as sugestões.

## 3. Conferir o que a IA sugeriu

```dataview
TABLE tipo, data
FROM #ia-sugeriu
SORT file.mtime DESC
```

Confira e remova a tag `#ia-sugeriu` do que estiver certo.

## 4. Coisas paradas

```dataview
TABLE status, file.mtime AS "Último toque"
FROM "01-Trabalho" OR "02-Pessoal"
WHERE (tipo = "projeto" OR tipo = "meta") AND status != "concluido" AND status != "cancelado"
  AND file.mtime <= date(today) - dur(21 days)
SORT file.mtime ASC
```

Para cada um: retomar, pausar oficialmente (`status: pausado`), ou cancelar. **Deixar como está não é opção** — é assim que o sistema apodrece.

## 5. Balanço

**O que funcionou:**

**O que travou:**

**Foco da semana que vem:**
