import { useEffect, useState } from "react";
import { BlockNoteView } from "@blocknote/mantine";
import { useCreateBlockNote } from "@blocknote/react";
import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";
import { restaurarWikilinks } from "@/lib/markdown";

/**
 * Editor de texto rico que lê e escreve Markdown.
 *
 * Três cuidados que não são opcionais aqui:
 *
 * 1. **Os `[[links]]` são desescapados na saída.** O serializador do BlockNote
 *    grava `\[\[Briefing]]`, o que sujava o arquivo no repositório E fazia o
 *    app parar de reconhecer o link.
 * 2. **O tema acompanha o app.** Estava fixo em "light", então escrever no
 *    modo escuro era uma placa branca no meio da tela.
 * 3. **O editor não estoura o cartão no celular.** Tinha margem negativa de
 *    80px, que transbordava o modal numa tela de 360px.
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
    const blocos = editor.tryParseMarkdownToBlocks(markdown || "");
    editor.replaceBlocks(editor.document, blocos);
    setPronto(true);
    // Só na montagem: re-sincronizar a cada tecla digitada faria o cursor
    // saltar. Ver AGENTS.md sobre editar o corpo por fora enquanto isto abre.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!pronto) {
    return (
      <div className="animate-pulse p-4 text-sm text-muted-foreground">
        Carregando editor…
      </div>
    );
  }

  return (
    <div className="notion-editor-wrapper min-h-[300px]">
      <BlockNoteView
        editor={editor}
        editable={editable}
        theme={escuro ? "dark" : "light"}
        onChange={() => {
          // síncrono nesta versão do BlockNote — sem corrida de retorno tardio
          onChange(restaurarWikilinks(editor.blocksToMarkdownLossy(editor.document)));
        }}
      />
      <style>{`
        .notion-editor-wrapper .bn-container { font-family: inherit; }
        .notion-editor-wrapper .bn-editor { padding-left: 0; padding-right: 0; }
        /* No celular o editor tinha margem negativa e estourava o cartão */
        @media (min-width: 640px) {
          .notion-editor-wrapper .bn-editor { padding-left: 24px; padding-right: 24px; }
        }
        .dark .notion-editor-wrapper {
          --bn-colors-editor-background: transparent;
          --bn-colors-editor-text: var(--foreground);
        }
      `}</style>
    </div>
  );
}
