# Instruções para agentes de IA

App web do "segundo cérebro" do Hugo, designer gráfico brasileiro.
**Responda sempre em português do Brasil e explique sem jargão técnico** — ele não é desenvolvedor.

## A ideia em uma frase

Um site estático que edita arquivos Markdown num repositório privado do GitHub. **Não existe backend.** O navegador fala direto com `api.github.com` e com a API do Gemini.

```
Navegador (Mac ou Android)
      │
      │ GitHub Contents API — cada gravação vira um commit
      ▼
hugossssssssssssss/segundo-cerebro-dados  (privado)
├── notas/*.md
├── tarefas/*.md
├── pdi/metas/*.md
├── pdi/entregas/*.md
└── referencias/*.md  +  referencias/imagens/
```

Publicado em https://hugossssssssssssss.github.io/segundo-cerebro/ pelo workflow `.github/workflows/deploy.yml`, a cada push na `main`.

## Regras que não podem ser quebradas

1. **Os arquivos `.md` são a fonte da verdade.** Não introduza banco de dados, cache derivado nem índice. Se você criar um, ele vai divergir no dia em que o Hugo editar um arquivo direto pelo GitHub — e ele faz isso.
2. **Frontmatter é opcional.** Um `.md` sem frontmatter tem que continuar abrindo e sendo editado. Ver `lerMarkdown` em `src/lib/markdown.ts`: quando o YAML está quebrado, ela devolve o texto inteiro como corpo em vez de estourar erro. Perder campos é chato; perder o texto do usuário é inaceitável.
3. **Nunca coloque segredo no código.** Token do GitHub e chave do Gemini vivem no `localStorage`, configurados pela tela de Ajustes. Este repositório é **público**.
4. **Não adicione backend.** É o que mantém o custo em R$ 0 e o que o Hugo consegue manter sozinho.
5. **Tudo que a IA preencher fica marcado** com `ia_sugeriu: true` no frontmatter, até o Hugo conferir. Sem essa marca ele deixa de confiar no próprio material.

## Mapa do código

| Arquivo | Responsabilidade |
|---|---|
| `src/lib/github.ts` | **Única** porta de entrada e saída de dados. Listar, ler, gravar, apagar, montar contexto para a IA e o diagnóstico de conexão |
| `src/lib/markdown.ts` | Frontmatter YAML tolerante a falha, nomes de arquivo seguros |
| `src/lib/settings.ts` | Config no localStorage; limpa espaço e caracteres invisíveis do copiar-e-colar |
| `src/lib/tarefas.ts` | Status, prazo, urgência, ordenação, registro de pomodoro |
| `src/lib/pdi.ts` | Metas, entregas e a agregação entre elas |
| `src/lib/referencias.ts` | Referências visuais e upload de imagem |
| `src/lib/gemini.ts` | Chamada ao Gemini e os prompts salvos |
| `src/components/ui.tsx` | Componentes visuais base, todos num arquivo só |
| `src/pages/*.tsx` | Uma tela por área |

## Padrão de uma tela

Todas seguem a mesma forma. Copie a mais parecida em vez de inventar outra:

```tsx
const cfg = lerConfig();
const pronto = configCompleta(cfg);        // sem token → tela pedindo Ajustes

const carregar = useCallback(async () => {
  const arquivos = await listar(cfg, PASTA);
  // ler cada um, converter com comoX(lerMarkdown(texto), ...)
}, [pronto, cfg.repoOwner, cfg.repoName, cfg.githubToken, cfg.branch]);

// gravar: escreverMarkdown({ dados: xParaFrontmatter(x), corpo }) → gravar(...)
// sempre recarregar depois de gravar
```

## Armadilhas já encontradas (não repita)

- **`js-yaml` v5 não tem export default.** Use `import { load, dump }`.
- **O tsconfig do build é `tsconfig.app.json`**, não o `tsconfig.json` da raiz. O alias `@/` precisa estar nos dois lugares: lá e no `vite.config.ts`.
- **`erasableSyntaxOnly` está ligado**: nada de parameter properties (`constructor(private x)`).
- **A pasta do projeto tem espaço e acento no nome.** Use `fileURLToPath`, nunca `.pathname` (que devolve `%20`).
- **Token com quebra de linha derruba tudo** com um "Failed to fetch" que não explica nada. Por isso `limpar()` em `settings.ts`.
- **URL malformada (`/repos//nome`) também dá "Failed to fetch"**: o preflight de CORS volta sem os cabeçalhos e o navegador aborta. Valide campo vazio antes de montar URL.
- **Imagem de repositório privado não carrega em `<img src>`.** Busque com o token e vire `blob:` (ver `Referencias.tsx`).
- **Limite de 5 MB por arquivo** na API do GitHub.

## Antes de entregar qualquer mudança

```
npm test          # 41 testes; nenhum precisa de rede
npm run build     # tem que passar limpo
npm run dev       # e abrir de verdade no navegador
```

Nunca diga que funciona sem ter rodado. E teste também numa tela estreita: metade do uso é no Android.

## Dois editores sobre o mesmo texto — cuidado aqui

`EditorNotion` (BlockNote) sincroniza o markdown **só na montagem** (`useEffect` com `[]`). Se outro componente alterar o mesmo `corpo` enquanto ele está aberto, o editor não vê a mudança e a sobrescreve no próximo `onChange`. Foi por isso que o componente `Subtarefas` existe e está testado mas **não** está ligado ao modal de tarefa.

Duas saídas, quando alguém for resolver:
1. Fazer o `EditorNotion` re-sincronizar quando o `markdown` mudar por fora (cuidado com laço de atualização).
2. Ou aceitar que o editor é o único dono do corpo — BlockNote já tem caixinha de tarefa nativa.

## Pendências conscientes

- Token e chave ficam em texto puro no `localStorage`. O plano discutido é criptografá-los com uma senha (WebCrypto, sem backend). O Hugo adiou por ora.
- Sem funcionamento offline: o app depende do GitHub estar acessível.
- Imagens engordam o repositório. Acima de ~1 GB, migrar para um bucket e guardar só os links.
