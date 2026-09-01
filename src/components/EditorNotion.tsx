import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { BlockNoteView } from "@blocknote/mantine";
import {
  SuggestionMenuController,
  useCreateBlockNote,
  getDefaultReactSlashMenuItems,
} from "@blocknote/react";
import { filterSuggestionItems } from "@blocknote/core";
import { Sparkles, ListOrdered, Maximize2, Minimize2, Printer, Table, CheckSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import * as locales from "@blocknote/core/locales";
import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";
import { lerConfig } from "@/lib/settings";
import { carregarRepo, cache, invalidarCache, type ItemRepo } from "@/lib/repo";
import { montarIndice, alvosUnicos, filtrarAlvos, type Alvo } from "@/lib/links";
import { restaurarWikilinks, nomeLivre, escreverMarkdown } from "@/lib/markdown";
import { formatarTagLembrete } from "@/lib/inbox";
import { tarefaParaArquivo } from "@/lib/entidades";
import { gravar } from "@/lib/github";
import { dispararAtualizacaoAcervo } from "@/lib/eventos";
import { toast } from "@/lib/toast";
import type { Tarefa } from "@/lib/tipos";
import { ModalLembrete } from "./ModalLembrete";
import { ModalIADocumento } from "./ModalIADocumento";
import { abrirItemSpa } from "./PropriedadesNotion";

/**
 * Detecta se uma coordenada de tela (clientX, clientY) corresponde a uma
 * menção `@Título` ou `[[Título]]` renderizada no DOM do editor.
 */
export function encontrarMencaoNoPonto(
  clientX: number,
  clientY: number,
  container: HTMLElement,
  alvos: Alvo[]
): Alvo | null {
  if (!container || alvos.length === 0) return null;

  const semAcento = (s: string) =>
    s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

  const porTamanho = [...alvos].sort((a, b) => b.titulo.length - a.titulo.length);

  // 1. Tenta obter nó e offset através do caret do ponto
  let rangeCaret: Range | null = null;
  if (typeof document !== "undefined") {
    if (document.caretRangeFromPoint) {
      rangeCaret = document.caretRangeFromPoint(clientX, clientY);
    } else if ((document as any).caretPositionFromPoint) {
      const pos = (document as any).caretPositionFromPoint(clientX, clientY);
      if (pos && pos.offsetNode) {
        rangeCaret = document.createRange();
        rangeCaret.setStart(pos.offsetNode, pos.offset);
        rangeCaret.setEnd(pos.offsetNode, pos.offset);
      }
    }
  }

  // 2. Determina o escopo: primeiro o bloco sob o cursor para máxima velocidade
  const elPonto =
    typeof document !== "undefined" && typeof document.elementFromPoint === "function"
      ? document.elementFromPoint(clientX, clientY)
      : null;
  const escopos = [
    elPonto?.closest(".bn-block") as HTMLElement | null,
    elPonto?.closest(".bn-block-content") as HTMLElement | null,
    container,
  ].filter(Boolean) as HTMLElement[];

  const escoposUnicos = Array.from(new Set(escopos));

  for (const escopo of escoposUnicos) {
    const caminhante = document.createTreeWalker(escopo, NodeFilter.SHOW_TEXT);
    for (let no = caminhante.nextNode(); no; no = caminhante.nextNode()) {
      const texto = no.textContent ?? "";
      if (!texto.includes("@") && !texto.includes("[[")) continue;

      // Busca menções com @
      for (let i = texto.indexOf("@"); i >= 0; i = texto.indexOf("@", i + 1)) {
        const anterior = i > 0 ? texto[i - 1] : "";
        if (anterior && /[\w.@-]/.test(anterior)) continue;

        const depoisDoArroba = texto.slice(i + 1);
        const achado = porTamanho.find(
          (a) =>
            semAcento(depoisDoArroba.slice(0, a.titulo.length)) ===
            semAcento(a.titulo)
        );
        if (!achado) continue;

        const inicio = i;
        const fim = i + 1 + achado.titulo.length;

        // Se o caret do clique caiu no mesmo nó de texto dentro do intervalo
        if (rangeCaret && (rangeCaret.startContainer === no || rangeCaret.startContainer.contains(no))) {
          const offset = rangeCaret.startOffset;
          if (offset >= inicio && offset <= fim) {
            return achado;
          }
        }

        // Checagem visual por coordenadas de retângulo (getClientRects)
        try {
          const faixa = document.createRange();
          faixa.setStart(no, inicio);
          faixa.setEnd(no, fim);
          const rects = faixa.getClientRects();
          for (let r = 0; r < rects.length; r++) {
            const rect = rects[r];
            if (
              clientX >= rect.left - 4 &&
              clientX <= rect.right + 4 &&
              clientY >= rect.top - 4 &&
              clientY <= rect.bottom + 4
            ) {
              return achado;
            }
          }
        } catch {}

        i += achado.titulo.length;
      }

      // Busca links antigos [[alvo]] ou [[alvo|texto]]
      for (let i = texto.indexOf("[["); i >= 0; i = texto.indexOf("[[", i + 1)) {
        const fimColchetes = texto.indexOf("]]", i + 2);
        if (fimColchetes < 0) continue;

        const miolo = texto.slice(i + 2, fimColchetes);
        const partes = miolo.split("|");
        const alvoTitulo = partes[0].trim();
        const achado = porTamanho.find(
          (a) => semAcento(alvoTitulo) === semAcento(a.titulo)
        );
        if (!achado) continue;

        const inicio = i;
        const fim = fimColchetes + 2;

        if (rangeCaret && (rangeCaret.startContainer === no || rangeCaret.startContainer.contains(no))) {
          const offset = rangeCaret.startOffset;
          if (offset >= inicio && offset <= fim) {
            return achado;
          }
        }

        try {
          const faixa = document.createRange();
          faixa.setStart(no, inicio);
          faixa.setEnd(no, fim);
          const rects = faixa.getClientRects();
          for (let r = 0; r < rects.length; r++) {
            const rect = rects[r];
            if (
              clientX >= rect.left - 4 &&
              clientX <= rect.right + 4 &&
              clientY >= rect.top - 4 &&
              clientY <= rect.bottom + 4
            ) {
              return achado;
            }
          }
        } catch {}

        i = fimColchetes + 1;
      }
    }
  }

  return null;
}

// Dicionário customizado com atalhos de Markdown em português para as legendas
const dicionarioCustomizado = locales.pt ? {
  ...locales.pt,
  slash_menu: {
    ...locales.pt.slash_menu,
    heading: {
      title: "Título 1",
      subtext: "# + Espaço para título grande",
      aliases: ["h1", "titulo1", "#"],
      group: "Títulos"
    },
    heading_2: {
      title: "Título 2",
      subtext: "## + Espaço para título médio",
      aliases: ["h2", "titulo2", "##"],
      group: "Títulos"
    },
    heading_3: {
      title: "Título 3",
      subtext: "### + Espaço para título pequeno",
      aliases: ["h3", "titulo3", "###"],
      group: "Títulos"
    },
    paragraph: {
      title: "Parágrafo",
      subtext: "Texto normal",
      aliases: ["p", "texto", "normal"],
      group: "Básicos"
    },
    bullet_list: {
      title: "Lista de marcadores",
      subtext: "- ou * + Espaço para lista simples",
      aliases: ["lista", "marcadores", "-"],
      group: "Básicos"
    },
    numbered_list: {
      title: "Lista numerada",
      subtext: "1. + Espaço para lista sequencial",
      aliases: ["lista", "numerada", "1."],
      group: "Básicos"
    },
    check_list: {
      title: "Lista de tarefas",
      subtext: "[] + Espaço para caixas de seleção",
      aliases: ["tarefa", "checklist", "[]"],
      group: "Básicos"
    },
    blockquote: {
      title: "Citação",
      subtext: "> + Espaço para destacar texto",
      aliases: ["cita", "citacao", ">"],
      group: "Básicos"
    },
    code_block: {
      title: "Bloco de código",
      subtext: "``` + Espaço para código formatado",
      aliases: ["codigo", "code", "```"],
      group: "Básicos"
    },
    divider: {
      title: "Linha divisória",
      subtext: "--- para uma linha de separação",
      aliases: ["separador", "hr", "---"],
      group: "Básicos"
    }
  }
} : undefined;

/**
 * Auxiliar para converter URLs coladas do tipo ?abrir=caminho ou [[alvo]] em @ Nome do Item
 */
export function formatarTextoAoColar(texto: string): string | null {
  if (!texto) return null;

  // Se for URL com ?abrir=...
  const matchUrl = texto.match(/(?:https?:\/\/[^\s)]+|#\/[^\s)]+)\?abrir=([a-zA-Z0-9_%.-]+)/);
  if (matchUrl) {
    let dec = matchUrl[1];
    try {
      dec = decodeURIComponent(matchUrl[1]);
    } catch {
      dec = matchUrl[1];
    }
    const partes = dec.split("/");
    const ultimo = partes.pop() || dec;
    const nomeOuTitulo = ultimo.replace(/^\d{4}-\d{2}-\d{2}-/, "").replace(/\.md$/, "");
    return `@${nomeOuTitulo}`;
  }

  // Se for [[alvo]] ou [[alvo|exibir]]
  const matchWiki = texto.match(/^\[\[([^\]|]+)(?:\|([^\]]+))?\]\]$/);
  if (matchWiki) {
    return `@${(matchWiki[2] ?? matchWiki[1]).trim()}`;
  }

  return null;
}

