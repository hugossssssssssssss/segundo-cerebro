import { useState } from "react";
import { cn } from "@/lib/utils";
import { Tooltip } from "@/components/ui/tooltip";

interface AvatarUsuarioProps {
  login: string;
  nome?: string;
  avatarUrl?: string;
  tamanho?: "xs" | "sm" | "md" | "lg" | number;
  comTooltip?: boolean;
  className?: string;
}

const PALETA_CORES = [
  "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30",
  "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
  "bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30",
  "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
  "bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30",
  "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30",
  "bg-teal-500/15 text-teal-600 dark:text-teal-400 border-teal-500/30",
];

function obterCorPorTexto(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const idx = Math.abs(hash) % PALETA_CORES.length;
  return PALETA_CORES[idx];
}

export function AvatarUsuario({
  login,
  nome,
  avatarUrl,
  tamanho = "sm",
  comTooltip = true,
  className,
}: AvatarUsuarioProps) {
  const [erroImagem, setErroImagem] = useState(false);

  const limpo = (login || "").trim().replace(/^@/, "");
  if (!limpo) return null;

  const url = avatarUrl || `https://github.com/${limpo}.png?size=64`;
  const inicial = (nome || limpo).charAt(0).toUpperCase() || "?";
  const corClasses = obterCorPorTexto(limpo);

  let tamanhoPx = 24;
  let classeTamanho = "w-6 h-6 text-[11px]";

  if (typeof tamanho === "number") {
    tamanhoPx = tamanho;
    classeTamanho = "";
  } else if (tamanho === "xs") {
    tamanhoPx = 18;
    classeTamanho = "w-[18px] h-[18px] text-[9px]";
  } else if (tamanho === "sm") {
    tamanhoPx = 24;
    classeTamanho = "w-6 h-6 text-[11px]";
  } else if (tamanho === "md") {
    tamanhoPx = 32;
    classeTamanho = "w-8 h-8 text-xs";
  } else if (tamanho === "lg") {
    tamanhoPx = 40;
    classeTamanho = "w-10 h-10 text-sm";
  }

  const elemento = (
    <div
      style={typeof tamanho === "number" ? { width: tamanhoPx, height: tamanhoPx } : undefined}
      className={cn(
        "relative inline-flex items-center justify-center rounded-full shrink-0 overflow-hidden font-semibold select-none border border-border/40 shadow-2xs transition-transform",
        classeTamanho,
        corClasses,
        className
      )}
    >
      {!erroImagem ? (
        <img
          src={url}
          alt={nome || `@${limpo}`}
          onError={() => setErroImagem(true)}
          className="w-full h-full object-cover rounded-full"
          loading="lazy"
        />
      ) : (
        <span className="leading-none">{inicial}</span>
      )}
    </div>
  );

  if (!comTooltip) return elemento;

  const rotuloTooltip = nome ? `${nome} (@${limpo})` : `@${limpo}`;
  return (
    <Tooltip conteudo={rotuloTooltip} posicao="top">
      {elemento}
    </Tooltip>
  );
}
