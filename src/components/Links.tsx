import { useNavigate } from "react-router-dom";
import { Link2, CornerUpLeft } from "lucide-react";
import { type Mencao } from "@/lib/links";
import { ROTULO_TIPO, ROTA_TIPO } from "@/lib/busca";
import { Selo } from "@/components/ui";

const CORES_TIPO: Record<string, { texto: string; bg: string; borda: string }> = {
  tarefa: {
    texto: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-500/10 hover:bg-blue-500/20",
    borda: "border-blue-500/20",
  },
  meta: {
    texto: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-500/10 hover:bg-emerald-500/20",
    borda: "border-emerald-500/20",
  },
  nota: {
    texto: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-500/10 hover:bg-amber-500/20",
    borda: "border-amber-500/20",
  },
  referencia: {
    texto: "text-purple-600 dark:text-purple-400",
    bg: "bg-purple-500/10 hover:bg-purple-500/20",
    borda: "border-purple-500/20",
  },
  lousa: {
    texto: "text-indigo-600 dark:text-indigo-400",
    bg: "bg-indigo-500/10 hover:bg-indigo-500/20",
    borda: "border-indigo-500/20",
  },
};

/**
 * "Mencionado em" — quem aponta para o item aberto.
 *
 * Exibe cada referência ligada no formato `@ Nome do Item`.
 */
export function MencionadoEm({
  mencoes,
  aoAbrir,
}: {
  mencoes: Mencao[];
  aoAbrir?: (caminho: string) => void;
}) {
  const navegar = useNavigate();
  if (mencoes.length === 0) return null;

  return (
    <div className="rounded-xl border border-border/80 bg-secondary/30 p-4">
      <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        <CornerUpLeft size={13} />
        Mencionado em {mencoes.length}{" "}
        {mencoes.length > 1 ? "lugares" : "lugar"}
      </p>
      <ul className="mt-3 space-y-2">
        {mencoes.map((m) => {
          const estilo = CORES_TIPO[m.tipo] || CORES_TIPO.tarefa;
          return (
            <li key={m.caminho}>
              <button
                onClick={() =>
                  aoAbrir ? aoAbrir(m.caminho) : navegar(`${ROTA_TIPO[m.tipo]}?abrir=${encodeURIComponent(m.caminho)}`)
                }
                className="w-full text-left rounded-lg p-2.5 hover:bg-accent/60 transition-colors border border-transparent hover:border-border/60"
              >
                <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2 py-0.5 rounded-md ${estilo.texto} ${estilo.bg}`}>
                  <Link2 size={12} className="shrink-0" />
                  <span>@{m.titulo}</span>
                  <Selo>{ROTULO_TIPO[m.tipo]}</Selo>
                </span>
                {m.trecho && (
                  <span className="mt-1 line-clamp-1 block text-xs text-muted-foreground pl-1">
                    {m.trecho}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
