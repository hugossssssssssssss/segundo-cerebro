import { useState } from "react";
import { Check, X, FilePlus, FilePen, Trash2, CheckCircle2 } from "lucide-react";
import { descrever, type Acao } from "@/lib/acoes";
import { Botao, Cartao, Selo } from "@/components/ui";

/**
 * Mostra o que a IA quer fazer e espera sua decisão.
 *
 * Nada é gravado antes de você clicar em Aprovar. Isso não é excesso de
 * zelo: um engano da IA vira commit no seu repositório, e a confiança na
 * ferramenta não sobrevive a duas ou três surpresas dessas.
 */
export function CartaoAcao({
  acao,
  aoAprovar,
  aoDescartar,
}: {
  acao: Acao;
  aoAprovar: () => Promise<void>;
  aoDescartar: () => void;
}) {
  const [estado, setEstado] = useState<"esperando" | "aplicando" | "feito" | "erro">(
    "esperando",
  );
  const [erro, setErro] = useState("");
  const [aberto, setAberto] = useState(false);

  const Icone =
    acao.tipo === "criar" ? FilePlus : acao.tipo === "apagar" ? Trash2 : FilePen;
  const perigoso = acao.tipo === "apagar";

  async function aprovar() {
    setEstado("aplicando");
    setErro("");
    try {
      await aoAprovar();
      setEstado("feito");
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e));
      setEstado("erro");
    }
  }

  if (estado === "feito") {
    return (
      <Cartao className="flex items-center gap-2 border-[var(--success)]/40 bg-[var(--success)]/5 p-3 text-sm">
        <CheckCircle2 size={16} className="shrink-0 text-[var(--success)]" />
        {descrever(acao)} — pronto.
      </Cartao>
    );
  }

  return (
    <Cartao
      className={
        perigoso
          ? "border-destructive/40 bg-destructive/5 p-3.5"
          : "border-primary/40 bg-primary/5 p-3.5"
      }
    >
      <div className="flex items-start gap-2.5">
        <Icone
          size={17}
          className={perigoso ? "mt-0.5 shrink-0 text-destructive" : "mt-0.5 shrink-0 text-primary"}
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{descrever(acao)}</p>
          {acao.motivo && (
            <p className="mt-0.5 text-xs text-muted-foreground">{acao.motivo}</p>
          )}

          {/* o que exatamente será gravado — sem surpresa depois */}
          {(acao.campos || acao.corpo) && (
            <button
              onClick={() => setAberto((v) => !v)}
              className="mt-1.5 text-xs text-primary hover:underline"
            >
              {aberto ? "Esconder detalhes" : "Ver o que será gravado"}
            </button>
          )}

          {aberto && (
            <div className="mt-2 space-y-1.5 rounded-lg bg-card p-2.5 text-xs">
              {acao.campos &&
                Object.entries(acao.campos).map(([k, v]) => (
                  <div key={k} className="flex gap-2">
                    <span className="text-muted-foreground">{k}:</span>
                    <span className="font-medium">
                      {Array.isArray(v) ? v.join(", ") : String(v)}
                    </span>
                  </div>
                ))}
              {acao.corpo && (
                <p className="whitespace-pre-wrap border-t border-border pt-1.5 text-muted-foreground">
                  {acao.corpo}
                </p>
              )}
            </div>
          )}

          {estado === "erro" && (
            <p className="mt-2 text-xs text-destructive">{erro}</p>
          )}

          <div className="mt-3 flex gap-2">
            <Botao
              tamanho="pequeno"
              variante={perigoso ? "perigo" : "primario"}
              onClick={aprovar}
              disabled={estado === "aplicando"}
            >
              <Check size={14} />
              {estado === "aplicando"
                ? "Gravando…"
                : estado === "erro"
                  ? "Tentar de novo"
                  : "Aprovar"}
            </Botao>
            <Botao variante="neutro" tamanho="pequeno" onClick={aoDescartar}>
              <X size={14} />
              Descartar
            </Botao>
            {perigoso && <Selo tom="perigo">apaga um arquivo</Selo>}
          </div>
        </div>
      </div>
    </Cartao>
  );
}
