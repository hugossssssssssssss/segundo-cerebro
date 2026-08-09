---
tipo: sistema
tags: [pdi, painel]
---

# Plano de Desenvolvimento Individual

> As metas ainda não existem — você entra na empresa em breve. Esta página já está montada e vai se preencher sozinha conforme você criar as metas em `Metas/`.
> Como preencher: [[Como montar o PDI]].

## Visão geral

```dataview
TABLE WITHOUT ID
  file.link AS "Meta",
  status AS "Status",
  horizonte AS "Horizonte",
  length(filter(file.inlinks, (x) => x.tipo = "entrega")) AS "Entregas"
FROM "01-Trabalho/PDI/Metas"
WHERE tipo = "meta"
SORT status ASC, horizonte ASC
```

## Metas em andamento

```dataview
TABLE WITHOUT ID
  file.link AS "Meta",
  indicador AS "Como sei que cheguei lá",
  prazo AS "Prazo"
FROM "01-Trabalho/PDI/Metas"
WHERE tipo = "meta" AND status = "em-andamento"
SORT prazo ASC
```

## ⚠️ Metas sem movimento há mais de 30 dias

```dataview
TABLE WITHOUT ID
  file.link AS "Meta",
  file.mtime AS "Último toque"
FROM "01-Trabalho/PDI/Metas"
WHERE tipo = "meta"
  AND status != "concluido" AND status != "cancelado"
  AND file.mtime <= date(today) - dur(30 days)
SORT file.mtime ASC
```

Meta parada não é fracasso — mas precisa de decisão. Retomar, pausar oficialmente ou cancelar.

---

## Entregas ainda não classificadas

```dataview
TABLE WITHOUT ID
  file.link AS "Entrega",
  data AS "Data"
FROM "01-Trabalho/Entregas"
WHERE !metas OR length(metas) = 0
SORT data DESC
```

Se essa lista crescer, abra o chat e rode o prompt **Classificar entregas** — o Gemini liga cada uma à meta certa e você só aprova.

## Sugestões da IA aguardando conferência

```dataview
TABLE WITHOUT ID
  file.link AS "Nota",
  tipo AS "Tipo"
FROM #ia-sugeriu
SORT file.mtime DESC
```

## Todas as entregas

```dataview
TABLE WITHOUT ID
  file.link AS "Entrega",
  data AS "Data",
  choice(length(metas) > 0, join(metas, ", "), "—") AS "Alimenta"
FROM "01-Trabalho/Entregas"
SORT data DESC
LIMIT 30
```

---

## Ciclos de revisão

```dataview
LIST
FROM "01-Trabalho/PDI/Ciclos"
SORT criado DESC
```

A cada três meses, crie um ciclo novo em `Ciclos/` — o template abre sozinho e traz o roteiro.
