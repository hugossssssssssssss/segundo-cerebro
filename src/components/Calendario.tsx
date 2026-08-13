import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Botao, Cartao, Selo } from "@/components/ui";
import { cn, hojeISO } from "@/lib/utils";
import { urgencia, type Tarefa } from "@/lib/tarefas";

/**
 * Calendário mensal simples, montado à mão.
 *
 * Sem biblioteca de datas: um mês é uma grade de 6x7 e as contas cabem em
 * 20 linhas. Uma dependência a menos é uma dependência a menos para quebrar
 * daqui a um ano.
 */

const DIAS = ["D", "S", "T", "Q", "Q", "S", "S"];
const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

/** AAAA-MM-DD de um Date, no fuso local (toISOString usaria UTC e erraria o dia). */
function iso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function Calendario({
  tarefas,
  aoAbrir,
}: {
  tarefas: Tarefa[];
  aoAbrir: (t: Tarefa) => void;
}) {
  const hoje = hojeISO();
  const [refe, setRefe] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [selecionado, setSelecionado] = useState<string | null>(hoje);

  const ano = refe.getFullYear();
  const mes = refe.getMonth();

  // A grade começa no domingo da semana em que cai o dia 1
  const inicio = new Date(ano, mes, 1);
  inicio.setDate(1 - inicio.getDay());

  const celulas = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(inicio);
    d.setDate(inicio.getDate() + i);
    return d;
  });

  const porDia = new Map<string, Tarefa[]>();
  for (const t of tarefas) {
    if (!t.prazo) continue;
    const lista = porDia.get(t.prazo) ?? [];
    lista.push(t);
    porDia.set(t.prazo, lista);
  }

  const doDia = selecionado ? (porDia.get(selecionado) ?? []) : [];
  const semData = tarefas.filter((t) => !t.prazo && t.status !== "feito");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-medium">
          {MESES[mes]} <span className="text-muted-foreground">{ano}</span>
        </h2>
        <div className="flex gap-1">
          <Botao
            variante="fantasma"
            tamanho="icone"
            onClick={() => setRefe(new Date(ano, mes - 1, 1))}
          >
            <ChevronLeft size={18} />
          </Botao>
          <Botao
            variante="fantasma"
            tamanho="pequeno"
            onClick={() => {
              const d = new Date();
              setRefe(new Date(d.getFullYear(), d.getMonth(), 1));
              setSelecionado(hoje);
            }}
          >
            Hoje
          </Botao>
          <Botao
            variante="fantasma"
            tamanho="icone"
            onClick={() => setRefe(new Date(ano, mes + 1, 1))}
          >
            <ChevronRight size={18} />
          </Botao>
        </div>
      </div>

      <Cartao className="p-2">
        <div className="grid grid-cols-7">
          {DIAS.map((d, i) => (
            <div
              key={i}
              className="pb-2 text-center text-xs font-medium text-muted-foreground"
            >
              {d}
            </div>
          ))}

          {celulas.map((d) => {
            const chave = iso(d);
            const doMes = d.getMonth() === mes;
            const items = porDia.get(chave) ?? [];
            const pendentes = items.filter((t) => t.status !== "feito");
            const atrasadas = pendentes.some((t) => urgencia(t) === "atrasada");

            return (
              <button
                key={chave}
                onClick={() => setSelecionado(chave)}
                className={cn(
                  "relative aspect-square rounded-lg text-sm transition-colors",
                  !doMes && "text-muted-foreground/40",
                  chave === selecionado
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-accent",
                  chave === hoje &&
                    chave !== selecionado &&
                    "font-semibold text-primary",
                )}
              >
                {d.getDate()}
                {items.length > 0 && (
                  <span
                    className={cn(
                      "absolute bottom-1.5 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full",
                      chave === selecionado
                        ? "bg-primary-foreground"
                        : pendentes.length === 0
                          ? "bg-muted-foreground/40"
                          : atrasadas
                            ? "bg-destructive"
                            : "bg-primary",
                    )}
                  />
                )}
              </button>
            );
          })}
        </div>
      </Cartao>

      {selecionado && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground">
            {doDia.length === 0
              ? "Nada marcado para este dia"
              : `${doDia.length} tarefa${doDia.length > 1 ? "s" : ""}`}
          </h3>
          {doDia.map((t) => (
            <Cartao
              key={t.caminho}
              className="cursor-pointer p-3 transition-colors hover:bg-accent"
              onClick={() => aoAbrir(t)}
            >
              <p
                className={cn(
                  "text-sm font-medium",
                  t.status === "feito" && "text-muted-foreground line-through",
                )}
              >
                {t.titulo}
              </p>
            </Cartao>
          ))}
        </div>
      )}

      {semData.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground">
            Sem data marcada ({semData.length})
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {semData.slice(0, 8).map((t) => (
              <button key={t.caminho} onClick={() => aoAbrir(t)}>
                <Selo>{t.titulo}</Selo>
              </button>
            ))}
            {semData.length > 8 && (
              <Selo>e mais {semData.length - 8}</Selo>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
