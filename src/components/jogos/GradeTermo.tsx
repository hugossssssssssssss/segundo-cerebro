import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  TAMANHO_PALAVRA,
  avaliarChute,
  type StatusLetra,
} from "@/lib/jogos/termoEngine";

export type TamanhoGrade = "padrao" | "compacto" | "mini";

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
  tamanho?: TamanhoGrade;
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

  const espacamentoLinha =
    tamanho === "mini"
      ? "gap-0.5 sm:gap-1"
      : tamanho === "compacto"
      ? "gap-1 sm:gap-1.5"
      : "gap-1 sm:gap-1.5";

  for (let i = 0; i < maxTentativas; i++) {
    const ehLinhaPassada = i < tentativas.length;
    const ehLinhaAtual = i === tentativas.length && !resolvido;

    if (ehLinhaPassada) {
      const palavra = tentativas[i];
      const avaliacao = avaliarChute(palavra, solucao);
      const estaRevelando = revelandoLinhaIdx === i;

      linhas.push(
        <div key={`linha-${i}`} className={cn("flex justify-center", espacamentoLinha)}>
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
            "flex justify-center transition-transform",
            espacamentoLinha,
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
        <div key={`linha-${i}`} className={cn("flex justify-center", espacamentoLinha)}>
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
        "flex flex-col items-center justify-center select-none transition-opacity",
        tamanho === "mini" ? "gap-0.5 sm:gap-1 py-0.5" : "gap-1 sm:gap-1.5 py-1",
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
  tamanho?: TamanhoGrade;
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
  // Cores amigáveis e harmoniosas (Verde Esmeralda Termo, Amarelo Dourado Termo, Cinza Suave)
  const obterEstiloStatus = (st: StatusLetra) => {
    switch (st) {
      case "correta":
        return "bg-[#3aa394] dark:bg-[#3aa394] text-white border-[#3aa394] dark:border-[#3aa394] shadow-xs";
      case "existe":
        return "bg-[#d7a22a] dark:bg-[#d7a22a] text-white border-[#d7a22a] dark:border-[#d7a22a] shadow-xs";
      case "errada":
        return "bg-[#6b7280]/85 dark:bg-[#374151] text-white/90 dark:text-zinc-200 border-[#6b7280]/85 dark:border-[#374151]";
      case "vazio":
      default:
        if (focado) {
          return "border-primary bg-card text-foreground ring-2 ring-primary/50 shadow-xs scale-102";
        }
        return ativo
          ? "border-foreground/60 bg-card text-foreground shadow-2xs"
          : "border-border/75 bg-card/40 text-foreground";
    }
  };

  const dimensoes =
    tamanho === "mini"
      ? "h-7 w-7 sm:h-9 sm:w-9 text-xs sm:text-sm rounded-md sm:rounded-lg border-[1.5px]"
      : tamanho === "compacto"
      ? "h-8 w-8 sm:h-11 sm:w-11 text-sm sm:text-lg rounded-lg border-[1.5px] sm:border-2"
      : "h-10 w-10 sm:h-13 sm:w-13 text-lg sm:text-2xl rounded-xl border-2";

  return (
    <div
      onClick={onClick}
      style={{
        animationDelay: animarFlip ? `${delayFlipMs}ms` : undefined,
      }}
      className={cn(
        "flex items-center justify-center font-extrabold uppercase transition-all duration-150",
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
