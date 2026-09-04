# Design System Klaus — Guia Oficial de Interface

Este documento define o **Design System oficial do aplicativo Klaus** (Segundo Cérebro). Todas as telas existentes e novas funcionalidades **devem obrigatoriamente seguir esta estrutura e reutilizar seus componentes base**.

---

## 🎨 Filosofia do Design

O Klaus adota uma estética **moderna, limpa e funcional**, inspirada em ferramentas profissionais como Notion, Linear e Raycast, ajustada para um designer gráfico (foco em legibilidade, contraste equilibrado, arredondamento harmonioso e transições fluidas).

- **Princípio 1 — Consistência Absoluta**: Ao navegar entre seções (ex: de Notas para Contatos ou Tarefas), o topo da tela, os botões, os campos de busca e o ritmo de espaçamento permanecem no mesmo lugar.
- **Princípio 2 — Componentes Reutilizáveis**: Nunca crie formulários ou listas "à mão" com HTML bruto. Sempre utilize os componentes da suíte `src/components/`.
- **Princípio 3 — Transição Suave**: Toda troca de tela é envolvida em animações suaves de entrada (`animate-in fade-in duration-200`).

---

## 📐 Estrutura Padrão de uma Tela (Page Blueprint)

Toda tela do Klaus deve seguir esta ordem hierárquica no seu retorno JSX:

```tsx
import { CabecalhoPagina } from "@/components/CabecalhoPagina";
import { BarraFerramentas } from "@/components/BarraFerramentas";
import { AlternadorVisao } from "@/components/AlternadorVisao";
import { CabecalhoSecao } from "@/components/CabecalhoSecao";
import { CartaoItem } from "@/components/CartaoItem";
import { SeloStatus } from "@/components/SeloStatus";
import { TagChip } from "@/components/TagChip";
import { Carregando, Vazio, Aviso } from "@/components/ui";

export default function MinhaNovaTela() {
  return (
    <div className="space-y-6 animate-in fade-in duration-200 w-full pb-10">
      {/* 1. Cabeçalho Principal */}
      <CabecalhoPagina
        titulo="Título da Tela"
        descricao="Descrição curta e amigável da finalidade da tela."
        icone={<MeuIcone size={20} />}
        corIcone="bg-blue-500/10 text-blue-600 dark:text-blue-400"
        badge={<SeloStatus rotulo="3 itens" tom="primario" />}
        acoes={<Botao onClick={aoCriarNovo}><Plus size={16} /> Novo Item</Botao>}
      />

      {/* 2. Barra de Busca + Filtros + Alternador de Visão */}
      <BarraFerramentas
        busca={busca}
        aoMudarBusca={setBusca}
        placeholderBusca="Buscar por título..."
        filtros={<select ... />}
        acoes={
          <AlternadorVisao
            valorAtivo={modoVisao}
            aoAlternar={setModoVisao}
            opcoes={[
              { id: "lista", rotulo: "Lista", icone: <List size={14} /> },
              { id: "quadro", rotulo: "Quadro", icone: <LayoutGrid size={14} /> },
            ]}
          />
        }
      />

      {/* 3. Avisos e Feedback de Carga */}
      {erro && <Aviso tom="erro">{erro}</Aviso>}

      {/* 4. Lista ou Grade de Conteúdo */}
      {carregando ? (
        <Carregando texto="Buscando informações..." />
      ) : itens.length === 0 ? (
        <Vazio
          icone={<MeuIcone size={24} />}
          titulo="Nenhum item criado ainda"
          descricao="Crie o primeiro item para começar."
          acao={<Botao onClick={aoCriarNovo}>Criar Primeiro Item</Botao>}
        />
      ) : (
        <div className="space-y-6">
          <section className="space-y-3">
            <CabecalhoSecao titulo="Subseção de Conteúdo" contador={itens.length} />
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {itens.map((item) => (
                <CartaoItem
                  key={item.id}
                  icone={<MeuIcone size={18} />}
                  titulo={item.titulo}
                  subtitulo={item.descricao}
                  badge={<SeloStatus rotulo={item.status} tom="sucesso" />}
                  tags={item.tags}
                  onClick={() => abrir(item)}
                />
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
```

---

## 🎨 Paleta de Cores Mapeada por Módulo

Cada área do Klaus possui um tom temático específico para o seu ícone de cabeçalho:

| Módulo / Tela | Cor da Badge do Ícone (`corIcone`) | Ícone Recomendado |
|---|---|---|
| **Notas** | `bg-amber-500/10 text-amber-600 dark:text-amber-400` | `<FileText />` |
| **Tarefas** | `bg-blue-500/10 text-blue-600 dark:text-blue-400` | `<ListTodo />` |
| **Árvore de Contatos** | `bg-emerald-500/10 text-emerald-600 dark:text-emerald-400` | `<FolderTree />` |
| **Referências Visuais** | `bg-pink-500/10 text-pink-600 dark:text-pink-400` | `<ImagePlus />` |
| **Plano de Carreira (PDI)** | `bg-teal-500/10 text-teal-600 dark:text-teal-400` | `<Target />` |
| **Caixa de Entrada (Inbox)** | `bg-indigo-500/10 text-indigo-600 dark:text-indigo-400` | `<Bell />` |
| **Excalidraw (Lousas)** | `bg-cyan-500/10 text-cyan-600 dark:text-cyan-400` | `<Layout />` |
| **Revista Digital & Radar** | `bg-red-500/10 text-red-600 dark:text-red-400` | `<Newspaper />` |
| **Transcrição de Áudio** | `bg-purple-500/10 text-purple-600 dark:text-purple-400` | `<Mic />` |
| **Conversor de Arquivos** | `bg-blue-500/10 text-blue-600 dark:text-blue-400` | `<RefreshCw />` |
| **Ferramentas PDF** | `bg-red-500/10 text-red-600 dark:text-red-400` | `<FileText />` |
| **Grafo Neural** | `bg-indigo-500/10 text-indigo-600 dark:text-indigo-400` | `<Network />` |
| **Chat IA** | `bg-purple-500/10 text-purple-600 dark:text-purple-400` | `<MessageSquare />` |
| **Ajustes e Conexões** | `bg-slate-500/10 text-slate-600 dark:text-slate-400` | `<Settings />` |
| **Home (Painel Principal)** | `bg-amber-500/10 text-amber-600 dark:text-amber-400` | `<Sun /> / <Moon />` |

