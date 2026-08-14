import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, X } from "lucide-react";
import { lerConfig, configCompleta } from "@/lib/settings";
import { carregarRepo, type ItemRepo } from "@/lib/repo";
import { buscar, agrupar, ROTULO_TIPO, ROTA_TIPO } from "@/lib/busca";
import { Campo, Selo } from "@/components/ui";
import { cn } from "@/lib/utils";

/**
 * Busca global. Abre com ⌘K (ou Ctrl+K) e pelo ícone no cabeçalho.
 *
 * O acervo é carregado uma vez ao abrir e reaproveitado enquanto a janela
 * fica aberta — buscar não custa requisição nenhuma, então cada tecla
 * digitada filtra na hora.
 */
export function Busca({
  aberta,
  aoFechar,
}: {
  aberta: boolean;
  aoFechar: () => void;
}) {
  const navegar = useNavigate();
  const [termo, setTermo] = useState("");
  const [acervo, setAcervo] = useState<ItemRepo[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");
  const entrada = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!aberta) return;

    setTermo("");
    setErro("");
    entrada.current?.focus();

    const cfg = lerConfig();
    if (!configCompleta(cfg)) {
      setErro("Configure sua conta do GitHub em Ajustes para poder buscar.");
      return;
    }

    let cancelado = false;
    setCarregando(true);
    carregarRepo(cfg, { memoria: 3000 })
      .then((itens) => !cancelado && setAcervo(itens))
      .catch((e) => !cancelado && setErro(e instanceof Error ? e.message : String(e)))
      .finally(() => !cancelado && setCarregando(false));

    return () => {
      cancelado = true;
    };
  }, [aberta]);

  useEffect(() => {
    if (!aberta) return;
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === "Escape") aoFechar();
    };
    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
  }, [aberta, aoFechar]);

  const grupos = useMemo(
    () => agrupar(buscar(acervo, termo)),
    [acervo, termo],
  );
  const total = grupos.reduce((n, [, lista]) => n + lista.length, 0);

  if (!aberta) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-0 pt-0 sm:p-4 sm:pt-24"
      onClick={aoFechar}
    >
      <div
        className="flex max-h-[100dvh] w-full flex-col border-border bg-card shadow-xl sm:max-h-[70dvh] sm:max-w-2xl sm:rounded-2xl sm:border"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center gap-2 border-b border-border p-3">
          <Search size={18} className="shrink-0 text-muted-foreground" />
          <Campo
            ref={entrada}
            value={termo}
            onChange={(e) => setTermo(e.target.value)}
            placeholder="Buscar em tudo que você escreveu…"
            className="border-0 bg-transparent focus-visible:ring-0"
            autoFocus
          />
          <button
            onClick={aoFechar}
            className="shrink-0 rounded-lg p-2 text-muted-foreground hover:bg-accent"
            aria-label="Fechar busca"
          >
            <X size={18} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-auto">
          {erro ? (
            <p className="p-6 text-sm text-destructive">{erro}</p>
          ) : carregando && acervo.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">Carregando…</p>
          ) : termo.trim().length < 2 ? (
            <p className="p-6 text-sm text-muted-foreground">
              Digite ao menos duas letras. A busca olha títulos, tags e o texto
              inteiro de tudo — notas, tarefas, referências, metas e entregas.
            </p>
          ) : total === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">
              Nada encontrado para “{termo}”.
            </p>
          ) : (
            grupos.map(([tipo, lista]) => (
              <div key={tipo}>
                <p className="sticky top-0 bg-secondary/80 px-4 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur">
                  {ROTULO_TIPO[tipo]} · {lista.length}
                </p>
                {lista.map((r) => (
                  <button
                    key={r.caminho}
                    onClick={() => {
                      navegar(
                        `${ROTA_TIPO[r.tipo]}?abrir=${encodeURIComponent(r.caminho)}`,
                      );
                      aoFechar();
                    }}
                    className={cn(
                      "block w-full border-b border-border px-4 py-3 text-left transition-colors",
                      "hover:bg-accent focus-visible:bg-accent focus-visible:outline-none",
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-medium">{r.titulo}</p>
                      <Selo>{r.caminho.split("/")[0]}</Selo>
                    </div>
                    {r.trecho && (
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                        {r.trecho}
                      </p>
                    )}
                  </button>
                ))}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
