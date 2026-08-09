---
tipo: sistema
tags: [sistema, guia]
---

# Guia de Uso

## O que é isto

Uma pasta de arquivos de texto no seu Mac. O Obsidian é só a janela por onde você olha para ela.

Isso importa por um motivo prático: **nada aqui depende de uma empresa continuar existindo.** Se o Obsidian sumir amanhã, seus arquivos continuam abrindo em qualquer editor de texto. Se o Gemini sumir, os prompts viram texto e você faz na mão. Foi essa a razão de escolher Markdown e não Notion.

## Primeiros 3 dias — faça só isto

Não tente usar tudo de uma vez. O sistema é grande de propósito, mas você só precisa de três hábitos para ele começar a valer:

1. **Abra [[Hoje]] de manhã.** Só olhar já basta.
2. **Capture qualquer coisa com ⌘⇧N.** Não pense onde vai. O Inbox existe justamente para você não pensar.
3. **Duas linhas na nota do dia à noite.** O que andou, o que travou.

Os painéis vão estar vazios no começo. Isso é normal — eles se enchem sozinhos conforme você usa.

## Rotina

### Todo dia (5 minutos, somados)

| Quando | O quê |
|---|---|
| Manhã | Abrir [[Hoje]]. Escolher **um** foco |
| Durante | Capturar com ⌘⇧N. Nada de organizar agora |
| Noite | Nota do dia: "Andou / Travou" |

### Toda semana (20 minutos)

Abra a nota semanal (⌘P → *Periodic Notes: Open weekly note*). Ela tem cinco passos numerados:

1. Esvaziar o Inbox
2. Classificar entregas sem meta
3. Conferir o que a IA sugeriu
4. Decidir sobre o que está parado há 3 semanas
5. Balanço e foco da semana seguinte

**Este é o único ritual obrigatório.** Se você fizer só ele e mais nada, o sistema se mantém vivo. Se pular ele por um mês, vira um depósito.

### A cada 3 meses (1 hora)

Nova nota em `01-Trabalho/PDI/Ciclos/`. O template traz o roteiro. É onde você vê se o dia a dia empurrou as metas ou só passou.

## Onde as coisas moram

| Você quer... | Vá em |
|---|---|
| Jogar uma ideia sem pensar | ⌘⇧N → cai no `00-Inbox` |
| Registrar algo que entregou | ⌘P → *📦 Registrar entrega* |
| Ver seu PDI | [[PDI]] |
| Salvar uma referência visual | ⌘P → *🎨 Nova referência* |
| Montar um moodboard | Botão direito em `Referencias/Visual` → *New canvas* |
| Anotar uma reunião | ⌘P → *🗣️ Nova reunião* |
| Ver tarefas do dia | [[Hoje]] |
| Planejar a semana | [[Semana]] |
| Conversar com a IA | Ícone do Copilot na lateral direita |

## Pomodoro

Ícone do tomate na barra lateral. Clique numa tarefa e inicie — o tempo é registrado sozinho na nota do dia, no formato `🍅 14:20 → 14:45 (25min) nome da tarefa`.

O painel [[Semana]] soma os tomates por dia. Não use esse número para se cobrar; use para perceber padrão (que dia rende, que semana afundou).

## Sintaxe de tarefas

Tarefa é qualquer linha começando com `- [ ]`, em qualquer nota.

```markdown
- [ ] Finalizar a apresentação 📅 2026-08-15 ⏫
  - [ ] Escolher as imagens
  - [ ] Revisar os textos
```

| Símbolo | O que é | Como digitar |
|---|---|---|
| `📅 2026-08-15` | Prazo | Digite `📅` ou use o autocompletar |
| `⏫` | Prioridade alta | |
| `🔁 every week` | Recorrente | |

Não precisa decorar: comece a escrever a tarefa e o autocompletar do plugin Tasks oferece as opções.

## Duas regras que sustentam tudo

**1. Capture bruto, organize depois.**
Se capturar exigir decidir onde salvar, você vai parar de capturar. O Inbox aceita qualquer coisa mal escrita. A revisão semanal é onde a organização acontece.

**2. Linke quando pensar.**
Mencionou um projeto no meio de uma nota? Transforme em `[[link]]` ali. É o acúmulo desses links que faz a diferença entre uma pasta e um cérebro — e não dá para fazer isso retroativamente.

## O que ignorar por enquanto

Estas peças existem e vão ser úteis, mas não tente usá-las no primeiro mês: Excalidraw, mapas mentais automáticos, Full Calendar, quadro Kanban. Elas estarão lá quando você sentir falta.

## Se você abandonar por duas semanas

Vai acontecer em algum momento. Quando voltar:

1. Não tente colocar em dia. Não leia o Inbox acumulado.
2. Apague o que estiver no Inbox com mais de 15 dias sem olhar. Se fosse importante, você teria lembrado.
3. Abra [[Hoje]] e siga a partir de hoje.

Sistema de notas morre de culpa acumulada, não de falta de recurso.

---

## Referência rápida

- [[Taxonomia]] — o contrato de dados (tipos, tags, status)
- [[Camada de IA]] — chave do Gemini, prompts, troca de provedor
- [[Celular e Captura]] — Syncthing, Android, atalhos
- [[Manutencao]] — quando algo quebra
- [[Como montar o PDI]] — quando entrar na empresa
