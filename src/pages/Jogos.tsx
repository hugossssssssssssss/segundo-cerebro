import { useState } from "react";
import { CabecalhoPagina } from "@/components/CabecalhoPagina";
import { SeloStatus } from "@/components/SeloStatus";
import { JogoTermo } from "@/components/jogos/JogoTermo";
import { JogoCruzadinha } from "@/components/jogos/cruzadinha/JogoCruzadinha";
import { Gamepad2, Target, Grid3X3 } from "lucide-react";

export type AbaJogos = "termo" | "cruzadinha";

export default function Jogos() {
  const [abaAtiva, setAbaAtiva] = useState<AbaJogos>(() => {
    if (typeof window !== "undefined") {
      const p = new URLSearchParams(window.location.search);
      const abaUrl = p.get("aba") as AbaJogos | null;
      if (abaUrl === "termo" || abaUrl === "cruzadinha") return abaUrl;
      const salva = localStorage.getItem("klaus_aba_jogos") as AbaJogos | null;
      if (salva === "termo" || salva === "cruzadinha") return salva;
    }
    return "termo";
  });

  const mudarAba = (aba: AbaJogos) => {
    setAbaAtiva(aba);
    try {
      localStorage.setItem("klaus_aba_jogos", aba);
      const url = new URL(window.location.href);
      url.searchParams.set("aba", aba);
      window.history.replaceState(null, "", url.toString());
    } catch {}
  };

  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-200 w-full">
      {/* 1. Cabeçalho Principal do Hub de Jogos */}
      <CabecalhoPagina
        titulo="Jogos & Desafios"
        descricao="Exercite a mente e o raciocínio com o Termo e Palavras Cruzadas no Klaus."
        icone={<Gamepad2 size={20} />}
        corIcone="bg-purple-500/10 text-purple-600 dark:text-purple-400"
        badge={
          <SeloStatus
            rotulo={abaAtiva === "termo" ? "Termo • Wordle pt-BR" : "Palavras Cruzadas"}
            tom="primario"
          />
        }
      />

      {/* 2. Pastinha / Seletor de Jogos */}
      <div className="flex items-center gap-2 border-b border-border/80 pb-2">
        <button
          type="button"
          onClick={() => mudarAba("termo")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
            abaAtiva === "termo"
              ? "bg-primary text-primary-foreground shadow-xs scale-102"
              : "bg-secondary/60 text-muted-foreground hover:text-foreground hover:bg-secondary"
          }`}
        >
          <Target size={16} className="shrink-0" />
          <span>Termo</span>
          <span className="text-[10px] opacity-70 font-mono hidden sm:inline">(Wordle)</span>
        </button>

        <button
          type="button"
          onClick={() => mudarAba("cruzadinha")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
            abaAtiva === "cruzadinha"
              ? "bg-primary text-primary-foreground shadow-xs scale-102"
              : "bg-secondary/60 text-muted-foreground hover:text-foreground hover:bg-secondary"
          }`}
        >
          <Grid3X3 size={16} className="shrink-0" />
          <span>Palavras Cruzadas</span>
          <span className="text-[10px] opacity-70 font-mono hidden sm:inline">(Cruzadinha)</span>
        </button>
      </div>

      {/* 3. Renderização do Jogo Ativo */}
      <div className="w-full">
        {abaAtiva === "termo" ? <JogoTermo /> : <JogoCruzadinha />}
      </div>
    </div>
  );
}


