import { useEffect, useState } from "react";
import { Modal, Botao } from "@/components/ui";
import { Share2, Trophy, Flame, RotateCcw, Clock, Sparkles } from "lucide-react";
import { toast } from "@/lib/toast";
import { obterPalavraOriginal } from "@/lib/jogos/palavras";
import {
  CONFIG_MODOS,
  gerarTextoCompartilhamentoMulti,
  type TipoJogo,
} from "@/lib/jogos/termoEngine";
import type { EstatisticasModo, EstadoJogoGenerico } from "@/lib/jogos/termoStorage";

interface ModalEstatisticasTermoProps {
  aberto: boolean;
  aoFechar: () => void;
  jogo: EstadoJogoGenerico;
  estatisticas: EstatisticasModo;
  tipoJogo: TipoJogo;
  aoJogarInfinito?: () => void;
}

export function ModalEstatisticasTermo({
  aberto,
  aoFechar,
  jogo,
  estatisticas,
  tipoJogo,
  aoJogarInfinito,
}: ModalEstatisticasTermoProps) {
  const [tempoRestante, setTempoRestante] = useState<string>("");
  const config = CONFIG_MODOS[tipoJogo];

  // Calcula contagem regressiva até a meia-noite local
  useEffect(() => {
    const atualizarTempo = () => {
      const agora = new Date();
      const meiaNoite = new Date(agora);
      meiaNoite.setHours(24, 0, 0, 0);

      const diffMs = Math.max(0, meiaNoite.getTime() - agora.getTime());
      const horas = Math.floor(diffMs / (1000 * 60 * 60));
      const minutos = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      const segundos = Math.floor((diffMs % (1000 * 60)) / 1000);

      const fmt = `${String(horas).padStart(2, "0")}:${String(minutos).padStart(2, "0")}:${String(segundos).padStart(2, "0")}`;
      setTempoRestante(fmt);
    };

    atualizarTempo();
    const interval = setInterval(atualizarTempo, 1000);
    return () => clearInterval(interval);
  }, []);

  const totalJogos = estatisticas?.totalJogos || 0;
  const pctVitorias = totalJogos > 0 ? Math.round((estatisticas.vitorias / totalJogos) * 100) : 0;
  const maxDistribuicao = Math.max(
    1,
    ...Object.values(estatisticas?.distribuicao || {})
  );

  const tentativaVencedoraHoje =
    jogo.status === "venceu" ? jogo.tentativasGerais.length : null;

  const lidarCompartilhar = async () => {
    const texto = gerarTextoCompartilhamentoMulti(
      tipoJogo,
      jogo.numeroJogo,
      jogo.tentativasPorTabuleiro,
      jogo.palavras,
      jogo.status === "venceu",
      jogo.modoRitmo
    );

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(texto);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = texto;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      toast("Resultado copiado para a área de transferência! 📋", { tipo: "sucesso" });
    } catch {
      toast("Não foi possível copiar automaticamente. Selecione e copie o texto.", { tipo: "erro" });
    }
  };

  const listaTentativasDist = Array.from(
    { length: config.tentativas },
    (_, i) => i + 1
  );

  return (
    <Modal
      aberto={aberto}
      aoFechar={aoFechar}
      titulo={`Estatísticas — ${config.rotulo}`}
    >
      <div className="space-y-6 py-1">
        {/* Mensagem de Resultado se finalizado */}
        {jogo.status !== "jogando" && (
          <div className="text-center space-y-2 p-4 rounded-2xl bg-secondary/50 border border-border/80">
            {jogo.status === "venceu" ? (
              <div className="space-y-1">
                <div className="flex items-center justify-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold text-lg">
                  <Sparkles size={20} className="animate-pulse" />
                  <span>Espetacular! Você acertou tudo!</span>
                </div>
                <div className="text-sm text-muted-foreground flex flex-wrap items-center justify-center gap-2 pt-1">
                  <span>Palavras:</span>
                  {jogo.palavras.map((p, idx) => (
                    <span
                      key={`palavra-res-${idx}`}
                      className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold tracking-wider uppercase border border-emerald-500/20"
                    >
                      {obterPalavraOriginal(p)}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                <p className="text-destructive font-bold text-base">Não foi dessa vez!</p>
                <div className="text-sm text-muted-foreground flex flex-wrap items-center justify-center gap-2 pt-1">
                  <span>As palavras eram:</span>
                  {jogo.palavras.map((p, idx) => (
                    <span
                      key={`palavra-res-${idx}`}
                      className="px-2 py-0.5 rounded-md bg-secondary text-foreground font-bold tracking-wider uppercase border border-border"
                    >
                      {obterPalavraOriginal(p)}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Resumo Numérico */}
        <div className="grid grid-cols-4 gap-2 text-center">
          <div className="rounded-xl border border-border/60 bg-card p-3 shadow-2xs">
            <div className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
              {totalJogos}
            </div>
            <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mt-0.5">
              Jogos
            </div>
          </div>
          <div className="rounded-xl border border-border/60 bg-card p-3 shadow-2xs">
            <div className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
              {pctVitorias}%
            </div>
            <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mt-0.5">
              Vitórias
            </div>
          </div>
          <div className="rounded-xl border border-border/60 bg-card p-3 shadow-2xs">
            <div className="text-2xl sm:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 tracking-tight flex items-center justify-center gap-0.5">
              <span>{estatisticas.sequenciaAtual}</span>
              <Flame size={18} className="text-amber-500 fill-amber-500" />
            </div>
            <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mt-0.5">
              Sequência
            </div>
          </div>
          <div className="rounded-xl border border-border/60 bg-card p-3 shadow-2xs">
            <div className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight flex items-center justify-center gap-0.5">
              <span>{estatisticas.melhorSequencia}</span>
              <Trophy size={16} className="text-amber-500" />
            </div>
            <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mt-0.5">
              Melhor
            </div>
          </div>
        </div>

        {/* Gráfico de Distribuição de Tentativas */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-1">
            Distribuição de Tentativas
          </h4>
          <div className="space-y-1.5">
            {listaTentativasDist.map((tentativa) => {
              const qtd = estatisticas?.distribuicao?.[tentativa] || 0;
              const porcentagemLargura = Math.max(7, Math.round((qtd / maxDistribuicao) * 100));
              const ehTentativaDeHoje = tentativaVencedoraHoje === tentativa;

              return (
                <div key={`dist-${tentativa}`} className="flex items-center gap-2 text-xs">
                  <span className="w-3 font-bold text-muted-foreground text-right">{tentativa}</span>
                  <div className="flex-1 bg-muted/40 rounded-md overflow-hidden h-6 flex items-center">
                    <div
                      style={{ width: `${porcentagemLargura}%` }}
                      className={`h-full flex items-center justify-end px-2 rounded-md font-bold text-[11px] transition-all duration-500 ${
                        ehTentativaDeHoje
                          ? "bg-emerald-600 text-white"
                          : qtd > 0
                          ? "bg-secondary text-secondary-foreground"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {qtd}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Rodapé do Modal: Próximo Termo & Compartilhamento */}
        {jogo.status !== "jogando" && (
          <div className="border-t border-border pt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-center sm:text-left space-y-0.5">
              <span className="text-xs font-semibold text-muted-foreground flex items-center justify-center sm:justify-start gap-1">
                <Clock size={13} />
                Próxima palavra em
              </span>
              <div className="font-mono text-xl sm:text-2xl font-bold tracking-wider text-foreground">
                {tempoRestante}
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Botao onClick={lidarCompartilhar} className="flex-1 sm:flex-none">
                <Share2 size={16} />
                Compartilhar
              </Botao>

              {aoJogarInfinito && (
                <Botao variante="neutro" onClick={aoJogarInfinito} className="flex-1 sm:flex-none">
                  <RotateCcw size={16} />
                  Modo Infinito
                </Botao>
              )}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