---

## 🧰 Guia dos Componentes do Design System

### 1. `CabecalhoPagina` (`src/components/CabecalhoPagina.tsx`)
- **Quando usar**: No topo de **toda e qualquer tela**.
- **Propriedades**:
  - `titulo` (obrigatório): Título principal.
  - `descricao` (opcional): Subtítulo explicativo em 1 linha.
  - `icone` (opcional): Ícone da tela em caixa arredondada.
  - `corIcone` (opcional): Cor do fundo e texto do ícone.
  - `badge` (opcional): Contador ou selo ao lado do título.
  - `acoes` (opcional): Botões primários ou filtros gerais.

### 2. `BarraFerramentas` (`src/components/BarraFerramentas.tsx`)
- **Quando usar**: Sempre que a tela permitir busca por texto, filtros por categoria ou alternar visões.
- **Propriedades**:
  - `busca` + `aoMudarBusca`: Controla o campo de busca com ícone de lupa.
  - `placeholderBusca`: Texto de dica do campo de busca.
  - `filtros`: Dropdowns `<select>` ou botões de filtro.
  - `acoes`: `AlternadorVisao` ou botões secundários.

### 3. `AlternadorVisao` (`src/components/AlternadorVisao.tsx`)
- **Quando usar**: Para alternar visões (Lista | Quadro | Tabela | Calendário | Feed | Revista).
- **Propriedades**:
  - `valorAtivo`: ID da visão selecionada.
  - `aoAlternar`: Função chamada ao clicar.
  - `opcoes`: Array de `{ id, rotulo, icone }`.

### 4. `CabecalhoSecao` (`src/components/CabecalhoSecao.tsx`)
- **Quando usar**: Para dividir subseções de conteúdo dentro da tela.
- **Propriedades**:
  - `titulo`: Nome do grupo (ex: "Notas Recentes", "Tarefas Atrasadas").
  - `contador`: Número de itens no grupo.

### 5. `CartaoItem` (`src/components/CartaoItem.tsx`)
- **Quando usar**: Para exibir cada item de uma lista ou grade.
- **Propriedades**:
  - `icone`: Ícone do tipo de item.
  - `titulo`: Título do item.
  - `subtitulo`: Caminho, data ou descrição curta.
  - `badge`: Status em `SeloStatus`.
  - `tags`: Array de tags string (ex: `["design", "pessoal"]`).
  - `acoes`: Botões de ação rápida no canto direito.
  - `onClick`: Clique no cartão para abrir no `PainelNotionBase`.

### 6. `SeloStatus` (`src/components/SeloStatus.tsx`)
- **Quando usar**: Para indicar estados de tarefas, metas e urgência.
- **Tons**:
  - `"sucesso"`: Verde (concluído, ativo).
  - `"aviso"`: Amarelo (hoje, atenção).
  - `"perigo"`: Vermelho (atrasado, cancelado).
  - `"primario"`: Azul/Violeta (em andamento, fazendo).
  - `"neutro"`: Cinza (a fazer, rascunho).

### 7. `TagChip` (`src/components/TagChip.tsx`)
- **Quando usar**: Para exibir tags `#categoria`. Suporta clique para filtrar e ícone de remover `x`.

### 8. `Vazio` e `Carregando` (`src/components/ui.tsx`)
- **`Vazio`**: Exibe estado sem dados com ícone centralizado, título, descrição e botão de ação primária.
- **`Carregando`**: Spinner animado centralizado com texto amigável.

### 9. `Rodape` (`src/components/Rodape.tsx`)
- **Quando usar**: Posicionado no final do layout principal (`<main>`) para fornecer links rápidos, atalhos de teclado, status do sistema em tempo real e botão de voltar ao topo.

### 10. `BarraAcoesLote` e `BotaoAcaoLote` (`src/components/BarraAcoesLote.tsx`)
- **Quando usar**: Barra flutuante universal no rodapé da página disparada automaticamente quando 1 ou mais itens são selecionados (em Tarefas, Notas, PDI/Entregas, Referências, Contatos, etc.).
- **Recursos**: Visual moderno em *glassmorphism*, contador pluralizado de itens selecionados, suporte a fechar via tecla `Esc` ou botão `X`, botões de ação modulares com tooltip integrado (`<BotaoAcaoLote />`).


---

## 📌 Regras Obrigatórias para Agentes de IA

1. **Nunca crie cabeçalhos soltos com `<h1>` manual**: Use sempre `<CabecalhoPagina />`.
2. **Nunca crie inputs soltos de busca com `Search` posicionado manualmente**: Use sempre `<BarraFerramentas />`.
3. **Nunca crie grupos de botões soltos de visualização**: Use sempre `<AlternadorVisao />`.
4. **Sempre incremente a versão** em `package.json` e `src/lib/versao.ts` ao alterar ou criar telas.
5. **Rode os testes e o build** (`npm test` e `npm run build`) antes de concluir a entrega.
