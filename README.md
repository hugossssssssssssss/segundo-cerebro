# Segundo Cérebro

Notas, tarefas, referências visuais e plano de carreira — num lugar só, sobre arquivos Markdown.

**→ https://hugossssssssssssss.github.io/segundo-cerebro/**

## O que é

Um site que edita arquivos `.md` guardados num repositório privado seu no GitHub. Sem servidor, sem banco de dados, sem mensalidade.

Cada coisa que você salva vira um arquivo de texto comum, com histórico completo. Isso significa três coisas na prática:

- **Você pode abrir tudo em qualquer editor de texto**, hoje ou daqui a dez anos, mesmo que este app deixe de existir
- **Qualquer IA lê seus arquivos** — Claude Code, Gemini CLI, Cursor — sem configuração nenhuma
- **Nada se perde**: apagou sem querer, recupera pelo histórico do git

## Como usar

1. Abra o link acima
2. Vá em **Ajustes** (engrenagem no topo)
3. Preencha sua conta do GitHub, o repositório de dados e um token
4. Clique em **Salvar e testar conexão**

Se algo der errado, o botão **Diagnóstico** testa cada etapa em ordem e mostra exatamente onde parou.

### O token

Em https://github.com/settings/personal-access-tokens/new:

- **Repository access:** apenas o repositório de dados
- **Permissions → Contents:** Read and write

Só isso. O token fica guardado no navegador deste aparelho e nunca sai daqui — se você abrir em outro aparelho, precisa colar de novo.

### No celular

Abra o link no Chrome do Android e use **⋮ → Adicionar à tela inicial**. Ele instala como aplicativo, com ícone próprio e sem barra de navegador.

## O que tem dentro

| Aba | |
|---|---|
| **Tarefas** | Lista e calendário, com prazo, tags, subtarefas e pomodoro que registra o tempo na própria tarefa |
| **Notas** | Editor de texto rico que grava Markdown, com `@menções` ligando um item a outro |
| **Refs** | Referências visuais com imagem, link e o campo "por que salvei" |
| **Carreira** | Metas e entregas, com as entregas alimentando as metas |
| **Conversar** | Chat com o Gemini: lê seus arquivos, responde, e cria ou edita itens com a sua aprovação |

Busque em tudo com **⌘K** e capture uma ideia em segundos com **⌘J**.

## Custo

R$ 0. GitHub grátis (repositórios e Pages) e a camada gratuita do Gemini.

## Para desenvolver

```bash
npm install
npm run dev      # http://localhost:5173
npm test
npm run build
```

Publica sozinho a cada push na `main`.

Se você for uma IA mexendo neste código, leia o [AGENTS.md](AGENTS.md) primeiro.
