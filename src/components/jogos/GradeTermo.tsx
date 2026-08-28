import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  TAMANHO_PALAVRA,
  MAX_TENTATIVAS,
  avaliarChute,
  type StatusLetra,
} from "@/lib/jogos/termoEngine";

interface GradeTermoProps {
  tentativas: string[];
  tentativaAtual: string;
  solucao: string;
  linhaComErro: boolean;
  revelandoLinhaIdx?: number;
}

export function GradeTermo({
  tentativas,
  tentativaAtual,
  solucao,
  linhaComErro,
  revelandoLinhaIdx,
}: GradeTermoProps) {
  const linhas: ReactNode[] = [];

  for (let i = 0; i < MAX_TENTATIVAS; i++) {
    const ehLinhaPassada = i < tentativas.length;
    const ehLinhaAtual = i === tentativas.length;

    if (ehLinhaPassada) {
      const palavra = tentativas[i];
      const avaliacao = avaliarChute(palavra, solucao);
      const estaRevelando = revelandoLinhaIdx === i;

      linhas.push(
        <div key={`linha-${i}`} className="flex justify-center gap-1.5 sm:gap-2">
          {avaliacao.letras.map((l, colIdx) => (
            <CelulaGrade
              key={`celula-${i}-${colIdx}`}
              letra={l.letra}
              status={l.status}
              animarFlip={estaRevelando}
              delayFlipMs={colIdx * 120}
            />
          ))}
        </div>
      );
    } else if (ehLinhaAtual) {
      const letras = tentativaAtual.padEnd(TAMANHO_PALAVRA, " ").split("");
      linhas.push(
        <div
          key={`linha-${i}`}
          className={cn(
            "flex justify-center gap-1.5 sm:gap-2 transition-transform",
            linhaComErro && "animate-shake"
          )}
        >
          {letras.map((char, colIdx) => {
            const preenchido = char.trim() !== "";
            return (
              <CelulaGrade
                key={`celula-${i}-${colIdx}`}
                letra={char.trim()}
                status="vazio"
                ativo={preenchido}
                emDigitacao={true}
              />
            );
          })}
        </div>
      );
    } else {
      // Linha vazia futura
      linhas.push(
        <div key={`linha-${i}`} className="flex justify-center gap-1.5 sm:gap-2">
          {Array.from({ length: TAMANHO_PALAVRA }).map((_, colIdx) => (
            <CelulaGrade key={`celula-${i}-${colIdx}`} letra="" status="vazio" />
          ))}
        </div>
      );
    }
  }

  return (
    <div className="flex flex-col items-center justify-center gap-1.5 sm:gap-2 select-none py-2">
      {linhas}
    </div>
  );
}

interface CelulaGradeProps {
  letra: string;
  status: StatusLetra;
  ativo?: boolean;
  emDigitacao?: boolean;
  animarFlip?: boolean;
  delayFlipMs?: number;
}

function CelulaGrade({
  letra,
  status,
  ativo,
  emDigitacao,
  animarFlip,
  delayFlipMs = 0,
}: CelulaGradeProps) {
  const obterEstiloStatus = (st: StatusLetra) => {
    switch (st) {
      case "correta":
        return "bg-emerald-600 dark:bg-emerald-600 text-white border-emerald-600 dark:border-emerald-500 shadow-sm";
      case "existe":
        return "bg-amber-500 dark:bg-amber-500 text-white border-amber-500 dark:border-amber-400 shadow-sm";
      case "errada":
        return "bg-zinc-700/80 dark:bg-zinc-800 text-zinc-300 dark:text-zinc-400 border-zinc-700 dark:border-zinc-700/80";
      case "vazio":
      default:
        return ativo
          ? "border-foreground/60 bg-card text-foreground scale-102 shadow-xs"
          : "border-border/70 bg-card/40 text-foreground";
    }
  };

  return (
    <div
      style={{
        animationDelay: animarFlip ? `${delayFlipMs}ms` : undefined,
      }}
      className={cn(
        "flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-xl border-2 font-bold text-xl sm:text-2xl uppercase transition-all duration-200",
        obterEstiloStatus(status),
        emDigitacao && ativo && "animate-in zoom-in-90 duration-100",
        animarFlip && "animate-flip"
      )}
    >
      <span className="leading-none">{letra}</span>
    </div>
  );
}
