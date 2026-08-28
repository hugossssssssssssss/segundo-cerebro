import React from "react";
import { ChevronRight, Search, Folder } from "lucide-react";
import { useWorkspace } from "./WorkspaceContext";
import { formatarNomeAmigavel, formatarTituloAmigavel, formatarAtalho } from "@/lib/utils";

interface WorkspaceBreadcrumbsProps {
  caminho?: string;
  titulo?: string;
}

export function WorkspaceBreadcrumbs({ caminho, titulo }: WorkspaceBreadcrumbsProps) {
  const { setBuscaGlobalAberta } = useWorkspace();

  const partes = React.useMemo(() => {
    if (!caminho) return ["Workspace", formatarTituloAmigavel(titulo, "Novo Documento")];

    const pedacos = caminho.split("/").filter(Boolean);
    const pastaRaiz = pedacos[0] || "documento";
    const nomeAmigavelPasta: Record<string, string> = {
      notas: "Notas",
      tarefas: "Tarefas",
      pdi: "PDI",
      metas: "Metas",
      entregas: "Entregas",
      referencias: "Referências",
      lousas: "Lousas",
      contatos: "Contatos",
    };

    const raizFormatada = nomeAmigavelPasta[pastaRaiz.toLowerCase()] || formatarNomeAmigavel(pastaRaiz);
    const subpastas = pedacos.slice(1, -1).map((s) => formatarNomeAmigavel(s));
    const nomeDoc = formatarTituloAmigavel(titulo, pedacos[pedacos.length - 1]);

    return [raizFormatada, ...subpastas, nomeDoc];
  }, [caminho, titulo]);

  return (
    <div
      onClick={() => setBuscaGlobalAberta(true)}
      role="button"
      tabIndex={0}
      className="group flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-accent/70 cursor-pointer transition-all select-none border border-transparent hover:border-border/60 max-w-full overflow-hidden"
      title={`Clique para pesquisar ou alternar documento (${formatarAtalho("⌘K")})`}
    >
      <Folder size={13} className="text-primary/70 shrink-0 group-hover:text-primary transition-colors" />

      <div className="flex items-center gap-1 min-w-0 truncate">
        {partes.map((parte, idx) => (
          <React.Fragment key={idx}>
            {idx > 0 && <ChevronRight size={12} className="opacity-40 shrink-0" />}
            <span
              className={
                idx === partes.length - 1
                  ? "font-semibold text-foreground truncate"
                  : "truncate opacity-80"
              }
            >
              {parte}
            </span>
          </React.Fragment>
        ))}
      </div>

      <div className="ml-auto flex items-center gap-1 text-[11px] text-muted-foreground/60 group-hover:text-primary transition-colors pl-2 shrink-0">
        <Search size={12} />
        <span className="hidden sm:inline font-mono">{formatarAtalho("⌘K")}</span>
      </div>
    </div>
  );
}
