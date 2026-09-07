import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

export type FormatoNumeroTipo = "padrao" | "moeda_brl" | "moeda_usd" | "moeda_eur" | "porcentagem" | "unidade";
export type EstiloExibicaoNumero = "numero" | "barra" | "anel";

export interface ConfigFormatoNumero {
  formato?: FormatoNumeroTipo;
  visualizacao?: EstiloExibicaoNumero;
  maximo?: number;
  unidade?: string;
  corBarra?: string;
}

const CORES_BARRA: Record<string, { bg: string; fill: string; ring: string }> = {
  azul: { bg: "bg-blue-500/20", fill: "bg-blue-500", ring: "text-blue-500" },
  verde: { bg: "bg-emerald-500/20", fill: "bg-emerald-500", ring: "text-emerald-500" },
  amarelo: { bg: "bg-amber-500/20", fill: "bg-amber-500", ring: "text-amber-500" },
  roxo: { bg: "bg-purple-500/20", fill: "bg-purple-500", ring: "text-purple-500" },
  rosa: { bg: "bg-pink-500/20", fill: "bg-pink-500", ring: "text-pink-500" },
  laranja: { bg: "bg-orange-500/20", fill: "bg-orange-500", ring: "text-orange-500" },
};

export function formatarValorNumerico(
  valor: number | undefined | null,
  config: ConfigFormatoNumero = {}
): string {
  if (valor === undefined || valor === null || isNaN(valor)) return "";

  const formato = config.formato || "padrao";

  if (formato === "moeda_brl") {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valor);
  }
  if (formato === "moeda_usd") {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(valor);
  }
  if (formato === "moeda_eur") {
    return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(valor);
  }
  if (formato === "porcentagem") {
    return `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(valor)}%`;
  }
  if (formato === "unidade" && config.unidade) {
    return `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(valor)} ${config.unidade}`;
  }

  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(valor);
}

interface FormatadorNumeroProps {
  valor: any;
  config?: ConfigFormatoNumero;
  aoMudar: (novoValor: number | "") => void;
  placeholder?: string;
  autoFoco?: boolean;
}

export function FormatadorNumero({
  valor,
  config = {},
  aoMudar,
  placeholder = "Vazio",
  autoFoco = false,
}: FormatadorNumeroProps) {
  const [editando, setEditando] = useState(false);
  const [textoInput, setTextoInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const num = typeof valor === "number" ? valor : valor !== "" && valor !== undefined && !isNaN(Number(valor)) ? Number(valor) : null;
  const visualizacao = config.visualizacao || "numero";
  const maximo = config.maximo && config.maximo > 0 ? config.maximo : 100;
  const corObj = CORES_BARRA[config.corBarra || "verde"] || CORES_BARRA.verde;

  useEffect(() => {
    if (num !== null) {
      setTextoInput(String(num));
    } else {
      setTextoInput("");
    }
  }, [num]);

  useEffect(() => {
    if (editando && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editando]);

  const salvar = () => {
    setEditando(false);
    const limpo = textoInput.trim().replace(",", ".");
    if (limpo === "") {
      aoMudar("");
      return;
    }
    const parsed = Number(limpo);
    if (!isNaN(parsed)) {
      aoMudar(parsed);
    } else {
      setTextoInput(num !== null ? String(num) : "");
    }
  };

  if (editando) {
    return (
      <input
        ref={inputRef}
        type="number"
        step="any"
        value={textoInput}
        onChange={(e) => setTextoInput(e.target.value)}
        onBlur={salvar}
        onKeyDown={(e) => {
          if (e.key === "Enter") salvar();
          if (e.key === "Escape") {
            setEditando(false);
            setTextoInput(num !== null ? String(num) : "");
          }
        }}
        className="w-full bg-accent/40 border border-border text-xs px-2 h-7 rounded outline-none focus:ring-1 focus:ring-primary font-mono"
      />
    );
  }

  const textoFormatado = num !== null ? formatarValorNumerico(num, config) : "";

  // Visualização 1: Barra de Progresso Horizontal
  if (visualizacao === "barra" && num !== null) {
    const porcentagem = Math.min(100, Math.max(0, (num / maximo) * 100));
    return (
      <div
        onClick={() => setEditando(true)}
        title={`Clique para editar (Valor: ${num} / Meta: ${maximo})`}
        className="flex items-center gap-2.5 flex-1 min-w-[140px] max-w-[280px] cursor-pointer group py-1"
      >
        <div className={cn("flex-1 h-2 rounded-full overflow-hidden relative", corObj.bg)}>
          <div
            className={cn("h-full rounded-full transition-all duration-300", corObj.fill)}
            style={{ width: `${porcentagem}%` }}
          />
        </div>
        <span className="text-xs font-semibold text-foreground/90 shrink-0 font-mono">
          {textoFormatado}
        </span>
      </div>
    );
  }

  // Visualização 2: Anel Circular (Mini Ring Gauge)
  if (visualizacao === "anel" && num !== null) {
    const porcentagem = Math.min(100, Math.max(0, (num / maximo) * 100));
    const raio = 8;
    const circunferencia = 2 * Math.PI * raio;
    const offset = circunferencia - (porcentagem / 100) * circunferencia;

    return (
      <div
        onClick={() => setEditando(true)}
        title={`Clique para editar (${Math.round(porcentagem)}% concluído)`}
        className="flex items-center gap-2 cursor-pointer group py-1"
      >
        <svg className="w-5 h-5 -rotate-90 shrink-0" viewBox="0 0 20 20">
          <circle
            cx="10"
            cy="10"
            r={raio}
            className="stroke-muted/30"
            strokeWidth="2.5"
            fill="transparent"
          />
          <circle
            cx="10"
            cy="10"
            r={raio}
            className={cn("transition-all duration-300", corObj.ring)}
            strokeWidth="2.5"
            strokeDasharray={circunferencia}
            strokeDashoffset={offset}
            strokeLinecap="round"
            fill="transparent"
            stroke="currentColor"
          />
        </svg>
        <span className="text-xs font-semibold text-foreground/90 font-mono">
          {textoFormatado}
        </span>
      </div>
    );
  }

  // Visualização Padrão: Apenas Número Formatado
  return (
    <button
      type="button"
      onClick={() => setEditando(true)}
      className={cn(
        "flex-1 text-left h-7 px-2 text-xs rounded hover:bg-accent/40 transition-colors flex items-center font-mono cursor-pointer",
        autoFoco && "ring-1 ring-primary/40",
        num !== null ? "text-foreground font-medium" : "text-muted-foreground font-normal"
      )}
    >
      <span>{textoFormatado || placeholder}</span>
    </button>
  );
}
