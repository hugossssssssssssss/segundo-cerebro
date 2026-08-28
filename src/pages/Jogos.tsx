import { useState } from "react";
import { CabecalhoPagina } from "@/components/CabecalhoPagina";
import { SeloStatus } from "@/components/SeloStatus";
import { JogoTermo } from "@/components/jogos/JogoTermo";
import { JogoCruzadinha } from "@/components/jogos/cruzadinha/JogoCruzadinha";
import {
  Gamepad2,
  ExternalLink,
  GitBranch,
  Code2,
} from "lucide-react";

export type AbaJogos = "termo" | "cruzadinha";

export default function Jogos() {
  const [abaAtiva, setAbaAtiva] = useState<AbaJogos>("termo");

  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-200 w-full max-w-4xl mx-auto pb-12 px-1 sm:px-4">
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

      {/* 4. Créditos Open Source no Rodapé dos Jogos */}
      <div className="mt-8 pt-4 border-t border-border/40 text-xs text-muted-foreground space-y-2">
        <div className="flex items-center gap-2 font-semibold text-foreground">
          <Code2 size={14} className="text-primary" />
          <span>Créditos & Motores Open Source dos Jogos</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
          <div className="p-2.5 rounded-xl bg-card border border-border/60 space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-bold text-foreground">Termo & Lingle</span>
              <a
                href="https://github.com/sixels/Lingle"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-primary hover:underline inline-flex items-center gap-1 font-medium"
              >
                <GitBranch size={11} />
                <span>sixels/Lingle</span>
                <ExternalLink size={10} />
              </a>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Inspirado no Termo de Fernando Serboncini com vocabulário de 5 letras em pt-BR e sorteio diário.
            </p>
          </div>

          <div className="p-2.5 rounded-xl bg-card border border-border/60 space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-bold text-foreground">React Crossword</span>
              <a
                href="https://github.com/JaredReisinger/react-crossword"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-primary hover:underline inline-flex items-center gap-1 font-medium"
              >
                <GitBranch size={11} />
                <span>react-crossword</span>
                <ExternalLink size={10} />
              </a>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Baseado na arquitetura matricial de palavras cruzadas do The Guardian e Jared Reisinger.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
