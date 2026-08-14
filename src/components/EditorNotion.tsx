import { useEffect, useRef, useState } from "react";
import { BlockNoteView } from "@blocknote/mantine";
import { SuggestionMenuController, useCreateBlockNote } from "@blocknote/react";
import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";
import { restaurarWikilinks } from "@/lib/markdown";
import { lerConfig } from "@/lib/settings";
import { carregarRepo } from "@/lib/repo";
import { montarIndice, sugerir } from "@/lib/links";

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
          const mdBruto = editor.blocksToMarkdownLossy(editor.document);
          const limpo = restaurarWikilinks(mdBruto);
          
          if (limpo !== mdBruto) {
            try {
              const blocos = editor.tryParseMarkdownToBlocks(limpo);
              editor.replaceBlocks(editor.document, blocos);
            } catch {
              // ignora se a re-análise falhar
            }
          }

          ultimoMd.current = limpo;
          onChange(limpo);
        }}
      >
        <SuggestionMenuController
          triggerCharacter="@"
          getItems={async (query) => {
            try {
              const cfg = lerConfig();
              const todos = await carregarRepo(cfg, { memoria: 5000 });
              const idx = montarIndice(todos);
              const sugestoes = sugerir(idx, query);
              return sugestoes.map((s) => ({
                title: `@${s.titulo}`,
                subtext: s.caminho,
                onItemClick: () => {
                  editor.insertInlineContent([`@${s.titulo}`]);
                },
              }));
            } catch {
              return [];
            }
          }}
        />
        <SuggestionMenuController
          triggerCharacter="["
          getItems={async (query) => {
            try {
              const cfg = lerConfig();
              const todos = await carregarRepo(cfg, { memoria: 5000 });
              const idx = montarIndice(todos);
              const sugestoes = sugerir(idx, query);
              return sugestoes.map((s) => ({
                title: `@${s.titulo}`,
                subtext: s.caminho,
                onItemClick: () => {
                  editor.insertInlineContent([`@${s.titulo}`]);
                },
              }));
            } catch {
              return [];
            }
          }}
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
          font-weight: 500;
          text-decoration: underline;
          cursor: pointer;
        }
      `}</style>
    </div>
  );
}
