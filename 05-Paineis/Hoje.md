---
tipo: sistema
tags: [painel]
---

# Hoje

> Abra isto de manhã. Se você só olhar uma página no vault por dia, é esta.

## 🔥 Atrasado

```tasks
not done
due before today
sort by due
limit 10
hide task count
```

## 📅 Para hoje

```tasks
not done
due today
sort by priority
hide task count
```

## ⏳ Em andamento

```tasks
status.type is IN_PROGRESS
sort by due
hide task count
```

## 👉 Próximos 7 dias

```tasks
not done
due after today
due before in 8 days
sort by due
limit 15
hide task count
```

---

## 📥 Inbox por triar

```dataview
LIST
FROM "00-Inbox"
SORT file.mtime DESC
LIMIT 8
```

## 🎯 Projetos ativos

```dataview
TABLE WITHOUT ID
  file.link AS "Projeto",
  area AS "Área",
  prazo AS "Prazo"
FROM "01-Trabalho/Projetos" OR "02-Pessoal/Projetos"
WHERE status = "em-andamento"
SORT prazo ASC
```

## ⚠️ Sem próximo passo definido

```dataview
LIST
FROM "01-Trabalho/Projetos" OR "02-Pessoal/Projetos"
WHERE status = "em-andamento" AND !contains(file.tasks.text, "")
```

---

## Atalhos

| | |
|---|---|
| [[PDI]] | Suas metas e progresso |
| [[Semana]] | Painel da semana |
| [[Referencias]] | Sua biblioteca visual |
| [[Guia de Uso]] | Como usar isto tudo |
