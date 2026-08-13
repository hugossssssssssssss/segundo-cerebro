import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Link2, CornerUpLeft } from "lucide-react";
import { extrairLinks, sugerir, type Alvo, type Mencao } from "@/lib/links";
import { ROTULO_TIPO, ROTA_TIPO } from "@/lib/busca";
import { AreaTexto, Selo } from "@/components/ui";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------ texto com links */

/**
 * Mostra um texto trocando `[[isto]]` por algo clicável.
 *
 * Link para item que ainda não existe fica com traço pontilhado — é um
 * marcador útil ("isso merece uma nota um dia"), não um erro.
 */
export function TextoComLinks({
  texto,
  indice,
  aoAbrir,
  className,
}: {
  texto: string;
  indice: Map<string, Alvo>;
  /** Se não vier, clicar navega para a aba do tipo */
  aoAbrir?: (alvo: Alvo) => void;
  className?: string;
}) {
  const navegar = useNavigate();
  const partes = useMemo(() => {
    const links = extrairLinks(texto, indice);
    if (links.length === 0) return null;

    // recorta o texto em volta de cada [[...]]
    const pedacos: (string | { bruto: string; exibir: string; alvo: Alvo | null })[] = [];
    let resto = texto;

    for (const l of links) {
      const marca = new RegExp(
        `\\[\\[${l.bruto.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(\\|[^\\]]+)?\\]\\]`,
      );
      const achou = resto.match(marca);
      if (!achou || achou.index === undefined) continue;

      if (achou.index > 0) pedacos.push(resto.slice(0, achou.index));
      pedacos.push(l);
      resto = resto.slice(achou.index + achou[0].length);
    }
    if (resto) pedacos.push(resto);
    return pedacos;
  }, [texto, indice]);

  if (!partes) return <span className={className}>{texto}</span>;

  return (
    <span className={className}>
      {partes.map((p, i) =>
        typeof p === "string" ? (
          <span key={i}>{p}</span>
        ) : p.alvo ? (
          <button
            key={i}
            onClick={(e) => {
              e.stopPropagation();
              if (aoAbrir) aoAbrir(p.alvo!);
              else navegar(ROTA_TIPO[p.alvo!.tipo]);
            }}
            className="text-primary underline decoration-primary/40 underline-offset-2 hover:decoration-primary"
          >
            {p.exibir}
          </button>
        ) : (
          <span
            key={i}
            className="text-muted-foreground underline decoration-dotted underline-offset-2"
            title="Ainda não existe um item com esse nome"
          >
            {p.exibir}
          </span>
        ),
      )}
    </span>
  );
}

/* ------------------------------------------- campo com autocompletar */

/**
 * Área de texto que sugere itens quando você digita `[[`.
 *
 * O objetivo é você linkar no momento em que pensa, não depois: linkar
 * retroativamente é trabalho que ninguém faz.
 */
export function AreaComLinks({
  value,
  onChange,
  indice,
  placeholder,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  indice: Map<string, Alvo>;
  placeholder?: string;
  className?: string;
}) {
  const [sugestoes, setSugestoes] = useState<Alvo[]>([]);
  const [selecionado, setSelecionado] = useState(0);
  const area = useRef<HTMLTextAreaElement>(null);

  /** Detecta um `[[` aberto antes do cursor e devolve o que já foi digitado. */
  function termoAberto(texto: string, cursor: number): string | null {
    const antes = texto.slice(0, cursor);
    const abre = antes.lastIndexOf("[[");
    if (abre < 0) return null;
    const depoisDoAbre = antes.slice(abre + 2);
    if (depoisDoAbre.includes("]") || depoisDoAbre.includes("\n")) return null;
    return depoisDoAbre;
  }

  function aoDigitar(v: string) {
    onChange(v);
    const cursor = area.current?.selectionStart ?? v.length;
    const termo = termoAberto(v, cursor);
    setSugestoes(termo === null ? [] : sugerir(indice, termo));
    setSelecionado(0);
  }

  function escolher(alvo: Alvo) {
    const el = area.current;
    if (!el) return;
    const cursor = el.selectionStart;
    const antes = value.slice(0, cursor);
    const abre = antes.lastIndexOf("[[");
    if (abre < 0) return;

    const novo = `${value.slice(0, abre)}[[${alvo.titulo}]]${value.slice(cursor)}`;
    onChange(novo);
    setSugestoes([]);

    // devolve o cursor para logo depois do link inserido
    const pos = abre + alvo.titulo.length + 4;
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(pos, pos);
    });
  }

  return (
    <div className="relative">
      <AreaTexto
        ref={area}
        value={value}
        onChange={(e) => aoDigitar(e.target.value)}
        onKeyDown={(e) => {
          if (sugestoes.length === 0) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setSelecionado((s) => (s + 1) % sugestoes.length);
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setSelecionado((s) => (s - 1 + sugestoes.length) % sugestoes.length);
          } else if (e.key === "Enter" || e.key === "Tab") {
            e.preventDefault();
            escolher(sugestoes[selecionado]);
          } else if (e.key === "Escape") {
            setSugestoes([]);
          }
        }}
        onBlur={() => setTimeout(() => setSugestoes([]), 150)}
        placeholder={placeholder}
        className={className}
      />

      {sugestoes.length > 0 && (
        <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-border bg-card shadow-lg">
          {sugestoes.map((a, i) => (
            <li key={a.caminho}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => escolher(a)}
                onMouseEnter={() => setSelecionado(i)}
                className={cn(
                  "flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm",
                  i === selecionado ? "bg-accent" : "hover:bg-accent",
                )}
              >
                <span className="truncate">{a.titulo}</span>
                <Selo>{ROTULO_TIPO[a.tipo]}</Selo>
              </button>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-1 text-xs text-muted-foreground">
        Digite <code className="rounded bg-secondary px-1">[[</code> para ligar
        a outra coisa sua.
      </p>
    </div>
  );
}

/* -------------------------------------------------------- mencionado em */

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
