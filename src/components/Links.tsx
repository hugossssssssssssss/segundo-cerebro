import { useNavigate } from "react-router-dom";
import { Link2, CornerUpLeft } from "lucide-react";
import { type Mencao } from "@/lib/links";
import { ROTULO_TIPO, ROTA_TIPO } from "@/lib/busca";
import { Selo } from "@/components/ui";

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
        {mencoes.map((m) => (
          <li key={m.caminho}>
            <button
              onClick={() =>
                aoAbrir ? aoAbrir(m.caminho) : navegar(`${ROTA_TIPO[m.tipo]}?abrir=${encodeURIComponent(m.caminho)}`)
              }
              className="w-full text-left rounded-lg p-2 hover:bg-accent/60 transition-colors border border-transparent hover:border-border/60"
            >
              <span className="flex items-center gap-1.5 text-sm font-semibold text-primary">
                <Link2 size={13} className="shrink-0 text-muted-foreground" />
                <span>@{m.titulo}</span>
                <Selo>{ROTULO_TIPO[m.tipo]}</Selo>
              </span>
              {m.trecho && (
                <span className="mt-1 line-clamp-1 block text-xs text-muted-foreground">
                  {m.trecho}
                </span>
              )}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
