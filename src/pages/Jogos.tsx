import { useState } from "react";
import { CabecalhoPagina } from "@/components/CabecalhoPagina";
import { SeloStatus } from "@/components/SeloStatus";
import { JogoTermo } from "@/components/jogos/JogoTermo";
import { JogoCruzadinha } from "@/components/jogos/cruzadinha/JogoCruzadinha";
import { ModalCreditosOpenSource } from "@/components/ModalCreditosOpenSource";
import { Gamepad2, Code2 } from "lucide-react";

export type AbaJogos = "termo" | "cruzadinha";

export default function Jogos() {
  const [abaAtiva, setAbaAtiva] = useState<AbaJogos>("termo");
  const [modalCreditosAberta, setModalCreditosAberta] = useState(false);

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
        acoes={
          <button
            type="button"
            onClick={() => setModalCreditosAberta(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border/70 bg-card hover:bg-accent text-xs font-semibold text-muted-foreground hover:text-foreground transition-all cursor-pointer shadow-2xs"
            title="Ver créditos open source no modal padrão"
          >
            <Code2 size={13} className="text-primary" />
            <span className="hidden sm:inline">Créditos Open Source</span>
          </button>
        }
      />

      {/* 2. Pastinha / Seletor de Jogos */}
      <div className="flex items-center gap-2 border-b border-border/80 pb-2">
        <button
          type="button"
          onClick={() => setAbaAtiva("termo")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
            abaAtiva === "termo"
              ? "bg-primary text-primary-foreground shadow-xs scale-102"
              : "bg-secondary/60 text-muted-foreground hover:text-foreground hover:bg-secondary"
          }`}
        >
          <span className="text-base sm:text-lg">🎯</span>
          <span>Termo</span>
          <span className="text-[10px] opacity-70 font-mono hidden sm:inline">(Wordle)</span>
        </button>

        <button
          type="button"
          onClick={() => setAbaAtiva("cruzadinha")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
            abaAtiva === "cruzadinha"
              ? "bg-primary text-primary-foreground shadow-xs scale-102"
              : "bg-secondary/60 text-muted-foreground hover:text-foreground hover:bg-secondary"
          }`}
        >
          <span className="text-base sm:text-lg">📝</span>
          <span>Palavras Cruzadas</span>
          <span className="text-[10px] opacity-70 font-mono hidden sm:inline">(Cruzadinha)</span>
        </button>
      </div>

      {/* 3. Renderização do Jogo Ativo */}
      <div className="w-full">
        {abaAtiva === "termo" ? <JogoTermo /> : <JogoCruzadinha />}
      </div>

      {/* 4. Modal padrão de créditos */}
      <ModalCreditosOpenSource
        aberta={modalCreditosAberta}
        aoFechar={() => setModalCreditosAberta(false)}
      />
    </div>
  );
}


