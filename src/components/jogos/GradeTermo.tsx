import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  TAMANHO_PALAVRA,
  avaliarChute,
  type StatusLetra,
} from "@/lib/jogos/termoEngine";

interface GradeTermoProps {
  tentativas: string[];
  letrasAtivas: string[];
  posicaoFoco: number;
  solucao: string;
  linhaComErro?: boolean;
  revelandoLinhaIdx?: number;
  maxTentativas?: number;
  resolvido?: boolean;
  aoClicarCelula?: (colIdx: number) => void;
  tamanho?: "padrao" | "compacto";
}

export function GradeTermo({
  tentativas,
  letrasAtivas,
  posicaoFoco,
  solucao,
  linhaComErro = false,
  revelandoLinhaIdx,
  maxTentativas = 6,
  resolvido = false,
  aoClicarCelula,
  tamanho = "padrao",
}: GradeTermoProps) {
  const linhas: ReactNode[] = [];

  for (let i = 0; i < maxTentativas; i++) {
    const ehLinhaPassada = i < tentativas.length;
    const ehLinhaAtual = i === tentativas.length && !resolvido;

    if (ehLinhaPassada) {
      const palavra = tentativas[i];
      const avaliacao = avaliarChute(palavra, solucao);
      const estaRevelando = revelandoLinhaIdx === i;

      linhas.push(
        <div key={`linha-${i}`} className="flex justify-center gap-1 sm:gap-1.5">
          {avaliacao.letras.map((l, colIdx) => (
            <CelulaGrade
              key={`celula-${i}-${colIdx}`}
              letra={l.letra}
              status={l.status}
              animarFlip={estaRevelando}
              delayFlipMs={colIdx * 120}
              tamanho={tamanho}
            />
          ))}
        </div>
      );
    } else if (ehLinhaAtual) {
      linhas.push(
        <div
          key={`linha-${i}`}
          className={cn(
            "flex justify-center gap-1 sm:gap-1.5 transition-transform",
            linhaComErro && "animate-shake"
          )}
        >
          {Array.from({ length: TAMANHO_PALAVRA }).map((_, colIdx) => {
            const char = (letrasAtivas[colIdx] || "").trim();
            const ehFoco = posicaoFoco === colIdx;
            const preenchido = char !== "";

            return (
              <CelulaGrade
                key={`celula-${i}-${colIdx}`}
                letra={char}
                status="vazio"
                ativo={preenchido}
                focado={ehFoco}
                emDigitacao={true}
                onClick={() => aoClicarCelula?.(colIdx)}
                tamanho={tamanho}
              />
            );
          })}
        </div>
      );
    } else {
      // Linha vazia futura
      linhas.push(
        <div key={`linha-${i}`} className="flex justify-center gap-1 sm:gap-1.5">
          {Array.from({ length: TAMANHO_PALAVRA }).map((_, colIdx) => (
            <CelulaGrade
              key={`celula-${i}-${colIdx}`}
              letra=""
              status="vazio"
              tamanho={tamanho}
            />
          ))}
        </div>
      );
    }
  }

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-1 sm:gap-1.5 select-none py-1 transition-opacity",
        resolvido && "opacity-90"
      )}
    >
      {linhas}
    </div>
  );
}

interface CelulaGradeProps {
  letra: string;
  status: StatusLetra;
  ativo?: boolean;
  focado?: boolean;
  emDigitacao?: boolean;
  animarFlip?: boolean;
  delayFlipMs?: number;
  tamanho?: "padrao" | "compacto";
  onClick?: () => void;
}

function CelulaGrade({
  letra,
  status,
  ativo,
  focado,
  emDigitacao,
  animarFlip,
  delayFlipMs = 0,
  tamanho = "padrao",
  onClick,
}: CelulaGradeProps) {
  const obterEstiloStatus = (st: StatusLetra) => {
    switch (st) {
      case "correta":
        return "bg-emerald-600 dark:bg-emerald-600 text-white border-emerald-600 dark:border-emerald-500 shadow-xs";
      case "existe":
        return "bg-amber-500 dark:bg-amber-500 text-white border-amber-500 dark:border-amber-400 shadow-xs";
      case "errada":
        return "bg-zinc-700/80 dark:bg-zinc-800 text-zinc-300 dark:text-zinc-400 border-zinc-700 dark:border-zinc-700/80";
      case "vazio":
      default:
        if (focado) {
          return "border-primary bg-card text-foreground ring-2 ring-primary/40 shadow-xs scale-102";
        }
        return ativo
          ? "border-foreground/50 bg-card text-foreground shadow-2xs"
          : "border-border/70 bg-card/40 text-foreground";
    }
  };

  const dimensoes =
    tamanho === "compacto"
      ? "h-9 w-9 sm:h-11 sm:w-11 text-base sm:text-lg rounded-lg"
      : "h-11 w-11 sm:h-13 sm:w-13 text-xl sm:text-2xl rounded-xl";

  return (
    <div
      onClick={onClick}
      style={{
        animationDelay: animarFlip ? `${delayFlipMs}ms` : undefined,
      }}
      className={cn(
        "flex items-center justify-center border-2 font-bold uppercase transition-all duration-150",
        dimensoes,
        obterEstiloStatus(status),
        emDigitacao && onClick && "cursor-pointer hover:border-primary/60",
        emDigitacao && ativo && "animate-in zoom-in-95 duration-75",
        animarFlip && "animate-flip"
      )}
    >
      <span className="leading-none">{letra}</span>
    </div>
  );
}
