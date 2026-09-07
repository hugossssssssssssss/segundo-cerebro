import React from "react";
import { DollarSign, Percent, Hash, Layers, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ConfigFormatoNumero, FormatoNumeroTipo, EstiloExibicaoNumero } from "./FormatadorNumero";

interface ConfiguradorNumeroModalProps {
  config: ConfigFormatoNumero;
  aoSalvarConfig: (novaConfig: ConfigFormatoNumero) => void;
}

const OPCOES_FORMATO: { id: FormatoNumeroTipo; rotulo: string; icone: React.ElementType; exemplo: string }[] = [
  { id: "padrao", rotulo: "Número Padrão", icone: Hash, exemplo: "1.250,50" },
  { id: "moeda_brl", rotulo: "Real Brasileiro (R$)", icone: DollarSign, exemplo: "R$ 1.250,50" },
  { id: "moeda_usd", rotulo: "Dólar ($)", icone: DollarSign, exemplo: "$1,250.50" },
  { id: "moeda_eur", rotulo: "Euro (€)", icone: DollarSign, exemplo: "1.250,50 €" },
  { id: "porcentagem", rotulo: "Porcentagem (%)", icone: Percent, exemplo: "85%" },
  { id: "unidade", rotulo: "Unidade Personalizada", icone: Layers, exemplo: "50 km" },
];

const OPCOES_VISUALIZACAO: { id: EstiloExibicaoNumero; rotulo: string; descricao: string }[] = [
  { id: "numero", rotulo: "Apenas Número", descricao: "Exibe o valor formatado simples" },
  { id: "barra", rotulo: "Barra de Progresso", descricao: "Barra horizontal com porcentagem" },
  { id: "anel", rotulo: "Anel de Progresso", descricao: "Mini indicador circular" },
];

const CORES_DISPONIVEIS = [
  { id: "verde", nome: "Verde", classe: "bg-emerald-500" },
  { id: "azul", nome: "Azul", classe: "bg-blue-500" },
  { id: "amarelo", nome: "Amarelo", classe: "bg-amber-500" },
  { id: "roxo", nome: "Roxo", classe: "bg-purple-500" },
  { id: "rosa", nome: "Rosa", classe: "bg-pink-500" },
  { id: "laranja", nome: "Laranja", classe: "bg-orange-500" },
];

export function ConfiguradorNumeroModal({
  config,
  aoSalvarConfig,
}: ConfiguradorNumeroModalProps) {
  const formatoAtual = config.formato || "padrao";
  const visualizacaoAtual = config.visualizacao || "numero";
  const maximoAtual = config.maximo || 100;
  const corAtual = config.corBarra || "verde";
  const unidadeAtual = config.unidade || "";

  return (
    <div className="space-y-3 p-1 text-xs">
      <div>
        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
          Formato do Número
        </span>
        <div className="flex flex-col gap-1">
          {OPCOES_FORMATO.map((op) => {
            const Icon = op.icone;
            const selecionado = formatoAtual === op.id;
            return (
              <button
                key={op.id}
                type="button"
                onClick={() => aoSalvarConfig({ ...config, formato: op.id })}
                className={cn(
                  "w-full flex items-center justify-between px-2 py-1.5 rounded-md text-xs transition-colors text-left cursor-pointer",
                  selecionado
                    ? "bg-primary/10 text-primary font-semibold"
                    : "text-foreground hover:bg-accent"
                )}
              >
                <div className="flex items-center gap-2">
                  <Icon size={13} className="shrink-0 opacity-70" />
                  <span>{op.rotulo}</span>
                </div>
                <span className="text-[10px] text-muted-foreground font-mono">{op.exemplo}</span>
              </button>
            );
          })}
        </div>
      </div>

      {formatoAtual === "unidade" && (
        <div className="pt-2 border-t border-border/40">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
            Nome da Unidade
          </span>
          <input
            type="text"
            placeholder="Ex: km, kg, pomodoros, itens..."
            value={unidadeAtual}
            onChange={(e) => aoSalvarConfig({ ...config, unidade: e.target.value })}
            className="w-full bg-accent/40 border border-border text-xs px-2.5 py-1 rounded outline-none focus:ring-1 focus:ring-primary font-mono"
          />
        </div>
      )}

      <div className="pt-2 border-t border-border/40">
        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
          Estilo de Exibição
        </span>
        <div className="grid grid-cols-3 gap-1">
          {OPCOES_VISUALIZACAO.map((v) => {
            const selecionado = visualizacaoAtual === v.id;
            return (
              <button
                key={v.id}
                type="button"
                onClick={() => aoSalvarConfig({ ...config, visualizacao: v.id })}
                className={cn(
                  "p-1.5 rounded-md border text-center transition-all cursor-pointer flex flex-col items-center gap-0.5",
                  selecionado
                    ? "border-primary bg-primary/10 text-primary font-semibold shadow-xs"
                    : "border-border/60 text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
              >
                <span className="text-[11px] font-medium">{v.rotulo}</span>
              </button>
            );
          })}
        </div>
      </div>

      {visualizacaoAtual !== "numero" && (
        <div className="pt-2 border-t border-border/40 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-medium text-foreground">Valor Máximo / Meta:</span>
            <input
              type="number"
              value={maximoAtual}
              onChange={(e) => aoSalvarConfig({ ...config, maximo: Number(e.target.value) || 100 })}
              className="w-20 bg-accent/40 border border-border text-xs px-2 py-0.5 rounded outline-none text-right font-mono focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-medium text-foreground">Cor do Progresso:</span>
            <div className="flex items-center gap-1">
              {CORES_DISPONIVEIS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => aoSalvarConfig({ ...config, corBarra: c.id })}
                  title={c.nome}
                  className={cn(
                    "w-4 h-4 rounded-full flex items-center justify-center transition-transform hover:scale-110",
                    c.classe,
                    corAtual === c.id && "ring-2 ring-primary ring-offset-1 ring-offset-background"
                  )}
                >
                  {corAtual === c.id && <Check size={9} className="text-white" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
