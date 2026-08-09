---
tipo: sistema
tags: [painel, visual]
---

# Referências

> Sua biblioteca visual. O valor dela não está em acumular — está no campo **"por que salvei"**.
> Uma referência sem esse campo é um print perdido numa pasta. Com ele, é um princípio que você pode aplicar.

## Adicionadas recentemente

```dataview
TABLE WITHOUT ID
  file.link AS "Referência",
  join(categoria, ", ") AS "Categoria",
  criado AS "Salvo em"
FROM "02-Pessoal/Referencias"
WHERE tipo = "referencia" AND contains(tags, "visual")
SORT criado DESC
LIMIT 20
```

## Por categoria

```dataview
TABLE WITHOUT ID
  join(rows.file.link, ", ") AS "Referências"
FROM "02-Pessoal/Referencias"
WHERE tipo = "referencia"
FLATTEN categoria
GROUP BY categoria
SORT length(rows) DESC
```

## Ferramentas

```dataview
TABLE WITHOUT ID
  file.link AS "Ferramenta",
  status AS "Situação",
  preco AS "Preço"
FROM "02-Pessoal/Referencias/Ferramentas"
SORT status ASC
```

## Sem o "por que salvei" preenchido

```dataview
LIST
FROM "02-Pessoal/Referencias"
WHERE tipo = "referencia" AND file.size < 400
SORT criado DESC
```

Essas ficaram pela metade. Vale voltar e escrever duas linhas — ou apagar.

---

## Moodboards

Os moodboards são arquivos **Canvas** (`.canvas`), não notas. Ficam em `Visual/`.
Para criar um: menu de contexto na pasta → *New canvas*. Depois é só arrastar imagens de qualquer lugar para dentro.

- [[Moodboard - Exemplo.canvas|Moodboard de exemplo]] — abra para ver como funciona

## Mapas mentais

Três formas, cada uma para um momento:

| Ferramenta | Quando usar |
|---|---|
| **Canvas** | Montar visualmente, arrastando notas e imagens. Livre |
| **Excalidraw** | Desenhar à mão. Quando a forma importa |
| **Mind Map** | Gerar automático a partir dos títulos de uma nota que você já escreveu. Zero trabalho |

Para o Mind Map: abra qualquer nota com títulos (`#`, `##`) e rode o comando *Mind Map: Preview*.
