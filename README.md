# Klaus

Notas, tarefas, referências visuais e plano de carreira — num lugar só, sobre arquivos Markdown.

**→ https://hugossssssssssssss.github.io/segundo-cerebro/**

## O que é

Um site que edita arquivos `.md` guardados num repositório privado seu no GitHub. Sem servidor, sem banco de dados, sem mensalidade.

Cada coisa que você salva vira um arquivo de texto comum, com histórico completo. Isso significa três coisas na prática:

- **Você pode abrir tudo em qualquer editor de texto**, hoje ou daqui a dez anos, mesmo que este app deixe de existir
- **Qualquer IA lê seus arquivos** — Claude Code, Gemini CLI, Cursor — sem configuração nenhuma
- **Nada se perde**: apagou sem querer, recupera pelo histórico do git

## Como começar

Abra o link acima. Na primeira visita o app abre um **passo a passo** que conduz a configuração inteira — é só seguir. Leva uns três minutos e é feito uma vez por aparelho.

Se preferir fazer na mão, ou se precisar refazer depois, tudo está em **Ajustes**:

1. **Crie um repositório privado** na sua conta do GitHub — [github.com/new](https://github.com/new?name=segundo-cerebro-dados). Nome sugerido: `segundo-cerebro-dados`. Deixe vazio e **marque Private**.
2. **Crie um token** (detalhes abaixo).
3. Em **Ajustes**, preencha sua conta, o nome do repositório e o token.
4. Clique em **Salvar e testar conexão**.

Se algo der errado, o botão **Diagnóstico** testa cada etapa em ordem e mostra exatamente onde parou.

### O token

Em https://github.com/settings/personal-access-tokens/new, crie um token **fine-grained** com o mínimo possível:

- **Repository access:** Only select repositories → apenas o repositório de dados
- **Permissions → Repository permissions → Contents:** Read and write

Só isso. Nenhuma outra permissão é necessária.

**Sobre onde ele fica guardado — sendo honesto:** o token fica no `localStorage` deste navegador, embaralhado para não aparecer em texto legível. Isso **não é criptografia**: quem tiver acesso ao aparelho, ou conseguir executar JavaScript nesta página, consegue lê-lo. É exatamente por isso que o escopo importa. Um token restrito a um repositório só, se vazar, é revogado num clique em https://github.com/settings/tokens e nada mais da sua conta foi exposto.

Na prática:

- Não use em computador público ou compartilhado
- Nunca dê ao token acesso a "All repositories"
- Se desconfiar de alguma coisa, revogue e gere outro — não custa nada

O token nunca sai do seu navegador a não ser para falar com a API do GitHub. Se você abrir o site em outro aparelho, precisa colar de novo.

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

## Compartilhar com outra pessoa

O site é público e não tem servidor: cada pessoa traz o próprio token e aponta para o próprio repositório. Dá para usar de três jeitos, todos sem custo.

### Cada um com o seu segundo cérebro

Mande o link. A pessoa cria um repositório privado dela, gera um token dela, e configura pelo passo a passo. Os dados de vocês não se encostam. Não há limite de quantas pessoas podem fazer isso — o GitHub gratuito dá repositórios privados ilimitados.

### Duas pessoas no mesmo acervo

Para dividir as mesmas notas e tarefas:

1. No repositório **de dados**, vá em Settings → Collaborators → Add people
2. A pessoa aceita o convite e gera um token **dela** com acesso a esse repositório
3. Nos Ajustes dela, `Sua conta` recebe o **dono do repositório** (você), não o usuário dela

Colaboradores em repositório privado são ilimitados no plano gratuito.

**A limitação que importa:** não existe merge. Se duas pessoas editarem o mesmo arquivo ao mesmo tempo, a segunda gravação é recusada pelo GitHub por conflito de versão e o app avisa. Funciona bem quando cada um cuida das suas coisas; não é feito para edição simultânea do mesmo item.

### Sua própria cópia do app

Faça um fork deste repositório, ative Pages em Settings → Pages → Source: GitHub Actions, e ajuste `base` no `vite.config.ts` para o nome do seu fork. O deploy é automático a cada push na `main`.

## Custo

R$ 0. GitHub grátis (repositórios, Actions e Pages) e a camada gratuita do Gemini.

## Para desenvolver

```bash
npm install
npm run dev      # http://localhost:5173
npm test
npm run build
```

Publica sozinho a cada push na `main`.

Se você for uma IA mexendo neste código, leia o [AGENTS.md](AGENTS.md) primeiro.
