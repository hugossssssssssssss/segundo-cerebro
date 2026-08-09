---
tipo: sistema
tags: [sistema, referencia]
---

# Taxonomia do Segundo Cérebro

Este é o contrato de dados do vault. Tudo aqui existe por um motivo: **é o que permite que os painéis se montem sozinhos e que a IA entenda o que está olhando.**

Se você mudar alguma coisa aqui, os painéis param de funcionar até serem ajustados. Mudar é permitido — só faça sabendo disso.

> Este arquivo é lido pela IA. Quando você pedir para o Gemini organizar ou classificar algo, ele consulta esta página para saber as regras. Manter isto atualizado é o que mantém a IA precisa.

---

## A regra de ouro

**Escreva livre. A estrutura é opcional na hora da escrita e obrigatória só na hora de aparecer num painel.**

Se você não preencher o frontmatter, a nota continua existindo, continua sendo encontrada na busca e continua legível. Ela só não aparece nos dashboards. Nada quebra. Isso é proposital — atrito na captura mata o sistema.

---

## Campo `tipo` — o mais importante

Um único valor por nota. É o que os painéis usam para filtrar.

| `tipo` | O que é | Onde mora |
|---|---|---|
| `nota` | Anotação livre, sem categoria definida | Qualquer lugar |
| `tarefa` | Algo a fazer que é grande o bastante para ter nota própria | `01-Trabalho/` ou `02-Pessoal/` |
| `projeto` | Conjunto de tarefas com começo e fim | `*/Projetos/` |
| `entrega` | Algo que você **concluiu** e quer registrar como evidência | `01-Trabalho/Entregas/` |
| `meta` | Objetivo do PDI | `01-Trabalho/PDI/Metas/` |
| `ciclo` | Revisão trimestral do PDI | `01-Trabalho/PDI/Ciclos/` |
| `reuniao` | Registro de reunião (transcrição, decisões, próximos passos) | `01-Trabalho/Reunioes/` |
| `referencia` | Inspiração visual, ferramenta, link salvo | `02-Pessoal/Referencias/` |
| `conhecimento` | Algo que você aprendeu e quer lembrar. Atemporal | `03-Conhecimento/` |
| `pessoa` | Alguém do trabalho: contexto, histórico, preferências | `01-Trabalho/Empresa/` |
| `diaria` | Nota do dia | `04-Diario/` |
| `sistema` | Documentação do próprio vault | `99-Sistema/` |

---

## Campo `status`

Só faz sentido em `tarefa`, `projeto`, `meta` e `ciclo`.

| `status` | Significado |
|---|---|
| `ideia` | Ainda não decidiu se vai fazer |
| `a-fazer` | Decidido, não começou |
| `em-andamento` | Trabalhando nisso agora |
| `pausado` | Começou e parou. **Se algo fica aqui 30 dias, o painel te cobra** |
| `concluido` | Terminou |
| `cancelado` | Decidiu não fazer. Mantenha a nota — a decisão de não fazer também é informação |

Sempre sem acento e no masculino singular (`concluido`, nunca `Concluída`). Isso não é firula: o Dataview compara texto exato, e `Concluída` ≠ `concluido` para ele.

---

## Campo `area`

Dois valores apenas: `trabalho` ou `pessoal`.

É o que permite separar os painéis sem separar os arquivos — você continua podendo linkar uma coisa na outra livremente.

---

## Campo `metas` (só em `entrega`)

Lista de links para as metas do PDI que aquela entrega alimenta.

```yaml
metas: ["[[Meta - Exemplo]]"]
```

Pode ficar vazio (`metas: []`). O prompt *Classificar entregas* preenche depois. Uma entrega pode alimentar mais de uma meta.

---

## Tags

As tags são **transversais** — cruzam o `tipo` e a `area`. Use quantas quiser, mas prefira reaproveitar as existentes a inventar sinônimos (`#design` e `#designer` viram duas coisas diferentes para a máquina).

### Tags de área de conhecimento
`#design` `#tipografia` `#branding` `#editorial` `#motion` `#ux` `#ilustracao` `#fotografia`

### Tags de contexto
`#cliente` `#processo` `#ferramenta` `#carreira` `#lideranca` `#feedback`

### Tags operacionais (têm efeito nos painéis)
| Tag | Efeito |
|---|---|
| `#inbox` | Ainda não triado. Aparece no painel de triagem |
| `#revisar` | Precisa de uma segunda passada sua |
| `#ia-sugeriu` | Campo preenchido pela IA, ainda não conferido por você |
| `#importante` | Fixa no topo dos painéis |

A tag `#ia-sugeriu` é a sua rede de segurança: tudo que o Gemini preencher sozinho fica marcado até você aprovar. Nunca deixe a IA escrever no seu vault sem deixar rastro.

---

## Datas

Sempre no formato `AAAA-MM-DD` (`2026-08-09`). Sem exceção — é o único formato que o Dataview ordena corretamente.

| Campo | Onde |
|---|---|
| `data` | Quando aconteceu (entrega, reunião, diária) |
| `criado` | Quando a nota nasceu (o template preenche) |
| `prazo` | Quando vence (tarefa, projeto, meta) |

---

## Nomes de arquivo

- Sem acentos e sem caracteres especiais (`/ \ : * ? " < > |`). Acento em nome de arquivo quebra sync entre sistemas diferentes.
- Metas começam com `Meta - `. Reuniões e entregas começam com a data: `2026-08-09 - Assunto`.
- Espaços são permitidos e ficam mais legíveis que hífens no meio do nome.

---

## Links `[[assim]]`

Ligar duas notas é o que transforma pastas em cérebro. Duas regras práticas:

1. **Linke na hora que pensar, não depois.** Se você mencionar um projeto no meio de uma nota, transforme em `[[link]]` ali mesmo.
2. **Link para nota que não existe é bom.** O Obsidian mostra em cinza e cria quando você clicar. É um marcador de "isso merece uma nota um dia".

Isso vale entre `/Trabalho` e `/Pessoal` também — é exatamente onde as conexões mais interessantes aparecem.

---

## Anexos

Toda imagem e arquivo vai para `_Anexos/`, automaticamente. Você só cola (Cmd+V) e o Obsidian resolve.

**As imagens não vão para o celular** (`.stignore` do Syncthing as exclui). No Android você verá o texto e um link quebrado no lugar da imagem. Isso é intencional: mantém o sync leve e gratuito. Elas continuam salvas e versionadas no git.
