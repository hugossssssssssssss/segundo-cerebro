import { useEffect, useRef, useState, useCallback } from "react";
import { BlockNoteView } from "@blocknote/mantine";
import { SuggestionMenuController, useCreateBlockNote } from "@blocknote/react";
import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";
import { lerConfig } from "@/lib/settings";
import { carregarRepo, type ItemRepo } from "@/lib/repo";
import { montarIndice, alvosUnicos, filtrarAlvos, type Alvo } from "@/lib/links";
import { restaurarWikilinks } from "@/lib/markdown";
import { formatarTagLembrete } from "@/lib/inbox";
import { ModalLembrete } from "./ModalLembrete";

/**
 * Auxiliar para converter URLs coladas do tipo ?abrir=caminho ou [[alvo]] em @ Nome do Item
 */
export function formatarTextoAoColar(texto: string): string | null {
  if (!texto) return null;

  // Se for URL com ?abrir=...
  const matchUrl = texto.match(/(?:https?:\/\/[^\s)]+|#\/[^\s)]+)\?abrir=([a-zA-Z0-9_%.-]+)/);
  if (matchUrl) {
    const dec = decodeURIComponent(matchUrl[1]);
    const nomeOuTitulo = dec.split("/").pop()!.replace(/^\d{4}-\d{2}-\d{2}-/, "").replace(/\.md$/, "");
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
}: {
  markdown: string;
  onChange: (markdown: string) => void;
  editable?: boolean;
  acervo?: ItemRepo[];
  alvosOverride?: Alvo[];
}) {
  const [pronto, setPronto] = useState(false);
  const [escuro, setEscuro] = useState(
    () => document.documentElement.classList.contains("dark"),
  );

  const editor = useCreateBlockNote();
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

  const alvosRef = useRef(alvos);
  useEffect(() => {
    alvosRef.current = alvos;
  }, [alvos]);

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
          : s.caminho.startsWith("processos/")
          ? "🔄 Processo / CRM"
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

  useEffect(() => {
    let cancelado = false;

    async function atualizarBlocos() {
      if (markdown === ultimoMd.current && pronto) return;
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
      document.execCommand("insertText", false, substituicao);
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

    pintar();
    const obs = new MutationObserver(pintar);
    obs.observe(container, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    return () => {
      obs.disconnect();
      // o editor fechou: o destaque some junto, senão sobra intervalo
      // apontando para nó que não existe mais
      for (const nome of TIPOS) realces.delete(nome);
    };
  }, [pronto, alvos]);

  return (
    <div className="notion-editor-wrapper min-h-[300px] relative" onPaste={aoColar} onCopy={aoCopiar}>
      {!pronto && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-card/60 backdrop-blur-xs text-xs text-muted-foreground animate-pulse">
          Carregando editor…
        </div>
      )}
      <BlockNoteView
        editor={editor}
        editable={editable}
        theme={escuro ? "dark" : "light"}
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
      </BlockNoteView>

      <ModalLembrete
        aberto={modalLembreteAberto}
        aoFechar={() => setModalLembreteAberto(false)}
        aoSalvar={(titulo, dataHora) => {
          const tag = formatarTagLembrete(titulo, dataHora);
          editor.insertInlineContent([`${tag} `]);
        }}
      />
      <style>{`
        .notion-editor-wrapper .bn-container { font-family: inherit; }
        .notion-editor-wrapper .bn-editor { padding-left: 0; padding-right: 0; }
        @media (min-width: 640px) {
          .notion-editor-wrapper .bn-editor { padding-left: 24px; padding-right: 24px; }
        }
        .dark .notion-editor-wrapper {
          --bn-colors-editor-background: transparent;
          --bn-colors-editor-text: var(--foreground);
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
      `}</style>
    </div>
  );
}