/**
 * `CSS.highlights` é a API de destaque do CSS: ela pinta intervalos de texto
 * sem alterar o DOM, que é o que permite colorir as menções dentro do editor
 * sem brigar com o ProseMirror. Esta versão do TypeScript ainda não a tipa,
 * daí a declaração aqui — restrita ao pouco que usamos.
 */
type RegistroDeRealce = {
  set(nome: string, realce: unknown): void;
  delete(nome: string): void;
};

function registroDeRealce(): RegistroDeRealce | null {
  if (typeof CSS === "undefined") return null;
  const comRealce = CSS as unknown as { highlights?: RegistroDeRealce };
  return comRealce.highlights ?? null;
}

function criarRealce(faixas: Range[]): unknown | null {
  const Construtor = (globalThis as unknown as {
    Highlight?: new (...faixas: Range[]) => unknown;
  }).Highlight;
  return Construtor ? new Construtor(...faixas) : null;
}

/**
 * Editor de texto rico que lê e escreve Markdown.
 */
export function EditorNotion({
  markdown,
  onChange,
  editable = true,
  acervo,
  alvosOverride,
  aoAbrirMencao,
}: {
  markdown: string;
  onChange: (markdown: string) => void;
  editable?: boolean;
  acervo?: ItemRepo[];
  alvosOverride?: Alvo[];
  aoAbrirMencao?: (alvo: Alvo) => void | Promise<void>;
}) {
  const [pronto, setPronto] = useState(false);
  const [escuro, setEscuro] = useState(
    () => document.documentElement.classList.contains("dark"),
  );
  const [modoZen, setModoZen] = useState(false);
  const [mostrarSumario, setMostrarSumario] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const estatisticas = useMemo(() => {
    const textoLimpo = (markdown || "").replace(/[#*`_~[\]()-]/g, " ").trim();
    const palavras = textoLimpo ? textoLimpo.split(/\s+/).filter(Boolean).length : 0;
    const caracteres = textoLimpo.length;
    const minutosLeitura = Math.max(1, Math.ceil(palavras / 200));
    return { palavras, caracteres, minutosLeitura };
  }, [markdown]);

  const sumario = useMemo(() => {
    const linhas = (markdown || "").split("\n");
    const titulos: { nivel: number; texto: string }[] = [];
    for (const linha of linhas) {
      const match = linha.match(/^(#{1,3})\s+(.+)$/);
      if (match) {
        titulos.push({
          nivel: match[1].length,
          texto: match[2].trim(),
        });
      }
    }
    return titulos;
  }, [markdown]);

  const editor = useCreateBlockNote({
    dictionary: dicionarioCustomizado,
  });
  const ultimoMd = useRef(markdown);

  const [alvos, setAlvos] = useState<Alvo[]>([]);
  const alvosOverrideKey = alvosOverride ? alvosOverride.map((x) => x.caminho).join(",") : "";

  useEffect(() => {
    function recarregar() {
      if (alvosOverride && alvosOverride.length > 0) {
        setAlvos(alvosOverride);
        return;
      }
      // `memoria` e não 0: isto só monta a lista de títulos para o
      // autocompletar do `@`. Forçar rede aqui fazia abrir o editor custar uma
      // leitura completa do repositório — e num túnel de metrô o autocompletar
      // simplesmente vinha vazio, sem explicação. O evento "acervo-atualizado"
      // logo abaixo já garante que a lista acompanhe quem for criado depois.
      carregarRepo(lerConfig(), { memoria: 30_000 })
        .then((todos) => {
          const indice = montarIndice(todos);
          setAlvos(alvosUnicos(indice));
        })
        .catch(() => {});
    }

    recarregar();
    window.addEventListener("acervo-atualizado", recarregar);
    return () => {
      window.removeEventListener("acervo-atualizado", recarregar);
    };
  }, [acervo, alvosOverrideKey]);

  const [modalLembreteAberto, setModalLembreteAberto] = useState(false);
  const [modalIAAberto, setModalIAAberto] = useState(false);
  const [posicaoIA, setPosicaoIA] = useState<{ x: number; y: number } | null>(null);

  const alvosRef = useRef(alvos);
  useEffect(() => {
    alvosRef.current = alvos;
  }, [alvos]);

  /** Cola o texto retornado pela IA diretamente no cursor do editor */
  const colarTextoIA = useCallback(
    async (texto: string) => {
      if (!texto) return;
      try {
        if (texto.includes("\n")) {
          const blocos = await editor.tryParseMarkdownToBlocks(texto);
          if (Array.isArray(blocos) && blocos.length > 0) {
            const cursor = editor.getTextCursorPosition();
            if (cursor?.block) {
              editor.insertBlocks(blocos, cursor.block, "after");
              return;
            }
          }
        }
        editor.insertInlineContent([`${texto} `]);
      } catch {
        editor.insertInlineContent([`${texto} `]);
      }
    },
    [editor],
  );

  /** Itens do menu slash disparado por '/' */
  const handleGetSlashItems = useCallback(
    async (query: string) => {
      const itemIA = {
        title: "Inteligência artificial",
        subtext: "Perguntas rápidas, contas e correções no texto",
        badge: "IA",
        aliases: [
          "ia",
          "ai",
          "inteligencia",
          "inteligência",
          "chat",
          "pergunta",
          "conta",
          "calcular",
        ],
        icon: <Sparkles size={16} className="text-primary" />,
        onItemClick: () => {
          let x = 120;
          let y = 140;

          try {
            const sel = window.getSelection();
            if (sel && sel.rangeCount > 0) {
              const rect = sel.getRangeAt(0).getBoundingClientRect();
              if (rect && (rect.top > 0 || rect.bottom > 0)) {
                x = rect.left;
                y = rect.bottom + 6;
              }
            }
            if (y === 140) {
              const cursor = editor.getTextCursorPosition();
              if (cursor?.block) {
                const blockEl = editor.domElement?.querySelector(`[data-id="${cursor.block.id}"]`);
                if (blockEl) {
                  const bRect = blockEl.getBoundingClientRect();
                  x = bRect.left;
                  y = bRect.bottom + 6;
                }
              }
            }
          } catch (e) {
            console.warn(e);
          }

          try {
            const cursor = editor.getTextCursorPosition();
            if (cursor?.block) {
              const currentBlock = cursor.block;
              if (
                Array.isArray(currentBlock.content) &&
                currentBlock.content.length === 1 &&
                typeof (currentBlock.content[0] as any).text === "string" &&
                (currentBlock.content[0] as any).text.startsWith("/")
              ) {
                editor.updateBlock(currentBlock, { content: [] });
              }
            }
          } catch (e) {
            console.warn(e);
          }

          // Limita horizontalmente e inverte verticalmente se estiver próximo ao rodapé
          const larguraCard = 400;
          x = Math.max(16, Math.min(window.innerWidth - larguraCard - 16, x));
          if (y + 200 > window.innerHeight) {
            y = Math.max(16, y - 220);
          }

          setPosicaoIA({ x, y });
          setModalIAAberto(true);
        },
      };

      const itemTabela = {
        title: "Tabela",
        subtext: "Inserir grade com linhas e colunas",
        aliases: ["tabela", "table", "grade", "grid"],
        icon: <Table size={16} className="text-blue-500" />,
        onItemClick: () => {
          try {
            (editor as any).insertBlocks(
              [
                {
                  type: "table",
                  content: {
                    type: "tableContent",
                    rows: [
                      { cells: [["Coluna 1"], ["Coluna 2"], ["Coluna 3"]] },
                      { cells: [["Item A"], ["Detalhe A"], ["R$ 0,00"]] },
                    ],
                  },
                },
              ],
              editor.getTextCursorPosition()?.block,
              "after"
            );
          } catch {
            editor.insertInlineContent(["\n\n| Coluna 1 | Coluna 2 |\n| --- | --- |\n| Item 1 | Valor |\n\n"]);
          }
        },
      };

      const itemTarefaKanban = {
        title: "Criar Tarefa no Kanban",
        subtext: "Gera uma nova tarefa no quadro a partir deste bloco",
        badge: "Kanban",
        aliases: ["tarefa", "task", "kanban", "todo", "fazer", "acao"],
        icon: <CheckSquare size={16} className="text-emerald-500" />,
        onItemClick: async () => {
          try {
            const cursor = editor.getTextCursorPosition();
            let textoBloco = "";
            if (cursor?.block) {
              const currentBlock = cursor.block;
              if (Array.isArray(currentBlock.content)) {
                textoBloco = currentBlock.content
                  .map((c: any) => c.text || "")
                  .join("")
                  .replace(/^\//, "")
                  .trim();
              }
            }

            const titulo = textoBloco || prompt("Título da nova tarefa:")?.trim();
            if (!titulo) return;

            const cfg = lerConfig();
            const todosItens = cache?.itens || [];
            const caminhoNovo = nomeLivre("tarefas", titulo, todosItens.map((i) => i.caminho));

            const novaTarefa: Tarefa = {
              caminho: caminhoNovo,
              sha: "",
              bruto: {},
              titulo,
              status: "a-fazer",
              tags: [],
              corpo: "",
              relacionamentos: [],
            };
            const { dados, corpo: corpoTarefa } = tarefaParaArquivo(novaTarefa);
            const md = escreverMarkdown({ dados, corpo: corpoTarefa });
            await gravar(cfg, caminhoNovo, md, `criar tarefa: ${titulo}`);
            invalidarCache();
            dispararAtualizacaoAcervo();

            if (cursor?.block) {
              editor.updateBlock(cursor.block, {
                content: [{ type: "text", text: `@${titulo} `, styles: {} }],
              });
            } else {
              editor.insertInlineContent([`@${titulo} `]);
            }
            toast(`Tarefa "${titulo}" criada com sucesso no Kanban!`);
          } catch (e: any) {
            toast(`Erro ao criar tarefa: ${e?.message || e}`, { tipo: "erro" });
          }
        },
      };

      const padrao = getDefaultReactSlashMenuItems(editor);
      return filterSuggestionItems([itemIA, itemTarefaKanban, itemTabela, ...padrao], query);
    },
    [editor],
  );

  /** Monta os itens do menu com callback estável de getItems para a SuggestionMenuController */
  const handleGetItems = useCallback(
    async (query: string) => {
      const itens = filtrarAlvos(alvosRef.current, query, 35).map((s) => {
        const ehLousa = s.tipo === "lousa" || s.caminho.startsWith("lousas/");
        const categoria = ehLousa
          ? "🗺️ Mapa Mental Excalidraw"
          : s.caminho.startsWith("tarefas/")
          ? "📋 Tarefa"
          : s.caminho.startsWith("notas/")
          ? "📝 Nota"
          : s.caminho.startsWith("pdi/")
          ? "🎯 Meta / Entrega PDI"
          : s.caminho.startsWith("referencias/")
          ? "🖼️ Referência Visual"
          : "📄 Documento";

        return {
          title: ehLousa ? `🗺️ @${s.titulo}` : `@${s.titulo}`,
          subtext: categoria,
          onItemClick: () => {
            editor.insertInlineContent([`@${s.titulo} `]);
          },
        };
      });

      const q = query.toLowerCase().trim();
      if (!q || "lembrete".includes(q) || "lembre".includes(q)) {
        itens.unshift({
          title: "⏰ @lembrete — Agendar Lembrete",
          subtext: "Abrir seletor de data, hora e notificações",
          onItemClick: () => {
            setModalLembreteAberto(true);
          },
        });
      }

      return itens;
    },
    [editor],
  );

  // acompanha o botão de tema do cabeçalho
  useEffect(() => {
    const observador = new MutationObserver(() =>
      setEscuro(document.documentElement.classList.contains("dark")),
    );
    observador.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observador.disconnect();
  }, []);

  const prontoRef = useRef(pronto);
  useEffect(() => {
    prontoRef.current = pronto;
  }, [pronto]);

  useEffect(() => {
    let cancelado = false;

    async function atualizarBlocos() {
      if (markdown === ultimoMd.current && prontoRef.current) return;
      try {
        const blocos = await editor.tryParseMarkdownToBlocks(markdown || "");
        if (!cancelado && Array.isArray(blocos)) {
          editor.replaceBlocks(editor.document, blocos);
          ultimoMd.current = markdown;
          setPronto(true);
        }
      } catch (err) {
        console.error("Erro ao converter markdown em blocos do BlockNote:", err);
      }
    }

    atualizarBlocos();

    return () => {
      cancelado = true;
    };
  }, [editor, markdown]);

  const aoColar = (e: React.ClipboardEvent) => {
    const raw = e.clipboardData.getData("text/plain");
    const substituicao = formatarTextoAoColar(raw);
    if (substituicao) {
      e.preventDefault();
      try {
        if (typeof (editor as any).insertInlineContent === "function") {
          (editor as any).insertInlineContent(substituicao);
        } else {
          document.execCommand("insertText", false, substituicao);
        }
      } catch {
        document.execCommand("insertText", false, substituicao);
      }
    }
  };

  const aoCopiar = (e: React.ClipboardEvent) => {
    const sel = window.getSelection()?.toString();
    if (sel) {
      const limpo = sel.replace(/\\+\s*(\n|$)/g, "$1");
      if (limpo !== sel) {
        e.clipboardData.setData("text/plain", limpo);
        e.preventDefault();
      }
    }
  };

  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const handleEditorChange = useCallback(async () => {
    try {
      const md = await editor.blocksToMarkdownLossy(editor.document);
      if (typeof md === "string") {
        const limpo = restaurarWikilinks(md);
        if (limpo !== ultimoMd.current) {
          ultimoMd.current = limpo;
          onChangeRef.current(limpo);
        }
      }
    } catch (err) {
      console.error("Erro ao converter blocos para markdown:", err);
    }
  }, [editor]);

  /**
   * Destaca as menções com a cor do tipo do item.
   *
   * Duas decisões que não são detalhe:
   *
   * 1. **Procura pelo TEXTO, não por `<a href>`.** A menção passou a ser
   *    gravada como texto puro (o formato de link apontava para um caminho
   *    relativo que dava 404). A versão anterior só sabia pintar elemento
   *    `<a>`, então depois daquela mudança nenhuma menção aparecia colorida.
   *
   * 2. **Usa a API de destaque do CSS, que não encosta no DOM.** Envolver o
   *    texto em `<span>` aqui dentro seria pedir briga com o ProseMirror (o
   *    motor do BlockNote): ele reescreve o conteúdo a cada tecla e trata
   *    elemento estranho como conteúdo do documento — o risco vai de perder o
   *    cursor a sujar o arquivo. `CSS.highlights` pinta intervalos por fora,
   *    sem alterar uma vírgula do documento.
   *
   * Onde a API não existe (navegador antigo), a menção fica sem cor e nada
   * mais muda — o texto e os links continuam funcionando igual.
   *
   * Este efeito precisa ficar ANTES do `return` de "Carregando editor…".
   * Um hook depois de um return antecipado muda a quantidade de hooks entre
   * um render e outro, e o React derruba o componente com "Rendered more
   * hooks than during the previous render" — o editor abria em branco.
   */
  useEffect(() => {
    if (!pronto) return;

    const realces = registroDeRealce();
    if (!realces) return;

    const container = document.querySelector(".notion-editor-wrapper");
    if (!container || alvos.length === 0) return;

    const semAcento = (s: string) =>
      s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

    // do título mais longo para o mais curto: "Grade suíça" tem que ganhar de
    // "Grade" quando os dois existem
    const porTamanho = [...alvos].sort(
      (a, b) => b.titulo.length - a.titulo.length,
    );

    const nomeDoRealce = (tipo: string) =>
      tipo === "tarefa"
        ? "sc-mencao-tarefa"
        : tipo === "meta" || tipo === "entrega"
          ? "sc-mencao-meta"
          : tipo === "referencia"
            ? "sc-mencao-referencia"
            : tipo === "lousa"
              ? "sc-mencao-lousa"
              : "sc-mencao-nota";

    const TIPOS = [
      "sc-mencao-tarefa",
      "sc-mencao-meta",
      "sc-mencao-referencia",
      "sc-mencao-lousa",
      "sc-mencao-nota",
    ];

    const pintar = () => {
      const faixas = new Map<string, Range[]>(TIPOS.map((t) => [t, []]));

      const caminhante = document.createTreeWalker(
        container,
        NodeFilter.SHOW_TEXT,
      );

      for (let no = caminhante.nextNode(); no; no = caminhante.nextNode()) {
        const texto = no.textContent ?? "";
        for (let i = texto.indexOf("@"); i >= 0; i = texto.indexOf("@", i + 1)) {
          // mesma guarda da expressão em links.ts: `@` grudado em letra,
          // número ou ponto é e-mail, não menção
          const anterior = i > 0 ? texto[i - 1] : "";
          if (anterior && /[\w.@-]/.test(anterior)) continue;

          const depoisDoArroba = texto.slice(i + 1);
          const achado = porTamanho.find(
            (a) =>
              semAcento(depoisDoArroba.slice(0, a.titulo.length)) ===
              semAcento(a.titulo),
          );
          if (!achado) continue;

          const faixa = document.createRange();
          faixa.setStart(no, i);
          faixa.setEnd(no, i + 1 + achado.titulo.length);
          faixas.get(nomeDoRealce(achado.tipo))!.push(faixa);

          i += achado.titulo.length; // não procura dentro do que já casou
        }
      }

      for (const [nome, lista] of faixas) {
        const realce = lista.length ? criarRealce(lista) : null;
        if (realce) realces.set(nome, realce);
        else realces.delete(nome);
      }
    };

    let timeoutId: any = null;
    const pintarDebounced = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        pintar();
      }, 250); // debounce de 250ms para não travar a digitação
    };

    pintar();
    const obs = new MutationObserver(pintarDebounced);
    obs.observe(container, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    return () => {
      obs.disconnect();
      if (timeoutId) clearTimeout(timeoutId);
      // o editor fechou: o destaque some junto, senão sobra intervalo
      // apontando para nó que não existe mais
      for (const nome of TIPOS) realces.delete(nome);
    };
  }, [pronto, alvos]);

  /**
   * Listener para cliques em menções (@ e [[alvo]]) dentro do editor.
   * Direciona o usuário para o documento / nota / tarefa correspondente.
   */
  useEffect(() => {
    const container = wrapperRef.current;
    if (!container) return;

    const lidarClique = (e: MouseEvent) => {
      // Ignora clique que não seja com botão primário (esquerdo)
      if (e.button !== 0) return;

      // Se o usuário estiver arrastando/selecionando texto, não dispara navegação
      const sel = window.getSelection();
      if (sel && sel.type === "Range" && !sel.isCollapsed && sel.toString().trim().length > 0) {
        return;
      }

      const mencao = encontrarMencaoNoPonto(e.clientX, e.clientY, container, alvosRef.current);
      if (mencao) {
        e.preventDefault();
        e.stopPropagation();

        if (aoAbrirMencao) {
          aoAbrirMencao(mencao);
        } else {
          abrirItemSpa(mencao.caminho);
        }
      }
    };

    const lidarMouseMove = (e: MouseEvent) => {
      const mencao = encontrarMencaoNoPonto(e.clientX, e.clientY, container, alvosRef.current);
      if (mencao) {
        container.style.cursor = "pointer";
        container.setAttribute("title", `Abrir @${mencao.titulo} (${mencao.tipo})`);
      } else {
        if (container.style.cursor === "pointer") {
          container.style.cursor = "";
          container.removeAttribute("title");
        }
      }
    };

    container.addEventListener("click", lidarClique, true);
    container.addEventListener("mousemove", lidarMouseMove);

    return () => {
      container.removeEventListener("click", lidarClique, true);
      container.removeEventListener("mousemove", lidarMouseMove);
      container.style.cursor = "";
      container.removeAttribute("title");
    };
  }, [aoAbrirMencao]);

  const [selecaoTexto, setSelecaoTexto] = useState<{ texto: string; x: number; y: number } | null>(null);

  useEffect(() => {
    const aoMudarSelecao = () => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || !sel.rangeCount) {
        setSelecaoTexto(null);
        return;
      }
      const txt = sel.toString().trim();
      if (txt.length < 3 || txt.length > 160 || txt.includes("\n\n")) {
        setSelecaoTexto(null);
        return;
      }
      const elAlvo = sel.anchorNode?.parentElement;
      if (!wrapperRef.current?.contains(elAlvo || null)) {
        setSelecaoTexto(null);
        return;
      }
      const range = sel.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) {
        setSelecaoTexto(null);
        return;
      }
      setSelecaoTexto({
        texto: txt,
        x: Math.max(16, rect.left + rect.width / 2),
        y: Math.max(10, rect.top - 36),
      });
    };

    document.addEventListener("selectionchange", aoMudarSelecao);
    return () => document.removeEventListener("selectionchange", aoMudarSelecao);
  }, []);

  const converterSelecaoEmTarefa = async (texto: string) => {
    try {
      const cfg = lerConfig();
      const todosItens = cache?.itens || [];
      const caminhoNovo = nomeLivre("tarefas", texto, todosItens.map((i) => i.caminho));

      const novaTarefa: Tarefa = {
        caminho: caminhoNovo,
        sha: "",
        bruto: {},
        titulo: texto,
        status: "a-fazer",
        tags: [],
        corpo: "",
        relacionamentos: [],
      };
      const { dados, corpo: corpoTarefa } = tarefaParaArquivo(novaTarefa);
      const md = escreverMarkdown({ dados, corpo: corpoTarefa });
      await gravar(cfg, caminhoNovo, md, `criar tarefa: ${texto}`);
      invalidarCache();
      dispararAtualizacaoAcervo();

      document.execCommand("insertText", false, `@${texto} `);
      setSelecaoTexto(null);
      toast(`Tarefa "${texto}" criada no Kanban!`);
    } catch (e: any) {
      toast(`Erro ao criar tarefa: ${e?.message || e}`, { tipo: "erro" });
    }
  };

  return (
    <div
      ref={wrapperRef}
      id="conteudo-nota-pdf"
      className={cn(
        modoZen
          ? "fixed inset-0 z-50 bg-background overflow-y-auto p-4 sm:p-12 notion-editor-wrapper animate-in fade-in"
          : "notion-editor-wrapper min-h-[300px] relative"
      )}
      onPaste={aoColar}
      onCopy={aoCopiar}
    >
      {selecaoTexto && (
        <div
          style={{
            position: "fixed",
            left: `${selecaoTexto.x}px`,
            top: `${selecaoTexto.y}px`,
            transform: "translateX(-50%)",
            zIndex: 10000,
          }}
          className="animate-in fade-in zoom-in-95 duration-100"
        >
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              converterSelecaoEmTarefa(selecaoTexto.texto);
            }}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-card/95 text-foreground text-xs font-semibold shadow-lg border border-border/80 backdrop-blur hover:bg-accent hover:scale-105 active:scale-95 transition-all cursor-pointer select-none"
          >
            <CheckSquare size={13} className="text-emerald-500 shrink-0" />
            <span>Criar Tarefa</span>
          </button>
        </div>
      )}
      {!pronto && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-card/60 backdrop-blur-xs text-xs text-muted-foreground animate-pulse">
          Carregando editor…
        </div>
      )}
      <BlockNoteView
        editor={editor}
        editable={editable}
        theme={escuro ? "dark" : "light"}
        slashMenu={false}
        onChange={handleEditorChange}
      >
        {/* `@` é o gatilho principal. `[` continua atendido porque quem já
            escrevia `[[` no app antigo tenta de novo por reflexo. */}
        <SuggestionMenuController
          triggerCharacter="@"
          getItems={handleGetItems}
        />
        <SuggestionMenuController
          triggerCharacter="["
          getItems={handleGetItems}
        />
        {/* `/` é o menu de comandos e IA rápida */}
        <SuggestionMenuController
          triggerCharacter="/"
          getItems={handleGetSlashItems}
        />
      </BlockNoteView>

      {/* Rodapé Inteligente do Editor: Estatísticas, Sumário, Modo Zen e Imprimir */}
      <div className="flex items-center justify-between gap-2 pt-3 pb-1 border-t border-border/40 text-[11px] text-muted-foreground mt-4 select-none px-2 sm:px-6 no-print">
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <span title="Total de palavras">{estatisticas.palavras} palavras</span>
          <span>•</span>
          <span title="Total de caracteres">{estatisticas.caracteres} caracteres</span>
          <span className="hidden sm:inline">•</span>
          <span className="hidden sm:inline" title="Tempo estimado de leitura">~{estatisticas.minutosLeitura} min de leitura</span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {sumario.length > 0 && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setMostrarSumario(!mostrarSumario)}
                className="flex items-center gap-1 px-2 py-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                title="Ver sumário de títulos da nota"
              >
                <ListOrdered size={13} />
                <span className="hidden sm:inline">Sumário ({sumario.length})</span>
              </button>
              {mostrarSumario && (
                <div className="absolute right-0 bottom-full mb-2 w-64 max-h-60 overflow-y-auto rounded-xl border border-border bg-card p-3 shadow-xl z-50 animate-in fade-in zoom-in-95">
                  <div className="flex items-center justify-between pb-1.5 border-b border-border/60 mb-2 font-semibold text-xs text-foreground">
                    <span>Sumário de Títulos</span>
                    <button type="button" onClick={() => setMostrarSumario(false)} className="text-muted-foreground hover:text-foreground cursor-pointer">✕</button>
                  </div>
                  <div className="space-y-1">
                    {sumario.map((item, idx) => (
                      <div
                        key={idx}
                        className={cn(
                          "truncate text-xs py-0.5 hover:text-primary transition-colors cursor-pointer",
                          item.nivel === 1 ? "font-semibold text-foreground" : item.nivel === 2 ? "pl-2 text-muted-foreground" : "pl-4 text-muted-foreground/80"
                        )}
                        onClick={() => setMostrarSumario(false)}
                      >
                        {item.texto}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-1 px-2 py-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            title="Imprimir nota ou salvar como PDF limpo"
          >
            <Printer size={13} />
            <span className="hidden sm:inline">Imprimir PDF</span>
          </button>

          <button
            type="button"
            onClick={() => setModoZen(!modoZen)}
            className="flex items-center gap-1 px-2 py-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            title={modoZen ? "Sair do modo tela cheia" : "Modo Zen / Foco em tela cheia"}
          >
            {modoZen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
            <span className="hidden sm:inline">{modoZen ? "Sair do Foco" : "Modo Foco"}</span>
          </button>
        </div>
      </div>

      <ModalLembrete
        aberto={modalLembreteAberto}
        aoFechar={() => setModalLembreteAberto(false)}
        aoSalvar={(titulo, dataHora) => {
          const tag = formatarTagLembrete(titulo, dataHora);
          editor.insertInlineContent([`${tag} `]);
        }}
      />

      <ModalIADocumento
        aberto={modalIAAberto}
        posicao={posicaoIA}
        aoFechar={() => setModalIAAberto(false)}
        aoColarNoDocumento={colarTextoIA}
      />
      <style>{`
        .notion-editor-wrapper .bn-container { font-family: inherit; }
        .notion-editor-wrapper .bn-editor { padding-left: 0; padding-right: 0; }
        @media (min-width: 640px) {
          .notion-editor-wrapper .bn-editor { padding-left: 24px; padding-right: 24px; }
        }

        /* Sobrescreve as cores de bloco e seleção do BlockNote para tons suaves e discretos */
        .notion-editor-wrapper,
        .bn-root {
          --bn-colors-selected-background: hsl(var(--primary) / 0.12) !important;
          --bn-colors-selected-text: inherit !important;
          --bn-colors-hovered-background: hsl(var(--muted) / 0.7) !important;
          --bn-colors-hovered-text: inherit !important;
        }
        .dark .notion-editor-wrapper,
        .dark .bn-root {
          --bn-colors-selected-background: hsl(var(--primary) / 0.25) !important;
          --bn-colors-selected-text: inherit !important;
          --bn-colors-hovered-background: hsl(var(--accent) / 0.6) !important;
          --bn-colors-hovered-text: inherit !important;
          --bn-colors-editor-background: transparent;
          --bn-colors-editor-text: var(--foreground);
        }

        /* Seleção de texto no editor de notas: suave e translúcida, sem contraste preto agressivo */
        .notion-editor-wrapper ::selection,
        .bn-editor ::selection {
          background-color: hsl(var(--primary) / 0.18) !important;
          color: inherit !important;
        }
        .dark .notion-editor-wrapper ::selection,
        .dark .bn-editor ::selection {
          background-color: hsl(var(--primary) / 0.3) !important;
          color: inherit !important;
        }

        /* Destaque suave em nós selecionados do ProseMirror */
        .bn-block-content.ProseMirror-selectednode > *::after,
        .ProseMirror-selectednode > .bn-block-content > *::after,
        .bn-block-content .ProseMirror-selectednode::after,
        .bn-inline-content .ProseMirror-selectednode::after {
          background-color: hsl(var(--primary) / 0.08) !important;
          box-shadow: inset 0 0 0 2px hsl(var(--primary) / 0.2) !important;
        }

        /* Item ativo no menu de sugestões (Slash "/" e Menções "@") */
        .bn-mantine .bn-suggestion-menu-item[aria-selected="true"],
        .bn-suggestion-menu-item[aria-selected="true"] {
          background-color: hsl(var(--accent) / 0.8) !important;
          color: hsl(var(--foreground)) !important;
        }
        .bn-mantine .bn-suggestion-menu-item[aria-selected="true"] .bn-mt-suggestion-menu-item-title,
        .bn-suggestion-menu-item[aria-selected="true"] .bn-mt-suggestion-menu-item-title {
          color: hsl(var(--foreground)) !important;
        }

        /* Botões ativos na barra de ferramentas sem fundo preto sólido */
        .bn-toolbar .mantine-Button-root[data-selected],
        .bn-toolbar .mantine-ActionIcon-root[data-selected],
        .bn-action-toolbar .mantine-Button-root[data-selected],
        .bn-action-toolbar .mantine-ActionIcon-root[data-selected] {
          background-color: hsl(var(--primary) / 0.12) !important;
          color: hsl(var(--foreground)) !important;
        }
        .notion-editor-wrapper a {
          color: #3b82f6;
          font-weight: 600;
          text-decoration: none !important;
          padding: 1px 6px;
          border-radius: 6px;
          cursor: pointer;
          transition: background-color 0.15s ease;
        }

        /* Cores das menções, por tipo do item.
           O seletor ::highlight aceita só cor, fundo e sublinhado — nada de
           borda ou arredondamento. Por isso a menção fica com uma tarja
           colorida em vez da "pílula" de antes. */
        ::highlight(sc-mencao-tarefa) {
          color: #1d4ed8;
          background-color: rgba(37, 99, 235, 0.16);
        }
        ::highlight(sc-mencao-meta) {
          color: #047857;
          background-color: rgba(5, 150, 105, 0.16);
        }
        ::highlight(sc-mencao-nota) {
          color: #b45309;
          background-color: rgba(217, 119, 6, 0.16);
        }
        ::highlight(sc-mencao-referencia) {
          color: #6d28d9;
          background-color: rgba(124, 58, 237, 0.16);
        }
        ::highlight(sc-mencao-lousa) {
          color: #4f46e5;
          background-color: rgba(79, 70, 229, 0.16);
        }

        /* No escuro o texto precisa clarear, senão some no fundo */
        .dark ::highlight(sc-mencao-tarefa) {
          color: #a6e3a1;
          background-color: rgba(166, 227, 161, 0.2);
        }
        .dark ::highlight(sc-mencao-meta) {
          color: #fab387;
          background-color: rgba(250, 179, 135, 0.2);
        }
        .dark ::highlight(sc-mencao-nota) {
          color: #89b4fa;
          background-color: rgba(137, 180, 250, 0.2);
        }
        .dark ::highlight(sc-mencao-referencia) {
          color: #cba6f7;
          background-color: rgba(203, 166, 247, 0.2);
        }
        .dark ::highlight(sc-mencao-lousa) {
          color: #89dceb;
          background-color: rgba(137, 220, 235, 0.2);
        }

        /* Correção de rolagem completa do Menu Slash "/" e "@" */
        .bn-mantine .bn-suggestion-menu,
        .bn-suggestion-menu,
        .bn-grid-suggestion-menu {
          max-height: min(320px, 50vh) !important;
          height: auto !important;
          overflow-y: auto !important;
          overflow-x: hidden !important;
          overscroll-behavior: contain !important;
          padding: 6px 4px 16px 4px !important;
          scroll-behavior: smooth !important;
          box-sizing: border-box !important;
        }

        .bn-mantine .bn-suggestion-menu > *:last-child,
        .bn-suggestion-menu > *:last-child {
          margin-bottom: 12px !important;
        }

        .bn-popover,
        .tippy-box,
        [data-floating-ui-portal] {
          max-height: min(360px, 75vh) !important;
          overflow: visible !important;
        }
      `}</style>
    </div>
  );
}
