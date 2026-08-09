---
tipo: sistema
tags: [painel]
---

# Semana

## Entregas dos últimos 7 dias

```dataview
TABLE WITHOUT ID
  file.link AS "Entrega",
  data AS "Data",
  choice(length(metas) > 0, join(metas, ", "), "⚠️ sem meta") AS "Alimenta a meta"
FROM "01-Trabalho/Entregas"
WHERE data >= date(today) - dur(7 days)
SORT data DESC
```

## Concluído nos últimos 7 dias

```tasks
done after 7 days ago
sort by done reverse
hide task count
```

## Tempo focado
<!-- O Pomodoro registra os ciclos nas notas diárias. -->

```dataview
TABLE WITHOUT ID
  file.link AS "Dia",
  length(filter(file.lists.text, (t) => contains(t, "🍅"))) AS "🍅"
FROM "04-Diario"
WHERE tipo = "diaria" AND data >= date(today) - dur(7 days)
SORT data DESC
```

## Reuniões da semana

```dataview
LIST
FROM "01-Trabalho/Reunioes"
WHERE data >= date(today) - dur(7 days)
SORT data DESC
```

## Capturado e ainda não triado

```dataview
LIST
FROM "00-Inbox"
SORT file.ctime ASC
```

---

Pronto para a revisão completa? Abra a **nota semanal** (Periodic Notes → Open weekly note) — ela tem o roteiro dos 5 passos.
