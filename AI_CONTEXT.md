# Contexto de IA & Mapa de Navegação do Klaus

> **Documento vivo gerado automaticamente por `scripts/gerar-mapa-ia.ts` em 2026-09-03.**
> Não edite as tabelas de módulos à mão — execute `npm run mapa-ia` ou `npm run build` para sincronizar com o código.

Este arquivo foi desenhado sob medida para **Agentes de IA e LLMs** que operam no repositório Klaus.
Ele condensa a arquitetura, regras de ouro, rotas de persistência, ciclo de dados e o catálogo de exportações ativas.

---

## 🏆 Regras de Ouro para IAs (Golden Rules)

Toda IA que realizar manutenção, refatoração ou criação de novas funcionalidades no Klaus **DEVE** seguir estritamente estas diretrizes:

### 1. Fonte da Verdade (Source of Truth)
- **Arquivos Markdown (`.md`) são a ÚNICA fonte de verdade.**
- **NÃO** crie bancos de dados, storages locais dependentes de servidor ou caches derivados externos. O usuário Hugo edita arquivos diretamente pela interface web do GitHub, e qualquer índice externo divergirá.
- **Arquitetura 100% Client-Side / Zero Backend**: O app roda estaticamente no GitHub Pages. Todas as operações com dados comunicam-se diretamente com `api.github.com` via GitHub Contents API e GraphQL.

### 2. Integridade de Arquivos & Parsing de Markdown
- **Frontmatter é sempre opcional e tolerante a falhas:** Um arquivo `.md` sem frontmatter YAML ou com YAML malformado DEVE continuar abrindo e sendo editável. Perder campos é chato; perder o texto do usuário é inaceitável (veja `lerMarkdown` em `src/lib/markdown.ts`).
- **Isole a lógica de parsing da lógica de UI:** Parsing de Markdown, extração de frontmatter e serialização pertencem exclusivamente a `src/lib/markdown.ts` e `src/lib/entidades.ts`. Componentes de UI não devem fazer regex manual de frontmatter.
- **Preserve campos desconhecidos:** Sempre utilize `mesclarFrontmatter(x.bruto, { ... })` ao salvar para não apagar campos criados por outras IAs ou ferramentas.

### 3. Navegação e Arquivos Reais
- **NUNCA invente caminhos de arquivos.** Sempre consulte este mapa ou utilize as ferramentas de busca de código antes de tentar importar ou modificar módulos.
- **Respeite a árvore de dados do repositório privado:**
  - Notas: `notas/*.md`
  - Tarefas: `tarefas/*.md`
  - Metas do PDI: `pdi/metas/*.md`
  - Entregas do PDI: `pdi/entregas/*.md`
  - Referências: `referencias/*.md` + `referencias/imagens/*`
  - Contatos: `contatos/*.md`
  - Lousas: `lousas/*.md`

### 4. Ciclo de Dados & Performance de Rede
- **Carregamento em lote:** Utilize os hooks padronizados (`useItemRepo`, `useSalvar`) ou `carregarRepo(cfg)` em `src/lib/repo.ts`. **NUNCA** execute `listar()` seguido de N requisições `ler()`. O Klaus carrega a árvore e os conteúdos via GraphQL em lote com cache inteligente por `sha`.
- **Invalidação mandatória:** Sempre chame `invalidarCache()` após qualquer operação de `gravar()` ou `apagar()`.

### 5. Estilização & Design System
- **Siga o [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md):** Utilize Tailwind CSS v4 e a suíte de componentes em `src/components/` (`CabecalhoPagina`, `BarraFerramentas`, `CartaoItem`, `SeloStatus`, `TagChip`, etc.) e Radix/Shadcn em `src/components/ui/`.
- **Layout responsivo:** Mais de 50% dos acessos do usuário são via Android / mobile. Toda tela deve se adaptar perfeitamente a viewports estreitas.

### 6. IA e Transparência
- **Marcação `ia_sugeriu: true`:** Qualquer alteração ou inserção automática realizada pela IA nos dados do usuário (especialmente em `pdi/entregas`) deve conter a flag `ia_sugeriu: true` no frontmatter até que o usuário revise.

### 7. Segurança de Segredos
- **NUNCA comite segredos ou tokens:** O repositório do código é público. Tokens do GitHub e chaves do Gemini residem unicamente no `localStorage` do navegador.

### 8. Versionamento e Finalização Mandatória
- **Incrementar versão a cada alteração:** Ao adicionar funcionalidades ou correções, incremente a versão em `package.json` e em `src/lib/versao.ts`.
- **Garantir testes e build limpos:** Sempre execute `npm test` e `npm run build` antes de concluir a entrega.
- **Commit e Push:** Realize `git add .`, `git commit -m "..."` e `git push` ao finalizar a tarefa.

---

## 🧭 Mapeamento Rápido de Arquitetura & Fluxos

### Fluxo de Leitura e Edição
```text
Navegador (React SPA)
  │
  ├── 1. Leitura: useItemRepo() → carregarRepo() → GitHub Contents/GraphQL (Cache por SHA)
  ├── 2. Parsing: comoNota(), comoTarefa(), etc. em src/lib/entidades.ts
  ├── 3. Edição: EditorNotion (BlockNote) + Subtarefas (Checkbox inline)
  ├── 4. Conversão: notaParaArquivo() / mesclarFrontmatter()
  └── 5. Escrita: useSalvar() → gravar() em src/lib/github.ts → invalidarCache()
```

### Hooks de Leitura e Escrita Recomendados
| Hook / Módulo | Arquivo | Responsabilidade |
|---|---|---|
| `useItemRepo` | `src/lib/useItemRepo.ts` | Hook reativo para carregar itens de uma pasta com cache, estado de carregamento e auto-revalidação |
| `useSalvar` | `src/lib/useSalvar.ts` | Hook unificado para gravação, debounce, fila offline e atualização de estado |
| `useMutacaoItem` | `src/lib/useMutacaoItem.ts` | Hook para operações atômicas de mutação direta de itens |
| `carregarRepo` | `src/lib/repo.ts` | Carrega repositório inteiro em 2 requisições otimizadas reaproveitando SHA |
| `gravar` / `apagar` | `src/lib/github.ts` | Chamadas diretas à API do GitHub com tratamento de conflitos e limites de taxa |

---

## 📱 Catálogo de Telas e Rotas (`src/pages/`)

| Tela | Arquivo | Finalidade Principal |
|---|---|---|
| **BoasVindas** | `src/pages/BoasVindas.tsx` | Passo a passo de primeira execução (Onboarding) do Klaus. Apresenta as funcionalidades do app para profissionais criativos e guia a configuração do repositório privado do GitHub e da chave Gemini com total clareza, validações inteligentes e sem jargões técnicos. 100% otimizado para desktop e dispositivos móveis (Android e iOS). |
| **Chat** | `src/pages/Chat.tsx` | Interface e fluxo da tela de Chat |
| **Configuracoes** | `src/pages/Configuracoes.tsx` | Interface e fluxo da tela de Configuracoes |
| **Contatos** | `src/pages/Contatos.tsx` | Interface e fluxo da tela de Contatos |
| **Conversor** | `src/pages/Conversor.tsx` | Interface e fluxo da tela de Conversor |
| **FerramentasPDF** | `src/pages/FerramentasPDF.tsx` | Interface e fluxo da tela de FerramentasPDF |
| **GrafoNeural** | `src/pages/GrafoNeural.tsx` | Interface e fluxo da tela de GrafoNeural |
| **HeaderHUD** | `src/pages/HeaderHUD.tsx` | Interface e fluxo da tela de HeaderHUD |
| **Home** | `src/pages/Home.tsx` | Interface e fluxo da tela de Home |
| **Inbox** | `src/pages/Inbox.tsx` | Interface e fluxo da tela de Inbox |
| **Jogos** | `src/pages/Jogos.tsx` | Interface e fluxo da tela de Jogos |
| **Lixeira** | `src/pages/Lixeira.tsx` | Interface e fluxo da tela de Lixeira |
| **Lousas** | `src/pages/Lousas.tsx` | Interface e fluxo da tela de Lousas |
| **Notas** | `src/pages/Notas.tsx` | Interface e fluxo da tela de Notas |
| **Noticias** | `src/pages/Noticias.tsx` | Interface e fluxo da tela de Noticias |
| **PDI** | `src/pages/PDI.tsx` | Interface e fluxo da tela de PDI |
| **PesquisaLivros** | `src/pages/PesquisaLivros.tsx` | Interface e fluxo da tela de PesquisaLivros |
| **Referencias** | `src/pages/Referencias.tsx` | Interface e fluxo da tela de Referencias |
| **Sons** | `src/pages/Sons.tsx` | Interface e fluxo da tela de Sons |
| **Tarefas** | `src/pages/Tarefas.tsx` | Interface e fluxo da tela de Tarefas |
| **TestadorHardware** | `src/pages/TestadorHardware.tsx` | Interface e fluxo da tela de TestadorHardware |
| **Transcritor** | `src/pages/Transcritor.tsx` | Interface e fluxo da tela de Transcritor |

---

## 🧩 Catálogo de Componentes (`src/components/`)

