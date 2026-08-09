---
tipo: sistema
tags: [painel]
---

# Segundo Cérebro

> Se você não sabe por onde começar, comece pelo [[Guia de Uso]].

## Ir para

| | |
|---|---|
| **[[Hoje]]** | O painel do dia. Abra este de manhã |
| **[[Semana]]** | Balanço e planejamento |
| **[[PDI]]** | Metas e progresso na empresa |
| **[[Referencias]]** | Biblioteca visual |
| **[[Quadro de Projetos]]** | Kanban |

## Capturar agora

`⌘⇧N` — jogue qualquer coisa no Inbox sem pensar onde vai.

## Estado atual

```dataview
TABLE WITHOUT ID
  "📥 Inbox" AS "",
  length(rows) AS "itens"
FROM "00-Inbox"
GROUP BY true
```

```dataview
TABLE WITHOUT ID
  tipo AS "Tipo",
  length(rows) AS "Notas"
FROM "01-Trabalho" OR "02-Pessoal" OR "03-Conhecimento" OR "04-Diario"
WHERE tipo
GROUP BY tipo
SORT length(rows) DESC
```

## Tocado recentemente

```dataview
LIST
FROM "01-Trabalho" OR "02-Pessoal" OR "03-Conhecimento"
SORT file.mtime DESC
LIMIT 10
```

---

## Documentação do sistema

- [[Guia de Uso]] — como usar no dia a dia
- [[Taxonomia]] — o contrato de dados
- [[Camada de IA]] — Gemini, prompts, troca de provedor
- [[Celular e Captura]] — Syncthing e Android
- [[Manutencao]] — quando algo quebra
- [[Como montar o PDI]] — para quando você entrar na empresa
