import { useEffect, useRef, useState } from "react";
import { BlockNoteView } from "@blocknote/mantine";
import { SuggestionMenuController, useCreateBlockNote } from "@blocknote/react";
import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";
import { lerConfig } from "@/lib/settings";
import { carregarRepo } from "@/lib/repo";
import { montarIndice, alvosUnicos, filtrarAlvos, type Alvo } from "@/lib/links";
import { restaurarWikilinks } from "@/lib/markdown";

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
 * Editor de texto rico que lê e escreve Markdown.
 */
export function EditorNotion({
  markdown,
  onChange,
  editable = true,
}: {
  markdown: string;
  onChange: (markdown: string) => void;
  editable?: boolean;
}) {
  const [pronto, setPronto] = useState(false);
  const [escuro, setEscuro] = useState(
    () => document.documentElement.classList.contains("dark"),
  );

  const editor = useCreateBlockNote();
  const ultimoMd = useRef(markdown);

  /**
   * Itens que o menu do `@` oferece.
   *
   * Carregados UMA vez, quando o editor abre. A versão anterior chamava
   * `carregarRepo` dentro do `getItems`, ou seja, a cada tecla digitada
   * depois do `@` — com o cache de 5s vencido no meio da digitação, isso
   * virava uma ida à rede buscando o repositório inteiro enquanto você
   * escrevia o nome.
   */
  const [alvos, setAlvos] = useState<Alvo[]>([]);

  useEffect(() => {
    let cancelado = false;
    carregarRepo(lerConfig(), { memoria: 30_000 })
      .then((todos) => {
        if (cancelado) return;
        const indice = montarIndice(todos);
        setAlvos(alvosUnicos(indice));
      })
      // sem conexão ou sem token, o menu simplesmente não sugere nada —
      // não é motivo para derrubar o editor
      .catch(() => {});
    return () => {
      cancelado = true;
    };
  }, []);

  /** Monta os itens do menu a partir do que já está em memória. */
  const itensDoMenu = (query: string) =>
    filtrarAlvos(alvos, query).map((s) => ({
      title: `@${s.titulo}`,
      subtext: s.caminho,
      onItemClick: () => {
        editor.insertInlineContent([
          { type: "link", href: s.caminho, content: `@${s.titulo}` },
        ]);
      },
    }));

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
    if (pronto && markdown === ultimoMd.current) return;
    ultimoMd.current = markdown;
    const blocos = editor.tryParseMarkdownToBlocks(markdown || "");
    editor.replaceBlocks(editor.document, blocos);
    setPronto(true);
  }, [editor, markdown, pronto]);

  const aoColar = (e: React.ClipboardEvent) => {
    const raw = e.clipboardData.getData("text/plain");
    const substituicao = formatarTextoAoColar(raw);
    if (substituicao) {
      e.preventDefault();
      document.execCommand("insertText", false, substituicao);
    }
  };

  /**
   * Destaca as menções com a cor do tipo do item.
   *
   * Este efeito precisa ficar ANTES do `return` de "Carregando editor…".
   * Um hook depois de um return antecipado muda a quantidade de hooks entre
   * um render e outro, e o React derruba o componente com "Rendered more
   * hooks than during the previous render" — o editor abria em branco.
   */
  useEffect(() => {
    if (!pronto) return;
    const container = document.querySelector(".notion-editor-wrapper");
    if (!container) return;

    const aplicarCoresMencoes = () => {
      const links = container.querySelectorAll("a");
      links.forEach((a) => {
        const href = a.getAttribute("href") || "";
        if (href.includes("tarefa")) {
          a.style.color = "#2563eb";
          a.style.backgroundColor = "rgba(37, 99, 235, 0.14)";
          a.style.border = "1px solid rgba(37, 99, 235, 0.25)";
          a.style.borderRadius = "6px";
          a.style.padding = "1px 6px";
          a.style.fontWeight = "600";
        } else if (href.includes("pdi") || href.includes("meta")) {
          a.style.color = "#059669";
          a.style.backgroundColor = "rgba(5, 150, 105, 0.14)";
          a.style.border = "1px solid rgba(5, 150, 105, 0.25)";
          a.style.borderRadius = "6px";
          a.style.padding = "1px 6px";
          a.style.fontWeight = "600";
        } else if (href.includes("nota")) {
          a.style.color = "#d97706";
          a.style.backgroundColor = "rgba(217, 119, 6, 0.14)";
          a.style.border = "1px solid rgba(217, 119, 6, 0.25)";
          a.style.borderRadius = "6px";
          a.style.padding = "1px 6px";
          a.style.fontWeight = "600";
        } else if (href.includes("referencia")) {
          a.style.color = "#7c3aed";
          a.style.backgroundColor = "rgba(124, 58, 237, 0.14)";
          a.style.border = "1px solid rgba(124, 58, 237, 0.25)";
          a.style.borderRadius = "6px";
          a.style.padding = "1px 6px";
          a.style.fontWeight = "600";
        }
      });
    };

    aplicarCoresMencoes();
    const obs = new MutationObserver(aplicarCoresMencoes);
    obs.observe(container, { childList: true, subtree: true });
    return () => obs.disconnect();
  }, [pronto]);

  if (!pronto) {
    return (
      <div className="animate-pulse p-4 text-sm text-muted-foreground">
        Carregando editor…
      </div>
    );
  }

  return (
    <div className="notion-editor-wrapper min-h-[300px]" onPaste={aoColar}>
      <BlockNoteView
        editor={editor}
        editable={editable}
        theme={escuro ? "dark" : "light"}
        onChange={() => {
          // `restaurarWikilinks` NÃO é opcional aqui. O serializador do
          // BlockNote grava `\[\[Briefing]]` com os colchetes escapados: o
          // arquivo fica sujo no GitHub e o app deixa de reconhecer o link.
          // Sem esta linha, toda nota antiga que você ABRISSE e salvasse
          // perdia os `[[links]]` que já tinha.
          const limpo = restaurarWikilinks(
            editor.blocksToMarkdownLossy(editor.document),
          );
          ultimoMd.current = limpo;
          onChange(limpo);
        }}
      >
        {/* `@` é o gatilho principal. `[` continua atendido porque quem já
            escrevia `[[` no app antigo tenta de novo por reflexo. */}
        <SuggestionMenuController
          triggerCharacter="@"
          getItems={async (query) => itensDoMenu(query)}
        />
        <SuggestionMenuController
          triggerCharacter="["
          getItems={async (query) => itensDoMenu(query)}
        />
      </BlockNoteView>
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
      `}</style>
    </div>
  );
}