### Componentes Principais (src/components/)
`AlternadorVisao`, `BarraFavoritos`, `BarraFerramentas`, `BarraFiltrosAvancados`, `Busca`, `CabecalhoPagina`, `CabecalhoSecao`, `Calendario`, `CapturaRapida`, `CardConsumoGitHub`, `CartaoAcao`, `CartaoItem`, `CartaoLousaVisual`, `CartaoNotaVisual`, `ConsoleDesenvolvedor`, `ContextoCronometro`, `ContextoFerramentasFlutuantes`, `DropdownNovoViaModelo`, `EditorNotion`, `GaleriaIconesModal`, `GavetaMais`, `HistoricoDiffModal`, `ImagemPrivada`, `ItemFlutuanteContext`, `LimiteDeErro`, `Links`, `LixeiraGitModal`, `LogoKlaus`, `MapaMentalEmbed`, `MenuAcoesTarefa`, `MenuContextoNotas`, `MiniCalendarioAtividade`, `ModalBuscaWeb`, `ModalCreditosOpenSource`, `ModalDossieCarreira`, `ModalGerenciarModelos`, `ModalGuiaAtalhos`, `ModalIADocumento`, `ModalInstalarPwa`, `ModalLembrete`, `ModalPersonalizarMenu`, `ModalRefatorarLinks`, `ModalSelecionarIconeFavorito`, `ModalTourGuiado`, `ModalVincularPDI`, `NavegacaoLateral`, `NavegadorGrafo3D`, `NavegadorTagsModal`, `PainelNotificacoesHeader`, `PainelNotionBase`, `PainelPropriedadesNota`, `PainelReferenciasNota`, `PainelTarefasNota`, `Pomodoro`, `PrismasFoco`, `PropriedadesNotion`, `Quadro`, `Rodape`, `SeletorOcr`, `SeloStatus`, `Subtarefas`, `SumarioNota`, `TagChip`, `ToastsContainer`, `WebSearchBar`, `WebSearchHeader`, `WebSearchWidget`, `ui`

### Sub-componentes: src/components/home/
`CabecalhoHome`, `ModalCatalogoWidgets`, `WidgetBuscaWeb`, `WidgetChatIA`, `WidgetConversorRapido`, `WidgetFocoHoje`, `WidgetHubFerramentas`, `WidgetLousasRecentes`, `WidgetMetasPDI`, `WidgetNotasRecentes`, `WidgetPDFRapido`, `WidgetReferenciasMural`, `WidgetScratchpad`, `WidgetSonsFoco`, `WidgetTranscritorVoz`, `WidgetWrapper`, `types`

### Sub-componentes: src/components/jogos/
`GradeTermo`, `JogoTermo`, `ModalComoJogarTermo`, `ModalEstatisticasTermo`, `TecladoTermo`

### Sub-componentes: src/components/ui/
`badge`, `button`, `calendar`, `card`, `command`, `dialog`, `input`, `popover`, `select`, `textarea`, `tooltip`

### Sub-componentes: src/components/workspace/
`WorkspaceBarraAbas`, `WorkspaceBreadcrumbs`, `WorkspaceContext`, `WorkspaceRodape`, `WorkspaceTelaCheia`, `WorkspaceVazio`

---

## 📚 Mapeamento Dinâmico de Módulos (`src/lib/`)

Abaixo estão os módulos de lógica de negócio e utilitários categorizados por área de atuação:

### 1. Persistência, GitHub API & Sincronização

#### 📄 `src/lib/github.ts`
> Cliente da GitHub Contents API. Este arquivo é a única porta de entrada e saída de dados do app. Não existe backend: o navegador fala direto com api.github.com, que responde com `access-control-allow-origin: *` e aceita PUT/DELETE. Cada gravação vira um commit no repositório de dados. Isso dá histórico e permite desfazer qualquer coisa pelo git.

