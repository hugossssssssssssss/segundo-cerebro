import { useNavigate } from "react-router-dom";
import { Link2, CornerUpLeft } from "lucide-react";
import { type Mencao } from "@/lib/links";
import { ROTULO_TIPO, ROTA_TIPO } from "@/lib/busca";
import { Selo } from "@/components/ui";

/**
 * "Mencionado em" — quem aponta para o item aberto.
 *
 * É o mesmo dado dos `[[links]]` lido ao contrário, e é onde mora metade do
 * valor: abrir uma nota e descobrir que três entregas a mencionam é a conexão
 * aparecendo sozinha, sem você ter ido procurar.
 *
 * Aqui existia também um campo de texto com autocompletar de `[[`, e um
 * renderizador de links clicáveis. Ambos saíram quando o corpo passou a ser
 * editado pelo BlockNote: trazer o autocompletar de volta hoje significa
 * escrever uma extensão do editor, não um componente de textarea.
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
    <div className="rounded-lg border border-border bg-secondary/40 p-3">
      <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <CornerUpLeft size={13} />
        Mencionado em {mencoes.length}{" "}
        {mencoes.length > 1 ? "lugares" : "lugar"}
      </p>
      <ul className="mt-2 space-y-1.5">
        {mencoes.map((m) => (
          <li key={m.caminho}>
            <button
              onClick={() =>
                aoAbrir ? aoAbrir(m.caminho) : navegar(ROTA_TIPO[m.tipo])
              }
              className="w-full text-left"
            >
              <span className="flex items-center gap-1.5 text-sm font-medium hover:text-primary">
                <Link2 size={12} className="shrink-0 text-muted-foreground" />
                {m.titulo}
                <Selo>{ROTULO_TIPO[m.tipo]}</Selo>
              </span>
              {m.trecho && (
                <span className="mt-0.5 line-clamp-1 block text-xs text-muted-foreground">
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
