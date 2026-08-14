import { useEffect, useState } from "react";
import { BlockNoteView } from "@blocknote/mantine";
import { useCreateBlockNote } from "@blocknote/react";
import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";

export function EditorNotion({
  markdown,
  onChange,
  editable = true,
}: {
  markdown: string;
  onChange: (markdown: string) => void;
  editable?: boolean;
}) {
  const [initialContent, setInitialContent] = useState<any | "loading">("loading");

  const editor = useCreateBlockNote({
    // We can pass initialContent here, but since it's async from markdown, we'll wait for it
  });

  useEffect(() => {
    async function load() {
      const blocks = await editor.tryParseMarkdownToBlocks(markdown || "");
      editor.replaceBlocks(editor.document, blocks);
      setInitialContent("loaded");
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  if (initialContent === "loading") {
    return <div className="p-4 text-muted-foreground animate-pulse text-sm">Carregando editor...</div>;
  }

  return (
    <div className="notion-editor-wrapper -mx-10 min-h-[400px]">
      <BlockNoteView
        editor={editor}
        editable={editable}
        theme="light" // or "dark", you can sync with context later
        onChange={async () => {
          const md = await editor.blocksToMarkdownLossy(editor.document);
          onChange(md);
        }}
      />
      <style>{`
        .notion-editor-wrapper .bn-container {
          font-family: inherit;
        }
        .notion-editor-wrapper .bn-editor {
          padding-left: 40px;
          padding-right: 40px;
        }
        .dark .notion-editor-wrapper {
          --bn-colors-editor-background: transparent;
          --bn-colors-editor-text: var(--foreground);
        }
      `}</style>
    </div>
  );
}