**Exportações principais:**
- `funcao` **`conteudosSemelhantes`**
- `classe` **`ErroGitHub`**
- `funcao` **`conferir`** — _Traduz o erro do GitHub para português, distinguindo limite de API de falta de permissão (os dois ch..._
- `funcao` **`ler`** — _Baixa o conteúdo de um arquivo._
- `funcao` **`lerOuVazio`** — _Baixa o conteúdo de um arquivo em determinado commit ou branch, ou devolve "" se falhar._
- `funcao` **`gravar`**
- `funcao` **`gravarBinario`** — _Grava um arquivo binário (imagem) já em base64._
- `funcao` **`apagar`** — _Apaga um arquivo. O conteúdo continua recuperável pelo histórico do git._
- `tipo` **`Etapa`**
- `funcao` **`diagnosticar`** — _Sobe a escada de complexidade até achar o degrau que quebra. "Failed to fetch" não distingue interne..._
- `funcao` **`testarConexao`** — _Testa se o token e o repositório estão certos. Usado na tela de Configurações._
- `tipo` **`ArquivoLoteGit`**
- `funcao` **`gravarLoteGit`** — _Grava múltiplos arquivos em exatamente UM ÚNICO commit atômico usando a Git Data API. Isso garante q..._

#### 📄 `src/lib/lixeira.ts`
> Lixeira Soberana em Markdown do Klaus (.lixeira/) Em vez de destruir arquivos permanentemente com DELETE direto no GitHub, move o arquivo para a pasta oculta `.lixeira/` preservando todo o histórico e metadados com possibilidade de restauração em 1 clique.

**Exportações principais:**
- `constante` **`PASTA_LIXEIRA`**
- `tipo` **`ItemLixeira`**
- `funcao` **`moverParaLixeira`** — _Move um arquivo para a Lixeira Soberana (.lixeira/) com metadados de reversão._
- `funcao` **`restaurarDaLixeira`** — _Restaura um arquivo da Lixeira para sua pasta de origem._
- `funcao` **`listarItensLixeira`** — _Filtra e formata os itens da lixeira a partir do acervo carregado._

#### 📄 `src/lib/offlineQueue.ts`
> Gerenciador de Rascunhos e Fila de Operações em Segundo Plano (Sync Queue). Permite salvar e deletar notas, tarefas e outros itens localmente com Optimistic UI e sincroniza automaticamente com o GitHub em background assim que houver rede.

**Exportações principais:**
- `tipo` **`StatusRascunho`**
- `tipo` **`RascunhoOffline`**
- `funcao` **`inicializarArmazenamentoOffline`** — _Carrega a memória a partir do storage assíncrono e faz a migração inicial._
- `funcao` **`estaArmazenamentoInicializado`**
- `funcao` **`obterRascunhosLocais`**
- `funcao` **`salvarRascunhoLocal`**
- `funcao` **`atualizarRascunhoLocal`**
- `funcao` **`removerRascunhoLocal`**
- `funcao` **`limparTodosRascunhosLocais`**
- `funcao` **`redefinirRascunhosComErroParaPendente`** — _Redefine rascunhos que falharam para "pendente", permitindo nova tentativa com credenciais atualizad..._
- `funcao` **`limparRascunhosComErro`** — _Remove todos os rascunhos com erro da fila offline_
- `funcao` **`sincronizarFilaOffline`** — _Tenta descarregar a fila de rascunhos offline para o GitHub_
- `funcao` **`forcarResolverConflitoRascunho`** — _Força a gravação de um rascunho com conflito (409) ou erro no GitHub, buscando a SHA mais recente do..._

#### 📄 `src/lib/repo.ts`
> Carrega o repositório inteiro em duas requisições, não em uma por arquivo. O jeito antigo era: listar a pasta (1) e depois ler cada arquivo (N). Com 100 notas isso dava 101 requisições **por abertura de tela**, e o teto do GitHub é 5.000 por hora. Além de lento, chegava perto do limite. Agora: 1. Git Trees API traz a árvore inteira do repositório — 1 requisição 2. GraphQL traz o conteúdo de até 100 arquivos por vez — testado Resultado medido: 100 arquivos saem de 101 requisições para 2. O cache é só uma cópia do que está no repositório, indexada por `sha`. Não é um índice derivado que possa divergir: se o arquivo muda, o sha muda, e a entrada velha deixa de ser usada. Os arquivos continuam sendo a verdade.

**Exportações principais:**
- `tipo` **`ItemRepo`**
- `tipo` **`Cache`**
- `constante` **`cache`**
- `funcao` **`arquivosIlegiveis`**
- `funcao` **`invalidarCache`** — _Chamar depois de gravar ou apagar, para a próxima leitura buscar de novo._
- `funcao` **`esquecerTudo`** — _Esquece também o texto guardado por sha. Só faz sentido ao trocar de conta/repositório e nos testes ..._
- `funcao` **`ehArquivoInternoOuSistema`** — _Arquivos internos do repositório/sistema que NÃO devem ser tratados como documentos do usuário. Ex: ..._
- `funcao` **`resetarCacheArvore`**
- `funcao` **`carregarRepo`** — _Devolve todos os `.md` do repositório, com conteúdo já lido e analisado. Usa o cache quando a árvore..._
- `funcao` **`daPasta`** — _Só os arquivos de uma pasta, já ordenados do mais recente para o mais antigo._
- `funcao` **`daPastaRecursiva`** — _Todos os arquivos de uma pasta e suas subpastas recursivamente._
- `funcao` **`atualizarCacheLocal`** — _Atualiza instantaneamente (0ms) um item no cache de memória local. Garante que se o usuário reabrir ..._
- `funcao` **`removerDoCacheLocal`** — _Remove instantaneamente um item do cache de memória local ao deletar._
- `funcao` **`obterCacheExistente`** — _Retorna o cache em memória atual, se existir e for do mesmo repositório._

#### 📄 `src/lib/settings.ts`
> Configuração do app — fica no localStorage do navegador. Nada disto vai para o código nem para o repositório público. O token e a chave existem só no navegador de quem está usando o app.

**Exportações principais:**
- `tipo` **`Settings`**
- `funcao` **`derivarChaveWebCrypto`** — _Deriva uma chave AES-GCM usando PBKDF2 via WebCrypto nativa. ⚠️ ESCRITA E AINDA NÃO LIGADA EM LUGAR ..._
- `constante` **`PADRAO`**
- `funcao` **`lerConfig`**
- `funcao` **`salvarConfig`**
- `funcao` **`configCompleta`** — _O app só consegue ler/escrever se estes três estiverem preenchidos._
- `funcao` **`nomeExibido`** — _Como a interface se refere a quem está usando — em "criado por", por exemplo. Cai para o usuário do ..._
- `funcao` **`precisaOnboarding`** — _Decide se o passo a passo inicial (Onboarding / Tour) deve aparecer. Exibido sempre que o onboarding..._

#### 📄 `src/lib/storageOffline.ts`
> Armazenamento Local Assíncrono para a Fila Offline do Klaus (IndexedDB). Substitui o limite síncrono e rígido de ~5MB do localStorage por uma solução de grande capacidade (centenas de MBs), que não bloqueia a thread principal da interface e oferece resiliência total contra estouro de cota. Mantém a regra do Klaus: o armazenamento local é 100% efêmero e transitório; os arquivos Markdown no GitHub continuam sendo a única fonte da verdade.

**Exportações principais:**
- `funcao` **`salvarRascunhoNoArmazenamento`** — _Salva ou atualiza um rascunho offline no IndexedDB (ou fallback em memória)._
- `funcao` **`carregarTodosRascunhosArmazenamento`** — _Retorna todos os rascunhos offline armazenados._
- `funcao` **`removerRascunhoDoArmazenamento`** — _Remove um rascunho por ID ou caminho._
- `funcao` **`limparTodosRascunhosArmazenamento`** — _Limpa todos os rascunhos armazenados._
- `funcao` **`migrarRascunhosLegadosLocalStorage`** — _Migra automaticamente rascunhos legados do localStorage para o IndexedDB na inicialização._
- `funcao` **`salvarTextosPorSha`** — _Salva múltiplos conteúdos de arquivos indexados por seu SHA no IndexedDB._
- `funcao` **`carregarTextosPorShas`** — _Carrega em lote o texto dos arquivos a partir de uma lista de SHAs._
- `funcao` **`limparCacheSha`** — _Limpa todo o cache de SHAs do IndexedDB._

#### 📄 `src/lib/syncChannel.ts`
> Canal de sincronização inter-abas (BroadcastChannel). Notifica outras abas abertas no mesmo navegador quando uma gravação, exclusão ou alteração de acervo ocorre, acionando o evento "acervo-atualizado" sem precisar de nova requisição ao servidor.

**Exportações principais:**
- `funcao` **`notificarOutrasAbas`** — _Notifica todas as outras abas sobre mudanças no acervo_

### 2. Parser de Markdown, Frontmatter & Dados

#### 📄 `src/lib/autoMergeMarkdown.ts`
> Algoritmo de Auto-Merge Semântico 3-Way para Markdown. Resolve divergências entre a versão local (ex: celular) e remota (ex: Mac no GitHub) comparando-as contra a versão base para evitar erros HTTP 409 e perda de texto.

**Exportações principais:**
- `tipo` **`ResultadoAutoMerge`**
- `funcao` **`mesclarFrontmatterSemantico`** — _Mescla dois objetos de frontmatter em relação a uma base comum._
- `funcao` **`mesclarCorpoMarkdown`** — _Mescla dois corpos de texto markdown em relação a uma base. Trata blocos de parágrafos e caixas de s..._
- `funcao` **`autoMergeDocumentoMarkdown`** — _Ponto de entrada para o 3-Way Merge de documentos Markdown completos com frontmatter._

#### 📄 `src/lib/entidadeRegistro.ts`
> Registro Desacoplado e Extensível de Entidades do Klaus. Elimina switch cases e ifs espalhados pela aplicação mapeando: - Tipo de Entidade (TipoItem) - Pasta raiz do repositório - Conversores de ida e volta (ItemRepo <-> Objeto da Entidade) - Metadados de UI (Rótulos, Rotas, Ícones)

**Exportações principais:**
- `interface` **`DefinicaoEntidade`**
- `constante` **`REGISTRO_ENTIDADES`**
- `funcao` **`detectarTipoDoItem`** — _Detecta o tipo do item inspecionando o frontmatter e, como fallback, a pasta do caminho._
- `funcao` **`obterEntidadePorTipo`** — _Retorna a definição de entidade correspondente a uma rota ou tipo._
- `funcao` **`obterEntidadePorPasta`** — _Retorna a definição de entidade a partir de uma pasta._

#### 📄 `src/lib/entidades.ts`
> Conversão entre arquivos .md e entidades do app. Cada entidade tem duas funções: como<Entidade>(doc, caminho, sha, titulo) → entidade tipada paraArquivo(entidade)                     → { dados, corpo } para gravar REGRA INEGOCIÁVEL: `paraArquivo` sempre chama `mesclarFrontmatter`, que garante que campos que o app não conhece voltem para o arquivo. Nunca construa o objeto `dados` do zero — sempre parta do `item.bruto`. Os arquivos legados (tarefas.ts, pdi.ts, referencias.ts) re-exportam daqui para não quebrar imports existentes.

**Exportações principais:**
- `funcao` **`gerarIdEstavel`**
- `funcao` **`dataDoNome`** — _Extrai a data do prefixo do nome do arquivo: "2026-08-13-titulo.md"._
- `funcao` **`comoNota`**
- `funcao` **`notaParaArquivo`**
- `funcao` **`comoTarefa`**
- `funcao` **`tarefaParaArquivo`**
- `funcao` **`comoMeta`**
- `funcao` **`metaParaArquivo`**
- `funcao` **`comoEntrega`**
- `funcao` **`entregaParaArquivo`**
- `funcao` **`comoReferencia`**
- `funcao` **`referenciaParaArquivo`**
- `funcao` **`comoContato`**
- `funcao` **`contatoParaArquivo`**
- `funcao` **`textoPrazoTarefa`** — _Texto descritivo do prazo de uma tarefa. Mantido aqui para que a lógica de domínio fique junto do ti..._
- _...e mais 1 exportações secundárias._

#### 📄 `src/lib/markdown.ts`
> Leitura e escrita de Markdown com frontmatter YAML. Regra central do projeto: o arquivo .md é a fonte da verdade. Frontmatter é OPCIONAL — um arquivo sem ele continua abrindo normalmente. Nunca jogue fora conteúdo que não entendeu.

**Exportações principais:**
- `tipo` **`Frontmatter`**
- `tipo` **`Documento`**
- `funcao` **`lerMarkdown`** — _Separa o frontmatter do corpo. Se o YAML estiver quebrado, devolve o texto inteiro como corpo em vez..._
- `funcao` **`escreverMarkdown`** — _Monta o arquivo .md de volta. Frontmatter vazio não gera bloco `---`._
- `funcao` **`tituloProvavel`** — _Primeira linha de conteúdo, usada como título quando não há campo `titulo`._
- `funcao` **`nomeDeArquivo`** — _Transforma um título em nome de arquivo seguro (sem acento, sem símbolo)._
- `funcao` **`nomeLivre`** — _Garante um nome livre. Duas tarefas "Reunião" no mesmo dia geravam o mesmo caminho, e a segunda falh..._
- `funcao` **`comoLista`** — _Lê uma lista do frontmatter tolerando string única ou ausência._
- `funcao` **`mesclarFrontmatter`** — _Junta os campos que o app gerencia por cima dos que ele não conhece._
- `funcao` **`restaurarWikilinks`** — _Converte wikilinks [[alvo]], escapados `\[\[alvo\]\]` e URLs coladas contendo `?abrir=...` para o fo..._

#### 📄 `src/lib/pasteHtmlParaMarkdown.ts`
**Exportações principais:**
- `funcao` **`converterHtmlParaMarkdownClipboard`** — _Converte HTML da área de transferência em Markdown limpo e semanticamente estruturado._
- `funcao` **`ehHtmlFormatadoRelevante`** — _Detecta se o payload do clipboard contém HTML rico relevante que deva ser convertido em vez de ser c..._

#### 📄 `src/lib/sanitizer.ts`
**Exportações principais:**
- `funcao` **`sanitizarHTML`** — _Sanitizador de HTML / SVG seguro contra XSS usando DOMPurify. Previne injeções de script, mXSS e atr..._

#### 📄 `src/lib/schemas.ts`
> Schemas de validação não-bloqueante com Zod. REGRA INEGOCIÁVEL: 1. Todos os schemas usam `.passthrough()` para nunca descartar campos desconhecidos ou customizados gravados no YAML por outras ferramentas/IAs. 2. Validação é estritamente passiva: devolve lista de alertas e registra aviso em logger, NUNCA dispara exceção nem impede o ciclo de leitura/escrita.

**Exportações principais:**
- `constante` **`AlertaSchemaItem`**
- `tipo` **`AlertaSchema`**
- `constante` **`NotaSchema`**
- `constante` **`TarefaSchema`**
- `constante` **`MetaSchema`**
- `constante` **`EntregaSchema`**
- `constante` **`ContatoSchema`**
- `constante` **`ReferenciaSchema`**
- `funcao` **`validarSchemaPassivo`** — _Validação passiva e não-bloqueante de frontmatter. Retorna alertas de formato sem nunca interromper ..._

#### 📄 `src/lib/tipos.ts`
> CONTRATOS DO APP — comece aqui antes de qualquer mudança. Este arquivo é a "lei" do Klaus. Toda entidade do app tem um tipo aqui; o TypeScript recusa código que viole esses contratos. Para adicionar um campo a uma entidade, adicione aqui primeiro — as funções de conversão em `entidades.ts` vão reclamar se ficarem fora de sincronia. Regras inegociáveis (gravadas como código, não só como comentário): - `bruto` nunca é descartado: é o frontmatter original, preserva campos que o app não conhece. Ver `mesclarFrontmatter` em markdown.ts. - `sha` é o SHA real devolvido pelo GitHub após gravar, nunca inventado. - Nenhum dado vai para o arquivo sem passar por `paraArquivo()`. - Token do GitHub e chave Gemini só existem via `lerConfig()` — nunca hardcoded, nunca em outro lugar.

**Exportações principais:**
- `constante` **`PASTAS`** — _As pastas do repositório de dados — use estas constantes, nunca strings literais. Mudar o nome de um..._
- `tipo` **`Pasta`**
- `interface` **`ItemBase`** — _Campos que TODA entidade tem. `caminho` identifica o arquivo no repositório: "notas/2026-08-15-titul..._
- `interface` **`Nota`** — _Uma nota ou rascunho em `notas/`._
- `constante` **`STATUS_TAREFA`** — _Os três estados possíveis de uma tarefa._
- `tipo` **`StatusTarefa`**
- `constante` **`ROTULO_STATUS_TAREFA`**
- `interface` **`Tarefa`** — _Uma tarefa em `tarefas/`._
- `constante` **`STATUS_META`** — _Os três estados de uma meta de PDI._
- `tipo` **`StatusMeta`**
- `constante` **`ROTULO_STATUS_META`**
- `interface` **`Meta`** — _Uma meta do PDI em `pdi/metas/`._
- `interface` **`Entrega`** — _Uma entrega do PDI em `pdi/entregas/`._
- `constante` **`OPCOES_COLABORACAO_PADRAO`** — _Opções padrão para o campo de colaboração / equipe._
- `interface` **`Referencia`** — _Uma referência visual em `referencias/`._
- _...e mais 9 exportações secundárias._

### 3. Hooks de Estado, Leitura e Mutação

#### 📄 `src/lib/useItemRepo.ts`
> Hook de carregamento padrão do app com suporte a SWR (Stale-While-Revalidate). TODA tela principal deve usar este hook em vez de reimplementar o carregamento do repositório. Não chame `carregarRepo` + `daPasta` diretamente nas telas — use este hook. O hook: - Se os dados estiverem em cache local, renderiza-os imediatamente (0ms) - Valida e atualiza o acervo silenciosamente no GitHub em background - Mescla alterações da fila offline (e oculta exclusões pendentes) - Escuta o evento "acervo-atualizado" e recarrega em silêncio - Expõe `recarregar()` para ser chamado após salvar/apagar

**Exportações principais:**
- `tipo` **`EstadoRepo`**
- `funcao` **`useItemRepo`**
- `tipo` **`EstadoAcervoRepo`**
- `funcao` **`useAcervoRepo`** — _Hook para telas que precisam do repositório inteiro (ex: Chat, Grafo, Inbox) com suporte completo a ..._

#### 📄 `src/lib/useMediaDevices.ts`
**Exportações principais:**
- `interface` **`DispositivoMidia`**
- `funcao` **`useMediaDevices`**

#### 📄 `src/lib/useMutacaoItem.ts`
> Hook de Mutação de Alto Nível para Entidades do Klaus. Encapsula: 1. Optimistic UI imediata 2. Debounce seguro para digitação contínua (com limpeza e flush de timers) 3. Notificação coordenada ao Batched Event Bus 4. Tratamento unificado de erros e estado salvando

**Exportações principais:**
- `interface` **`OpcoesMutacao`**
- `interface` **`RetornoMutacao`**
- `funcao` **`useMutacaoItem`**

#### 📄 `src/lib/useSalvar.ts`
> Hook de salvamento otimista e não bloqueante do app. TODA tela usa este hook para gravar e apagar. Ele garante Optimistic UI: 1. Salva a tarefa na fila em background (Sync Queue) 2. Atualiza o cache local na memória imediatamente com um SHA (real ou temporário) 3. Dispara o evento "acervo-atualizado" instantaneamente 4. Retorna sucesso imediato sem bloquear a interface do usuário A sincronização real com o GitHub ocorre em segundo plano na fila de sync.

**Exportações principais:**
- `tipo` **`EstadoSalvar`**
- `funcao` **`useSalvar`**

### 4. Links, Menções (@) & Grafo de Conexões

#### 📄 `src/lib/grafo.ts`
> Extrator e simulador de física 3D para o Grafo Neural de Relacionamentos. Mapeia todas as entidades do repositório (Notas, Tarefas, Metas, Entregas, Referências e Lousas), extrai os relacionamentos cruzados (@menções, tags e links) e gera um grafo tridimensional com simulação de forças físicas estabilizada.

**Exportações principais:**
- `tipo` **`TipoNoGrafo`**
- `tipo` **`NoGrafo3D`**
- `tipo` **`ArestaGrafo3D`**
- `tipo` **`DadosGrafo3D`**
- `constante` **`CORES_TIPOS_GRAFO`**
- `funcao` **`construirGrafo3D`**
- `funcao` **`simularPassoFisica3D`** — _Executa uma iteração da simulação de forças físicas 3D (Repulsão + Mola de Atração + Gravidade Centr..._

#### 📄 `src/lib/links.ts`
> Ligações entre itens — a premissa que faltava. Suporta formatos: - `[[nome do item]]` - `@nome do item` - URLs completas contendo `?abrir=tarefas%2F...` ou `?abrir=notas%2F...`

**Exportações principais:**
- `tipo` **`Alvo`**
- `tipo` **`Referencia`**
- `funcao` **`chave`** — _Normaliza para comparar títulos sem tropeçar em acento ou caixa._
- `funcao` **`montarIndice`** — _Índice título/arquivo/caminho → item, para resolver os links._
- `funcao` **`extrairLinks`** — _Extrai as referências de um texto, resolvendo cada uma contra o índice._
- `tipo` **`Mencao`**
- `funcao` **`mencoesA`** — _Quem aponta para este item._
- `funcao` **`alvosUnicos`** — _O índice guarda cada item várias vezes (por título, por nome de arquivo e por caminho). Esta é a lis..._
- `funcao` **`filtrarAlvos`** — _Filtra alvos já carregados por um termo digitado. Separado de `sugerir` para o editor poder filtrar ..._
- `funcao` **`sugerir`** — _Sugestões para o autocompletar, a partir do índice completo._
- `funcao` **`extrairMencoesTexto`** — _Extrai menções em formato de string (`@Nome`) do corpo de um texto. Esta função alimenta o campo `re..._
- `funcao` **`sincronizarRelacionamentos`** — _Garante que dadosProps/frontmatter contenha a propriedade `relacionamentos` sincronizada com as menç..._
- `tipo` **`ResultadoRenomeacao`** — _Resultado da propagação de um renomeio._
- `funcao` **`propagarRenomeacao`** — _Propaga a alteração de um título para todos os arquivos que mencionavam o título antigo. Atualiza @T..._
- `funcao` **`propagarRenomeacaoId`** — _Propaga a alteração de um identificador estrutural (slug/id) em metas, pai_id e processo_id._
- _...e mais 3 exportações secundárias._

#### 📄 `src/lib/refatorarLinks.ts`
> Refatoração e atualização de referências cruzadas em cascata. Ao renomear uma nota, meta ou tarefa: 1. Isola blocos de código (fenced e inline) para não alterar menções falsas. 2. Atualiza menções @TituloAntigo -> @TituloNovo sem corromper títulos compostos mais longos (ex: @Design vs @Design System). 3. Atualiza wikilinks legados [[TituloAntigo]]. 4. Atualiza referências de URL interna (?abrir=caminho-antigo.md). 5. Oferece `planejarRefatoracao` para visualização e confirmação antes de gravar.

**Exportações principais:**
- `tipo` **`AlteracaoProposta`**
- `tipo` **`PlanoRefatoracao`**
- `funcao` **`isolarBlocosCodigo`** — _Isola blocos de código protegidos para que menções dentro deles não sejam tocadas._
- `funcao` **`restaurarBlocosCodigo`** — _Restaura os blocos de código originais._
- `funcao` **`substituirMencoesSeguras`** — _Substitui menções de um título antigo por um título novo de forma estritamente segura._
- `funcao` **`planejarRefatoracao`** — _Monta o plano de refatoração comparando o acervo sem gravar no repositório._
- `funcao` **`executarPlanoRefatoracao`** — _Executa o plano de refatoração no GitHub. Estratégia de Atomicidade: Quando houver múltiplos arquivo..._

#### 📄 `src/lib/vinculosNota.ts`
**Exportações principais:**
- `funcao` **`obterTarefasVinculadas`** — _Busca no cache do repositório todas as tarefas vinculadas a uma nota específica por menção no título..._
- `funcao` **`obterReferenciasVinculadas`** — _Busca no cache do repositório todas as referências visuais vinculadas a uma nota específica._

### 5. Inteligência Artificial, Gemini & Ações do Sistema

#### 📄 `src/lib/acoes.ts`
> Ações que a IA pode propor — e que só acontecem se você aprovar. O Gemini não escreve no repositório direto. Ele devolve um bloco declarando o que quer fazer; o app mostra um cartão com a proposta e nada é gravado antes de você clicar em Aprovar. A razão é simples: um engano da IA vira commit no seu repositório. É recuperável pelo git, mas descobrir e desfazer dá trabalho — e a confiança na ferramenta não sobrevive a duas ou três surpresas dessas.

**Exportações principais:**
- `tipo` **`TipoAcao`**
- `tipo` **`Acao`**
- `constante` **`PASTAS_VALIDAS`**
- `constante` **`FERRAMENTAS`** — _Declaração das ferramentas para o Gemini. Usar chamada de função nativa, e não pedir um bloco JSON n..._
- `tipo` **`ChamadaFuncao`** — _Uma chamada de função como o Gemini devolve._
- `funcao` **`acoesDeChamadas`** — _Converte as chamadas do Gemini em ações, descartando o que for inválido._
- `funcao` **`descrever`** — _Frase curta descrevendo a ação, para o cartão de confirmação._
- `funcao` **`limparReservas`** — _Usado nos testes; no app o conjunto só cresce durante a sessão._
- `funcao` **`executar`**

#### 📄 `src/lib/clipper.ts`
> Captura de página da web, em Markdown limpo. Duas partes, na mesma ordem que o Web Clipper oficial do Obsidian (github.com/obsidianmd/obsidian-clipper, MIT) faz: 1. **Readability + Turndown** tiram menu, banner e rodapé e devolvem só o artigo, já em Markdown. 2. **Metadados e modelos** pegam autor, data e descrição do cabeçalho da página e os encaixam num molde com `{{variáveis}}`. O passo 2 é o que faltava: sem ele a captura chegava sem autor nem data, e um link salvo em janeiro virava um texto órfão em julho.

**Exportações principais:**
- `tipo` **`Metadados`**
- `funcao` **`comoData`** — _Normaliza qualquer data reconhecível para AAAA-MM-DD._
- `funcao` **`extrairMetadados`**
- `funcao` **`aplicarModelo`** — _Troca `{{campo}}` e `{{campo|filtro}}` pelos valores. Campo ausente vira vazio, e a linha que sobrou..._
- `constante` **`MODELO_PADRAO`** — _Molde do corpo de uma captura. É uma string comum, não um pedaço de programa: dá para mexer no forma..._
- `tipo` **`ResultadoClipping`**
- `funcao` **`converterHtmlParaMarkdown`** — _Converte HTML (ou trecho colado de um artigo) em Markdown limpo. Nunca estoura: se o Readability não..._
- `funcao` **`capturarUrlWeb`** — _Baixa o HTML de uma URL e converte. ATENÇÃO — isto não é 100% no navegador. O site quase sempre recu..._

#### 📄 `src/lib/ferramentasApp.ts`
**Exportações principais:**
- `interface` **`FerramentaApp`**
- `constante` **`LISTA_FERRAMENTAS_APP`**
- `funcao` **`obterFerramentasPersonalizadas`** — _Retorna o catálogo de ferramentas aplicando os nomes, ícones e cores personalizados pelo usuário no ..._

#### 📄 `src/lib/gemini.ts`
> Conversa com o Gemini, direto do navegador. A API do Google responde a requisições cross-origin (verificado: ela devolve access-control-allow-origin com a origem do site), então não existe backend aqui também. A chave fica no localStorage e nunca sai para lugar nenhum além do próprio Google.

**Exportações principais:**
- `tipo` **`Papel`**
- `tipo` **`Mensagem`**
- `classe` **`ErroGemini`**
- `funcao` **`instrucaoBase`** — _Instruções fixas em toda conversa. As duas regras que mais importam: nunca inventar fato sobre o tra..._
- `tipo` **`RespostaIA`**
- `funcao` **`conversar`**
- `tipo` **`PromptSalvo`**
- `constante` **`PROMPTS`**
- `funcao` **`transcreverAudioComIA`** — _Transcreve arquivo de áudio com identificação de oradores e marcação de tempo._
- `funcao` **`extrairLembretesComIA`** — _Analisa o conteúdo de um documento com a IA Gemini e extrai prazos/lembretes._

#### 📄 `src/lib/iaRapida.ts`
**Exportações principais:**
- `interface` **`MensagemIARapida`**
- `funcao` **`tentarResolverContaLocal`** — _Avaliador local rápido para contas matemáticas e expressões do dia a dia. Resolve instantaneamente (..._
- `funcao` **`corrigirTextoGratuito`** — _Correção gramatical e ortográfica gratuita em Português do Brasil via LanguageTool. Sem necessidade ..._
- `funcao` **`consultarWikipedia`** — _Consulta de definições, fatos, conceitos e pessoas em Português via Wikipedia. 100% gratuita, sem ch..._
- `funcao` **`consultarGeminiRobusto`** — _Consulta o Gemini quando configurado no Klaus, com tentativa sequencial nos modelos disponíveis._
- `funcao` **`consultarLLMGratuito`** — _Consulta modelo de IA gratuito e aberto via API pública compatível sem necessidade de chave. Suporta..._
- `funcao` **`perguntarIARapida`** — _Função principal para perguntas rápidas no editor de documentos. Atende a contas, correções, pergunt..._

#### 📄 `src/lib/ocr.ts`
> Lê o texto que está DENTRO de uma imagem. O buraco que isto tapa: metade das referências salvas é print — de site, de slide, de post, de conversa. O texto ali dentro é invisível para a busca, então uma referência ótima some seis meses depois porque você lembra da frase e não do título que deu para ela. Depois de passar por aqui o texto vira texto puro no `.md`, e a busca (⌘K) o encontra como qualquer outro. Continua legível fora do app, como tudo. Roda no navegador via Tesseract, sem backend. O pacote de idioma tem alguns megabytes e é carregado sob demanda — nunca no primeiro acesso ao app.

**Exportações principais:**
- `constante` **`CABECALHO_OCR`** — _Título sob o qual o texto lido é guardado no corpo do arquivo._
- `funcao` **`limparTextoLido`** — _Limpa a saída bruta do OCR. O Tesseract devolve muita sujeira previsível: linha só com um caractere ..._
- `funcao` **`anexarTextoLido`** — _Acrescenta o texto lido ao corpo, sob um cabeçalho fixo. Reexecutar o OCR SUBSTITUI o bloco anterior..._
- `funcao` **`extrairTexto`** — _Extrai o texto de uma imagem (URL, blob: ou File). `aoProgredir` recebe de 0 a 1 — sem ele a tela fi..._
- `tipo` **`CropArea`** — _Coordenadas de crop (em pixels da imagem real, não da tela)._
- `funcao` **`cropImageToBlob`** — _Recorta uma área da imagem e devolve como Blob. Usa Canvas para fazer o crop antes de enviar ao Tess..._
- `funcao` **`extrairTextoDaArea`** — _Extrai texto apenas de uma área selecionada da imagem. Faz crop via Canvas antes de passar ao Tesser..._

#### 📄 `src/lib/ragLocal.ts`
> RAG Local Híbrido com MiniSearch para injeção contextual seletiva no Gemini. Em vez de concatenar o repositório inteiro cegamente (o que estourava os 120.000 chars e gerava sobrecarga e alucinações), esta camada: 1. Identifica a intenção temática ou estrutural da pergunta (ex: "quais são minhas metas?"). 2. Utiliza o motor MiniSearch em memória para selecionar os 6 a 10 documentos mais relevantes. 3. Monta um contexto conciso e rico em metadados dentro de um orçamento estrito de caracteres.

**Exportações principais:**
- `tipo` **`IntencaoConsulta`**
- `funcao` **`classificarIntencaoConsulta`** — _Classifica a intenção da consulta para selecionar entidades estruturais prioritárias._
- `funcao` **`montarContextoSemantico`** — _Monta um contexto de alta relevância com orçamento de caracteres._

#### 📄 `src/lib/whisperLocal.ts`
**Exportações principais:**
- `funcao` **`obterTranscritorWhisperLocal`**
- `funcao` **`removerRepeticoesInfinitas`** — _Remove loops de repetição de palavras ou frases_
- `funcao` **`decodificarAudioPara16kHz`** — _Decodifica qualquer arquivo de áudio (incluindo OGG do WhatsApp 48kHz) e reamostra com precisão para..._
- `funcao` **`transcreverAudioLocalWhisper`** — _Transcreve o áudio 100% localmente no navegador via Whisper Base ou Small (muito superior ao Tiny)._

### 6. Busca, Filtros & Recuperação de Dados

#### 📄 `src/lib/busca.ts`
> Busca em tudo que você escreveu e nas ferramentas do Klaus. Roda no navegador, sobre o conteúdo que o `repo.ts` já carregou — então é instantânea, funciona em repositório privado e não gasta requisição nenhuma. A busca de código do GitHub não serviria: ela demora a indexar e não é confiável em repositórios privados pequenos. O motor é a MiniSearch. A versão anterior comparava com `includes`, o que exigia acertar a palavra inteira: "reuinão" não achava nada, e "tipo" não achava "tipografia". Agora há tolerância a erro de digitação e busca por começo de palavra. **O índice vive só na memória.** Ele é remontado a partir dos `.md` a cada carga do acervo e nunca é gravado em lugar nenhum — os arquivos continuam sendo a única fonte da verdade, como manda a regra 1 do AGENTS.md.

**Exportações principais:**
- `tipo` **`Resultado`**
- `tipo` **`CategoriaFiltroBusca`**
- `funcao` **`tipoDoItem`** — _Descobre o tipo pelo frontmatter e, se faltar, pela pasta através do registro desacoplado._
- `funcao` **`ficharItem`**
- `funcao` **`resetarIndiceBusca`** — _Reseta o cache de busca em memória (usado nos testes e logout)._
- `funcao` **`indiceDe`** — _Retorna o índice de busca em memória com suporte a reuso imediato (0ms) e indexação incremental sele..._
- `funcao` **`buscar`**
- `funcao` **`agrupar`** — _Agrupa por tipo, preservando a ordem de relevância dentro de cada grupo._
- `funcao` **`buscarFerramentas`**
- `funcao` **`filtrarPorCategoria`**
- `funcao` **`lerFavoritosBusca`**
- `funcao` **`salvarFavoritosBusca`**
- `funcao` **`alternarFavoritoBusca`**
- `funcao` **`ehFavoritoBusca`**

#### 📄 `src/lib/buscaWeb.ts`
**Exportações principais:**
- `tipo` **`WebSearchEngine`**
- `interface` **`WebSearchFilters`**
- `interface` **`InfoCampoFiltro`**
- `constante` **`MOTORES_BUSCA`**
- `constante` **`FILTROS_PRINCIPAIS`**
- `constante` **`FILTROS_EXTRAS_POR_MOTOR`**
- `interface` **`AtalhoDorkRapido`**
- `constante` **`ATALHOS_DORKS_RAPIDOS`**
- `funcao` **`obterChavesSuportadas`** — _Retorna as chaves de filtros suportadas pelo motor selecionado._
- `funcao` **`construirQueryWeb`** — _Constrói a string de query com todos os operadores aplicáveis para o motor de busca._
- `funcao` **`gerarUrlBuscaWeb`** — _Gera a URL final para onde o navegador será redirecionado._
- `funcao` **`executarBuscaWeb`** — _Redireciona a aba atual do navegador para os resultados de busca._
- `funcao` **`contarFiltrosAtivos`** — _Conta quantos filtros estão atualmente preenchidos e são compatíveis com o motor._
- `constante` **`EVENTO_BUSCADOR_WEB_ALTERADO`**
- `funcao` **`obterMotorBuscaWeb`**
- _...e mais 2 exportações secundárias._

#### 📄 `src/lib/favoritos.ts`
**Exportações principais:**
- `interface` **`FavoritoItem`**
- `constante` **`CAMINHO_FAVORITOS`**
- `constante` **`CHAVE_STORAGE_FAVORITOS`**
- `constante` **`EVENTO_FAVORITOS_ATUALIZADOS`**
- `funcao` **`normalizarUrl`** — _Normaliza uma URL garantindo o prefixo https:// caso nenhum protocolo seja informado._
- `funcao` **`extrairDominio`** — _Extrai com segurança o domínio/hostname da URL para obter o favicon._
- `funcao` **`obterFaviconGoogle`** — _Retorna a URL do serviço de Favicons do Google para o domínio especificado._
- `constante` **`FAVORITOS_PADRAO_KLAUS`**
- `funcao` **`lerFavoritosLocal`** — _Lê os favoritos salvos no localStorage ou chrome.storage._
- `funcao` **`salvarFavoritosLocal`** — _Salva a lista de favoritos no localStorage e notifica a aplicação via evento._
- `funcao` **`registrarShaFavoritos`** — _Registra o SHA conhecido de .klaus/favoritos.json_
- `funcao` **`obterShaFavoritos`** — _Obtém o último SHA registrado de .klaus/favoritos.json_
- `funcao` **`temPersistenciaPendente`** — _Indica se há uma persistência agendada no debounce aguardando envio ao GitHub._
- `funcao` **`invalidarCacheFavoritos`**
- `funcao` **`carregarFavoritos`** — _Carrega os favoritos do repositório GitHub com mesclagem segura com o localStorage._
- _...e mais 4 exportações secundárias._

#### 📄 `src/lib/historicoAtividade.ts`
> Compilador de Histórico de Atividades e Mapa de Calor (Klaus Activity Pulse) Mapeia todas as ações, criações, edições, conclusões de tarefas e referências visuais por dia para alimentar o mini calendário estilo GitHub em tons de roxo.

**Exportações principais:**
- `interface` **`AtividadeDia`**
- `tipo` **`MapaAtividadesPorDia`**
- `funcao` **`normalizarDataParaIso`** — _Normaliza qualquer formato de data/timestamp para YYYY-MM-DD_
- `funcao` **`compilarHistoricoAtividades`** — _Compila todo o histórico de atividades a partir do acervo do repositório_
- `funcao` **`calcularNivelIntensidade`** — _Calcula o nível de intensidade de 0 a 4 (estilo GitHub) baseado na contagem_

#### 📄 `src/lib/inbox.ts`
> LÓGICA E SERVIÇOS DA CAIXA DE ENTRADA E LEMBRETES DO KLAUS Responsável por: 1. Extrair lembretes padronizados [⏰ Lembrete: titulo | YYYY-MM-DD HH:mm] de qualquer documento 2. Identificar tarefas atrasadas 3. Gerenciar o estado de visualização (visto, descartado) com persistência no GitHub/localStorage 4. Disparar notificações via Telegram Bot API e Google Apps Script (E-mail)

**Exportações principais:**
- `constante` **`CAMINHO_ESTADO_INBOX`**
- `interface` **`EstadoItemInbox`**
- `tipo` **`MapaEstadoInbox`**
- `funcao` **`formatarTagLembrete`** — _Formata um lembrete como a tag padronizada inserida no documento. Exemplo: [⏰ Lembrete: Comprar mate..._
- `funcao` **`extrairLembretesDeTexto`** — _Extrai todos os lembretes contidos no texto de um documento._
- `funcao` **`adiarDataHora`** — _Adia uma data/hora de lembrete com base na opção selecionada (Snooze)._
- `funcao` **`compilarNotasInativas`** — _Identifica notas paradas/inativas no repositório há mais de X dias (Ideia 10)._
- `funcao` **`compilarItensInbox`** — _Varre todo o acervo do repositório para extrair lembretes, tarefas atrasadas e notas inativas._
- `funcao` **`lerEstadoInboxLocal`** — _Lê o mapa de estado da Inbox do localStorage._
- `funcao` **`salvarEstadoInboxLocal`** — _Salva o mapa de estado da Inbox no localStorage._
- `funcao` **`marcarItemComoVistoLocal`** — _Marca um documento específico como visto localmente no mapa da inbox_
- `funcao` **`mesclarEstadosInbox`**
- `funcao` **`carregarEstadoInbox`** — _Carrega o estado da Inbox sincronizado do repositório GitHub (com fallback pro local)._
- `interface` **`ResultadoGravarEstadoInbox`**
- `funcao` **`gravarEstadoInbox`** — _Grava o estado atualizado da Inbox no repositório GitHub._
- _...e mais 5 exportações secundárias._

### 7. Entidades Especializadas & Regras de Negócio

#### 📄 `src/lib/contatos.ts`
**Exportações principais:**
- `interface` **`NoContato`**
- `funcao` **`slugifyNomeContato`** — _Converte um nome em slug seguro para nome de arquivo no GitHub. Ex: "Marcelo Silva (CEO)" -> "marcel..._
- `funcao` **`construirArvoreContatos`** — _Organiza uma lista plana de contatos em uma estrutura hierárquica em árvore. Suporta N níveis de pro..._
- `funcao` **`filtrarContatos`** — _Filtra contatos por texto de busca, empresa e tag._
- `interface` **`ContatoImportadoCSV`**
- `funcao` **`parsearCSVContatos`** — _Analisa o cabeçalho e as linhas de um CSV e devolve uma lista de contatos parciais. Tolerante a deli..._
- `funcao` **`exportarCSVContatos`** — _Exporta os contatos formatados para CSV._

#### 📄 `src/lib/menuPersonalizado.ts`
**Exportações principais:**
- `interface` **`ItemMenuPersonalizado`**
- `interface` **`GrupoMenuPersonalizado`**
- `interface` **`PresetCor`**
- `constante` **`PRESETS_CORES_ICONE`**
- `constante` **`CAMINHO_MENU`**
- `constante` **`CHAVE_STORAGE_MENU`**
- `constante` **`EVENTO_MENU_ATUALIZADO`**
- `constante` **`GRUPOS_MENU_PADRAO`**
- `funcao` **`carregarMenuPersonalizado`** — _Carrega a configuração do menu salva no localStorage com tolerância total a dados corrompidos._
- `funcao` **`registrarShaMenu`**
- `funcao` **`obterShaMenu`**
- `funcao` **`agendarPersistenciaMenuRemoto`** — _Enfileira a persistência assíncrona do menu no repositório GitHub com debounce suave._
- `funcao` **`sincronizarMenuComGithub`** — _Carrega a configuração do menu salva no repositório GitHub e mescla com a local._
- `funcao` **`salvarMenuPersonalizado`** — _Salva a nova configuração do menu no localStorage e dispara o evento de atualização. Se houver confi..._
- `funcao` **`restaurarMenuPadrao`** — _Restaura o menu lateral para as configurações originais de fábrica._
- _...e mais 1 exportações secundárias._

#### 📄 `src/lib/migracaoLote.ts`
> Analisador e Migrador em Lote de Entidades do Klaus. Varre todo o acervo de arquivos Markdown no repositório, identifica documentos que ainda utilizam convenções legadas e permite a padronização unificada em lote direto no GitHub.

**Exportações principais:**
- `interface` **`ItemMigracao`**
- `interface` **`RelatorioAnaliseAcervo`**
- `funcao` **`normalizarDocumento`** — _Normaliza um documento de acordo com o conversor canônico de seu tipo._
- `funcao` **`analisarAcervoParaMigracao`** — _Analisa todo o acervo do repositório e retorna quais arquivos precisam de padronização._
- `interface` **`ResultadoMigracaoLote`**
- `funcao` **`executarMigracaoEmLote`** — _Executa a gravação sequencial dos arquivos normalizados no GitHub._

#### 📄 `src/lib/noticias.ts`
> Módulo de Notícias & Revista Digital para o Klaus. Adota a arquitetura comprovada de leitura dos leitores de feed open-source do GitHub (georapbox/rss-feed-reader + rss-parser). Consome os campos `content` (HTML integral da matéria) e `body` (TabNews) para exibir matérias completas e organizadas instantaneamente, com capas HD, 3 modos visuais e integrações com o repositório.

**Exportações principais:**
- `tipo` **`CategoriaNoticia`**
- `tipo` **`ModoExibicao`**
- `interface` **`ItemNoticia`**
- `interface` **`FeedCustomizado`**
- `interface` **`CategoriaConfig`**
- `constante` **`CATEGORIAS_NOTICIAS`**
- `funcao` **`obterImagemIlustrativa`** — _Seleciona uma imagem de alta definição temática_
- `funcao` **`limparTexto`** — _Limpa marcas de formatação mantendo o texto sem quebras_
- `funcao` **`formatarHtmlEditorial`** — _Sanitiza e formata o HTML recebido do campo `content` do RSS, mantendo parágrafos (<p>), subtítulos ..._
- `funcao` **`calcularTempoLeitura`** — _Calcula o tempo estimado de leitura (média de 180 palavras por minuto)_
- `funcao` **`obterModoExibicao`**
- `funcao` **`salvarModoExibicao`**
- `funcao` **`obterCategoriasAtivas`**
- `funcao` **`salvarCategoriasAtivas`**
- `funcao` **`obterIdsCurtidos`**
- _...e mais 10 exportações secundárias._

#### 📄 `src/lib/pdi.ts`
> Plano de Desenvolvimento Individual. Duas coisas, guardadas como arquivos .md: pdi/metas/*.md     — onde você quer chegar pdi/entregas/*.md  — o que você já fez A ligação entre elas é o campo `metas` no frontmatter da entrega, que aponta para o NOME DO ARQUIVO da meta (sem .md). Usar o nome do arquivo e não o título permite renomear o título sem quebrar a ligação. Os tipos e funções de conversão vivem agora em `tipos.ts` e `entidades.ts`. Este arquivo re-exporta tudo com os nomes legados.

**Exportações principais:**
- `constante` **`PASTA_METAS`**
- `constante` **`PASTA_ENTREGAS`**
- `funcao` **`metaParaFrontmatter`** — _Wrappers legados que retornam só o frontmatter (Record), não {dados,corpo}. Mantidos para compatibil..._
- `funcao` **`entregaParaFrontmatter`**
- `funcao` **`idDoCaminho`**
- `tipo` **`ResumoMeta`**
- `funcao` **`resumir`**
- `funcao` **`paradas`** — _Metas que precisam de atenção: sem nenhuma entrega há mais de 30 dias. Meta concluída ou recém-criad..._
- `funcao` **`semMeta`** — _Entregas que ainda não foram ligadas a nenhuma meta._
- `funcao` **`aConferir`** — _Entregas com ligação sugerida pela IA e ainda não conferida._

#### 📄 `src/lib/referencias.ts`
> Referências visuais. Cada referência é um .md em `referencias/`. A imagem vai para `referencias/imagens/` e o .md aponta para ela com markdown normal (`![](imagens/arquivo.jpg)`), para continuar legível fora do app. Os tipos e funções de conversão vivem agora em `tipos.ts` e `entidades.ts`. Este arquivo re-exporta com nomes legados e guarda as funções específicas de imagem e upload.

**Exportações principais:**
- `constante` **`PASTA_REFS`**
- `constante` **`PASTA_IMAGENS`**
- `constante` **`LIMITE_IMAGEM`** — _Limite do GitHub por arquivo via API. Acima disso a gravação falha._
- `funcao` **`refParaFrontmatter`** — _Wrapper legado que retorna só o frontmatter (Record), não {dados,corpo}. As telas novas usam `refere..._
- `funcao` **`nomeDeImagem`** — _Nome de arquivo para a imagem, preservando a extensão original._
- `funcao` **`arquivoParaBase64`** — _Converte o arquivo escolhido em base64 puro, sem o prefixo data:._
- `funcao` **`caminhoCompletoDaImagem`** — _Caminho completo no repositório, a partir do que está gravado no `.md`. O arquivo guarda `imagens/fo..._
- `funcao` **`limparCacheBlobs`** — _Limpa a memória retida por blobs de imagem privados_
- `funcao` **`baixarImagemPrivada`** — _Baixa uma imagem do repositório PRIVADO e devolve um `blob:` utilizável. Uma `<img src>` comum não d..._
- `funcao` **`todasAsTags`** — _Junta todas as tags usadas, para montar o filtro._

#### 📄 `src/lib/tarefas.ts`
> Regras das tarefas. Uma tarefa é um arquivo .md em `tarefas/`. O frontmatter guarda o estado; o corpo é anotação livre. O tempo de pomodoro é registrado no próprio corpo, para continuar legível fora do app. Os tipos e funções de conversão vivem agora em `tipos.ts` e `entidades.ts`. Este arquivo re-exporta tudo com os nomes legados para não quebrar imports.

**Exportações principais:**
- `funcao` **`paraFrontmatter`** — _Retorna o frontmatter de uma tarefa para gravar de volta. Mantido com assinatura legada (retorna Rec..._
- `funcao` **`statusValido`** — _@deprecated Use StatusTarefa de tipos.ts_
- `funcao` **`ordenar`** — _Ordena pelo que exige atenção primeiro: atrasadas, depois por prazo, depois as sem prazo. Concluídas..._
- `tipo` **`Urgencia`**
- `funcao` **`urgencia`**
- `funcao` **`textoPrazo`**
- `interface` **`IntervaloTarefa`**
- `funcao` **`extrairIntervaloTarefa`** — _Extrai e normaliza o intervalo de datas de uma tarefa. Suporta formatos: - "2026-08-20 → 2026-08-25"..._
- `funcao` **`registrarCiclo`** — _Acrescenta o registro de um ciclo no corpo da tarefa, sob um cabeçalho fixo. Fica legível como texto..._
- `funcao` **`minutosRegistrados`** — _Soma os minutos já registrados no corpo._
- `tipo` **`Subtarefa`**
- `funcao` **`lerSubtarefas`**
- `funcao` **`alternarSubtarefa`** — _Marca ou desmarca uma caixinha, preservando indentação e o resto do texto._
- `funcao` **`adicionarSubtarefa`** — _Acrescenta uma subtarefa no fim da lista existente, ou no fim do corpo._
- `funcao` **`removerSubtarefa`**
- _...e mais 2 exportações secundárias._

#### 📄 `src/lib/templates.ts`
> Gerenciador de Modelos (Templates) para Notas e Tarefas. ## Arquitetura Os templates vivem em **dois lugares**: 1. `MODELOS_PADRAO` — hard-coded neste arquivo, não podem ser apagados. 2. `.klaus/templates/*.md` — arquivos Markdown no repositório de dados. Cada arquivo é um template com frontmatter e corpo. ## Migração do localStorage Na versão anterior, templates customizados ficavam no `localStorage`. A função `migrarModelosDoLocalStorage` move esses templates para o repositório de dados automaticamente. Depois de migrar, limpa o `localStorage`. ## Modelo padrão O ID do modelo padrão (aquele que é aplicado ao clicar "Nova Nota") continua no localStorage porque é uma preferência de UI, não dados.

**Exportações principais:**
- `constante` **`PASTA_TEMPLATES`**
- `tipo` **`TemplateItem`**
- `tipo` **`TemplateCategoria`**
- `constante` **`MODELOS_PADRAO`**
- `funcao` **`obterTodosModelos`** — _Retorna todos os modelos (padrão + repositório + legado localStorage). Se o repositório ainda não fo..._
- `funcao` **`obterModeloPadraoId`**
- `funcao` **`definirModeloPadraoId`**
- `funcao` **`obterModeloPadrao`**
- `funcao` **`ehModeloCustom`**
- `funcao` **`ehModeloPadrao`**
- `funcao` **`carregarTemplatesDoRepo`** — _Carrega templates do repositório (.klaus/templates/*.md). Atualiza o cache em memória e retorna todo..._
- `funcao` **`salvarTemplateNoRepo`** — _Salva um template como arquivo .md no repositório._
- `funcao` **`excluirTemplateDoRepo`** — _Exclui um template do repositório._
- `funcao` **`migrarModelosDoLocalStorage`** — _Migra templates do localStorage para o repositório. Chamado uma vez — depois limpa o localStorage._
- `funcao` **`salvarModelosPersonalizados`** — _@deprecated Use salvarTemplateNoRepo_
- _...e mais 4 exportações secundárias._

### 8. Infraestrutura, Áudio, Imagens e Utilitários Gerais

#### 📄 `src/lib/camadas.ts`
> Sistema de Hierarquia e Gerenciamento de Camadas (Overlays, Modais, Janelas Flutuantes e Toasts) do Klaus. Este módulo gerencia as regras de empilhamento (LIFO), controle de z-index, trava inteligente de rolagem da página (scroll lock) e fechamento ordenado via tecla Escape.

**Exportações principais:**
- `constante` **`CAMADAS_Z_INDEX`** — _Sistema de Hierarquia e Gerenciamento de Camadas (Overlays, Modais, Janelas Flutuantes e Toasts) do ..._
- `constante` **`NIVEIS_CAMADAS`**
- `interface` **`CamadaAtiva`**
- `constante` **`gerenciadorCamadas`**

#### 📄 `src/lib/catalogoIconesMarcas.ts`
**Exportações principais:**
- `interface` **`ItemIconeCatalogo`**
- `constante` **`CATEGORIAS_ICONES_MARCAS`**
- `tipo` **`CategoriaIconeMarca`**
- `constante` **`CATALOGO_ICONES_MARCAS`**
- `funcao` **`obterUrlsSimpleIcon`** — _Retorna as URLs SVG prioritária e alternativas para um determinado slug._
- `funcao` **`obterUrlSimpleIcon`** — _Retorna a URL SVG oficial prioritária._
- `funcao` **`sugerirIconePorUrl`** — _Detecta se uma URL pertence a um serviço famoso que tem logo oficial cadastrado._

#### 📄 `src/lib/creditosOpenSource.ts`
> Registro de Créditos e Agradecimentos Open Source. Mapeia as bibliotecas, motores e ferramentas de código aberto utilizadas no Klaus, atribuindo os devidos créditos aos autores originais com links diretos para seus repositórios no GitHub e licenças.

**Exportações principais:**
- `interface` **`CreditoOpenSource`** — _Registro de Créditos e Agradecimentos Open Source. Mapeia as bibliotecas, motores e ferramentas de c..._
- `constante` **`TODOS_CREDITOS_OPEN_SOURCE`**
- `funcao` **`obterCreditosPorRota`** — _Retorna os créditos de código aberto relevantes para a rota atual do usuário._

#### 📄 `src/lib/eventos.ts`
> Barramento de Eventos Agrupados (Batched Event Bus) do Klaus. Evita a "tempestade de re-renders" quando múltiplas operações em lote (como sync offline, mover 10 notas ou importar modelos) acontecem no mesmo tick. Utiliza `queueMicrotask` para despachar um único evento consolidado contendo a lista de caminhos e pastas modificadas.

**Exportações principais:**
- `constante` **`EVENTO_ACERVO_ATUALIZADO`**
- `tipo` **`DetalheEventoAcervo`**
- `funcao` **`dispararAtualizacaoAcervo`** — _Dispara a notificação de acervo atualizado com agrupamento automático via microtask. Múltiplas chama..._
- `funcao` **`useAoAtualizarAcervo`** — _Hook utilitário para assinar atualizações do acervo com suporte a filtro opcional por pasta._

#### 📄 `src/lib/historicoConversor.ts`
**Exportações principais:**
- `interface` **`ItemHistorico`**
- `funcao` **`inicializarDb`** — _Inicializa a conexão com o IndexedDB do navegador._
- `funcao` **`adicionarAoHistorico`** — _Adiciona uma nova conversão ao histórico IndexedDB. Em seguida, dispara a limpeza para respeitar as ..._
- `funcao` **`listarHistorico`** — _Retorna todos os itens do histórico ordenados por data decrescente (mais novos primeiro)._
- `funcao` **`limparExcedentesETtl`** — _Limpa silenciosamente os registros que excederam o TTL de 7 dias ou que ultrapassaram o limite de re..._
- `funcao` **`deletarHistorico`** — _Deleta todos os registros da loja do histórico._

#### 📄 `src/lib/icones.ts`
**Exportações principais:**
- `interface` **`ItemGaleriaIcone`**
- `constante` **`CATEGORIAS_ICONES`**
- `constante` **`CATALOGO_ICONES`**
- `funcao` **`obterIconePorNome`** — _Obtém o componente de ícone pelo nome. Se não encontrar, retorna HelpCircle como fallback._

#### 📄 `src/lib/imagem.ts`
> Encolhe a imagem no navegador antes de subir para o GitHub. O problema real: uma foto de celular moderno tem 8 a 12 MB. A API do GitHub recusa acima de 5 MB, e mesmo abaixo disso cada referência salva engordava o repositório de forma que não dá para desfazer — o git guarda todas as versões para sempre. A compressão roda em web worker (não trava a tela) e é feita pela `browser-image-compression`, que redimensiona e recomprime via canvas. Nenhum servidor envolvido: a imagem nunca sai do aparelho antes de já estar pequena.

**Exportações principais:**
- `constante` **`ALVO_MB`** — _Alvo de tamanho depois de comprimir. 1,5 MB dá folga confortável contra o limite de 5 MB do GitHub e..._
- `constante` **`LADO_MAXIMO`** — _Maior lado da imagem depois de redimensionar. 2400px cobre tela retina em tela cheia; acima disso é ..._
- `constante` **`MINIMO_PARA_COMPRIMIR`** — _Abaixo disso não vale a pena mexer — recomprimir só perderia qualidade._
- `funcao` **`ehIntocavel`**
- `funcao` **`precisaComprimir`** — _Decide se vale comprimir. Separado da compressão em si para poder ser testado sem canvas nem web wor..._
- `tipo` **`ResultadoCompressao`**
- `funcao` **`resumoCompressao`** — _Texto curto para mostrar ao Hugo o que aconteceu com a imagem dele._
- `funcao` **`prepararImagem`** — _Prepara o arquivo escolhido para subir. Nunca estoura: se a compressão falhar por qualquer motivo (f..._
- `funcao` **`erroDeTamanho`** — _Mensagem de erro quando nem comprimida a imagem coube. Acontece com PNG gigante de screenshot ou com..._

#### 📄 `src/lib/instaladorWorkflow.ts`
> Instalador do Workflow Autônomo de Lembretes do Klaus (GitHub Actions Cron) Cria o workflow `.github/workflows/klaus-lembretes.yml` diretamente no repositório privado de dados do usuário, permitindo que lembretes do Telegram disparem na hora certa a custo zero, sem precisar de servidor ou do app aberto.

**Exportações principais:**
- `constante` **`CAMINHO_WORKFLOW_LEMBRETES`**
- `funcao` **`gerarYamlWorkflowLembretes`**
- `funcao` **`instalarWorkflowLembretes`** — _Instala o workflow de lembretes no repositório de dados do usuário via GitHub Contents API._

#### 📄 `src/lib/limpezaProcessos.ts`
> Limpeza e Exclusão em Lote de Arquivos Residuais de Processos / CRM. Permite varrer o repositório de dados, identificar arquivos criados anteriormente na pasta `processos/` e excluí-los em lote do GitHub.

**Exportações principais:**
- `funcao` **`identificarArquivosProcessos`** — _Identifica todos os arquivos markdown ou dados na pasta processos/ e suas subpastas._
- `funcao` **`apagarArquivosProcessosEmLote`** — _Exclui todos os arquivos de processos informados do GitHub. Utiliza commit em lote atômico ou fallba..._

#### 📄 `src/lib/logger.ts`
**Exportações principais:**
- `tipo` **`TipoLog`**
- `interface` **`EntradaLog`**
- `funcao` **`limparLogs`** — _Limpa todos os logs voláteis em memória._
- `funcao` **`obterLogs`** — _Retorna uma cópia da lista atual de logs._
- `funcao` **`inscreverLogs`** — _Se inscreve para receber atualizações na lista de logs. Retorna uma função de cancelamento de inscri..._
- `funcao` **`higienizar`** — _Intercepta e mascara credenciais em qualquer string de log._
- `funcao` **`adicionarLog`** — _Adiciona uma entrada de log na pilha._
- `constante` **`logger`**
- `funcao` **`inicializarLogger`** — _Inicializa a captura global de logs (fetch, erros globais da window)._

#### 📄 `src/lib/pdf.ts`
**Exportações principais:**
- `funcao` **`exportarElementoParaPdf`** — _Converte um elemento do DOM em um arquivo PDF de alta qualidade. Clona o elemento temporariamente co..._

#### 📄 `src/lib/starterKit.ts`
> Gerador de Kit de Início do Klaus (Starter Pack). Cria arquivos amigáveis de exemplo para que o usuário não comece com o repositório 100% vazio e possa experimentar as funcionalidades (@menções, pomodoro, subtarefas, metas de PDI) imediatamente.

**Exportações principais:**
- `interface` **`ItemKitInicial`**
- `funcao` **`gerarItensKitInicial`**
- `funcao` **`criarKitInicial`** — _Grava os arquivos do kit de início no repositório GitHub do usuário. Retorna o número de arquivos cr..._

#### 📄 `src/lib/telemetria.ts`
> Módulo de Telemetria e Logs do Klaus. Grava sessões de foco (concluídas ou interrompidas) no arquivo `registro-tempo.json` do repositório.

**Exportações principais:**
- `interface` **`LogTempo`**
- `constante` **`CAMINHO_TELEMETRIA`**
- `funcao` **`extrairLogsTelemetria`** — _Lê todos os logs de telemetria do acervo carregado._
- `funcao` **`obterShaTelemetria`** — _Obtém o SHA atual do arquivo de telemetria para fins de commit._
- `funcao` **`adicionarLog`** — _Cria a representação em texto do arquivo JSON contendo o novo log adicionado._

#### 📄 `src/lib/telemetriaRequisicoes.ts`
> Telemetria de Requisições da GitHub API Monitora e audita em tempo real: - Limite de requisições por hora (x-ratelimit-limit: 5.000 ou 60) - Requisições restantes (x-ratelimit-remaining) - Tempo restante para reset da cota (x-ratelimit-reset) - Requisições salvas via HTTP 304 Not Modified (ETag / Conditional Requests) - Distribuição de consumo por tipo de operação (Árvore, Conteúdo, Gravação, Favoritos, etc.)

**Exportações principais:**
- `interface` **`MetricasRequisicoes`**
- `funcao` **`classificarUrlGitHub`**
- `funcao` **`registrarRespostaGitHub`**
- `funcao` **`obterMetricasRequisicoes`**
- `funcao` **`inscreverMetricas`**

#### 📄 `src/lib/tema.ts`
> Gerenciamento centralizado do tema do Klaus (claro/escuro). Utiliza exclusivamente a chave "tema" no localStorage e os valores "escuro" ou "claro", garantindo sincronia entre a busca global, a barra lateral, a gaveta mobile e a inicialização do app.

**Exportações principais:**
- `tipo` **`Tema`** — _Gerenciamento centralizado do tema do Klaus (claro/escuro). Utiliza exclusivamente a chave "tema" no..._
- `funcao` **`lerTemaSalvo`**
- `funcao` **`aplicarTema`**
- `funcao` **`alternarTema`**

#### 📄 `src/lib/toast.ts`
> Gerenciador de Toasts flutuantes nativo e leve.

**Exportações principais:**
- `tipo` **`TipoToast`** — _Gerenciador de Toasts flutuantes nativo e leve._
- `tipo` **`ItemToast`**
- `funcao` **`toast`**
- `funcao` **`removerToast`**
- `funcao` **`inscreverToasts`**

#### 📄 `src/lib/utils.ts`
**Exportações principais:**
- `funcao` **`cn`** — _Junta classes do Tailwind resolvendo conflitos. Padrão do shadcn/ui._
- `funcao` **`dataCurta`** — _"2026-08-13" -> "13 de agosto"_
- `funcao` **`formatarDataPtBR`** — _Converte data ISO ("2026-08-17") ou com hora ("2026-08-17 15:00") para o formato pt-BR ("17/08/26" o..._
- `funcao` **`rotuloStatusAmigavel`** — _Traduz status técnicos (ex: "a-fazer" -> "Pendente")._
- `funcao` **`diasAte`** — _Quantos dias faltam (negativo = atrasado)._
- `funcao` **`hojeISO`** — _Data de hoje no fuso LOCAL, não em UTC. `toISOString()` converte para UTC: às 22h no horário de Bras..._
- `funcao` **`dataISO`** — _AAAA-MM-DD de uma data qualquer, no fuso local._
- `funcao` **`dataHojeISO`** — _AAAA-MM-DD de uma data qualquer, no fuso local._
- `funcao` **`lerParametroAbrir`** — _Lê parâmetro "abrir" tanto da query string quanto do hash da URL em HashRouter SPA._
- `funcao` **`lerParametroCriar`** — _Lê parâmetros de criação rápida (?nova=true, ?novo=true, ?nova_meta=true, ?upload=true) da URL ou ha..._
- `funcao` **`removerAcentos`** — _Tira acentos de uma string para buscas e slugs._
- `funcao` **`correspondeBusca`** — _Verifica se um texto contém o termo de busca, tolerante a maiúsculas/minúsculas, acentos e trechos i..._
- `funcao` **`formatarNomeAmigavel`** — _Converte um caminho de arquivo técnico (ex: "tarefas/2026-08-13-fazer-a-capa.md") em um título legív..._
- `funcao` **`formatarCaminhoAmigavel`** — _Converte um caminho técnico (ex: "pdi/metas/2026-08-13-meta.md" ou "notas/projetos/klaus.md") em uma..._
- `funcao` **`formatarTituloAmigavel`** — _Garante um título limpo e legível para documentos, removendo extensões .md/.json, carimbos de data n..._
- _...e mais 2 exportações secundárias._

#### 📄 `src/lib/versao.ts`
> Versão atual da aplicação Klaus. REGRA MANDATÓRIA PARA AGENTES DE IA: Sempre que implementar uma nova funcionalidade, correção ou alteração no código, você DEVE incrementar esta versão (ex: 1.1.0 -> 1.1.1 ou 1.2.0) e atualizar também o campo "version" no package.json.

**Exportações principais:**
- `constante` **`versao`** — _Versão atual da aplicação Klaus. REGRA MANDATÓRIA PARA AGENTES DE IA: Sempre que implementar uma nov..._

