import { useState, useEffect, useCallback, useMemo } from "react";
import { Botao, Cartao } from "@/components/ui";
import { GradeTermo, type TamanhoGrade } from "./GradeTermo";
import { TecladoTermo } from "./TecladoTermo";
import { ModalEstatisticasTermo } from "./ModalEstatisticasTermo";
import { ModalComoJogarTermo } from "./ModalComoJogarTermo";
import {
  HelpCircle,
  BarChart3,
  RotateCcw,
  Flame,
  Calendar,
  Infinity as InfinityIcon,
  Layers,
  Grid2X2,
  Sparkles,
} from "lucide-react";
import { toast } from "@/lib/toast";
import { lerConfig, configCompleta } from "@/lib/settings";
import { carregarRepo } from "@/lib/repo";
import {
  palavraExisteNoDicionario,
  normalizarPalavra,
  obterPalavrasDoDia,
  obterPalavraOriginal,
} from "@/lib/jogos/palavras";
import {
  TAMANHO_PALAVRA,
  CONFIG_MODOS,
  calcularStatusTecladoMulti,
  avaliarChute,
  type TipoJogo,
} from "@/lib/jogos/termoEngine";
import {
  lerDadosTermoLocal,
  carregarDadosTermo,
  gravarDadosTermo,
  atualizarEstatisticasComResultado,
  criarNovoJogo,
  type EstadoJogoGenerico,
  type DadosTermoPersistidos,
} from "@/lib/jogos/termoStorage";

export function JogoTermo() {
  const [tipoJogo, setTipoJogo] = useState<TipoJogo>("termo");
  const [ritmo, setRitmo] = useState<"diario" | "infinito">("diario");

  const [dadosPersistidos, setDadosPersistidos] = useState<DadosTermoPersistidos>(() =>
    lerDadosTermoLocal()
  );
  const [shaDados, setShaDados] = useState<string | undefined>();

  // Estados locais para jogos no modo infinito
  const [jogosInfinitos, setJogosInfinitos] = useState<Record<TipoJogo, EstadoJogoGenerico>>(() => ({
    termo: criarNovoJogo("termo", new Date(), "infinito"),
    dueto: criarNovoJogo("dueto", new Date(), "infinito"),
    quarteto: criarNovoJogo("quarteto", new Date(), "infinito"),
  }));

  // Jogo ativo atual baseado no tipo e ritmo selecionados
  const jogoAtivo: EstadoJogoGenerico =
    ritmo === "diario" ? dadosPersistidos.jogosDoDia[tipoJogo] : jogosInfinitos[tipoJogo];

  const configModo = CONFIG_MODOS[tipoJogo];
  const maxTentativas = configModo.tentativas;

  // 5 letras em digitação na linha ativa e índice da coluna em foco (0 a 4)
  const [letrasAtivas, setLetrasAtivas] = useState<string[]>(() =>
    new Array(TAMANHO_PALAVRA).fill("")
  );
  const [posicaoFoco, setPosicaoFoco] = useState<number>(0);
  const [linhaComErro, setLinhaComErro] = useState(false);
  const [revelandoLinhaIdx, setRevelandoLinhaIdx] = useState<number | undefined>();
  const [modalEstatisticasAberto, setModalEstatisticasAberto] = useState(false);
  const [modalComoJogarAberto, setModalComoJogarAberto] = useState(false);

  // Carregar dados sincronizados do GitHub ao montar
  useEffect(() => {
    let cancelado = false;
    const carregarRemoto = async () => {
      const cfg = lerConfig();
      if (!configCompleta(cfg)) return;

      try {
        const todos = await carregarRepo(cfg, { memoria: 10_000 });
        if (cancelado) return;
        const res = await carregarDadosTermo(cfg, todos);
        if (cancelado) return;
        setDadosPersistidos(res.dados);
        if (res.sha) setShaDados(res.sha);
      } catch {
        // fallback mantém dados locais
      }
    };

    carregarRemoto();
    return () => {
      cancelado = true;
    };
  }, []);

  // Detector de virada de meia-noite para os jogos diários
  useEffect(() => {
    const verificarMeiaNoite = () => {
      const agora = new Date();
      const infoHoje = obterPalavrasDoDia("termo", agora);
      if (dadosPersistidos.jogosDoDia.termo.dataIso !== infoHoje.dataIso) {
        const novosDados: DadosTermoPersistidos = {
          ...dadosPersistidos,
          jogosDoDia: {
            termo: criarNovoJogo("termo", agora, "diario"),
            dueto: criarNovoJogo("dueto", agora, "diario"),
            quarteto: criarNovoJogo("quarteto", agora, "diario"),
          },
        };
        setDadosPersistidos(novosDados);
        setLetrasAtivas(new Array(TAMANHO_PALAVRA).fill(""));
        setPosicaoFoco(0);
        const cfg = lerConfig();
        gravarDadosTermo(cfg, novosDados, shaDados);
        toast("Novas palavras do dia liberadas! Boa sorte! 🎯", { tipo: "sucesso" });
      }
    };

    const interval = setInterval(verificarMeiaNoite, 30_000);
    return () => clearInterval(interval);
  }, [dadosPersistidos, shaDados]);

  // Mapa de status das teclas multi-tabuleiro
  const statusTecladoMulti = useMemo(() => {
    return calcularStatusTecladoMulti(
      jogoAtivo.tentativasPorTabuleiro,
      jogoAtivo.palavras
    );
  }, [jogoAtivo.tentativasPorTabuleiro, jogoAtivo.palavras]);

  // Ações de Digitação e Foco de Célula
  const focarCelula = useCallback((colIdx: number) => {
    if (colIdx >= 0 && colIdx < TAMANHO_PALAVRA) {
      setPosicaoFoco(colIdx);
    }
  }, []);

  const inserirLetra = useCallback(
    (letra: string) => {
      if (jogoAtivo.status !== "jogando") return;

      const norm = normalizarPalavra(letra);
      if (!norm || norm.length !== 1) return;

      setLetrasAtivas((prev) => {
        const novas = [...prev];
        novas[posicaoFoco] = norm;
        return novas;
      });

      // Avança o foco para a próxima casa
      setPosicaoFoco((prev) => {
        if (prev < TAMANHO_PALAVRA - 1) {
          return prev + 1;
        }
        return prev;
      });
    },
    [jogoAtivo.status, posicaoFoco]
  );

  const apagarLetra = useCallback(() => {
    if (jogoAtivo.status !== "jogando") return;

    setLetrasAtivas((prev) => {
      const novas = [...prev];
      if (novas[posicaoFoco] !== "") {
        novas[posicaoFoco] = "";
        return novas;
      } else if (posicaoFoco > 0) {
        novas[posicaoFoco - 1] = "";
        setPosicaoFoco((p) => Math.max(0, p - 1));
        return novas;
      }
      return prev;
    });
  }, [jogoAtivo.status, posicaoFoco]);

  const dispararAnimacaoErro = () => {
    setLinhaComErro(true);
    setTimeout(() => setLinhaComErro(false), 600);
  };

  const confirmarPalavra = useCallback(async () => {
    if (jogoAtivo.status !== "jogando") return;

    const palavraDigitada = letrasAtivas.join("");

    if (palavraDigitada.length < TAMANHO_PALAVRA || letrasAtivas.some((l) => !l.trim())) {
      dispararAnimacaoErro();
      toast("Preencha todas as 5 letras da palavra.", { tipo: "aviso" });
      return;
    }

    if (!palavraExisteNoDicionario(palavraDigitada)) {
      dispararAnimacaoErro();
      toast("Palavra não reconhecida no dicionário.", { tipo: "erro" });
      return;
    }

    const chute = normalizarPalavra(palavraDigitada);
    const novasTentativasGerais = [...jogoAtivo.tentativasGerais, chute];
    const indiceLinha = jogoAtivo.tentativasGerais.length;

    // Disparar animação de revelação da linha
    setRevelandoLinhaIdx(indiceLinha);
    setTimeout(() => setRevelandoLinhaIdx(undefined), TAMANHO_PALAVRA * 150 + 200);

    const qtdTabuleiros = configModo.tabuleiros;
    const novasTentativasPorTab = jogoAtivo.tentativasPorTabuleiro.map((arr) => [...arr]);
    const novosResolvidos = [...jogoAtivo.resolvidos];

    for (let tIdx = 0; tIdx < qtdTabuleiros; tIdx++) {
      if (!jogoAtivo.resolvidos[tIdx]) {
        novasTentativasPorTab[tIdx].push(chute);
        const avaliacao = avaliarChute(chute, jogoAtivo.palavras[tIdx]);
        if (avaliacao.ehCorreta) {
          novosResolvidos[tIdx] = true;
        }
      }
    }

    const todosVenceram = novosResolvidos.every((r) => r);
    const esgotouTentativas = novasTentativasGerais.length >= maxTentativas;
    const novoStatus = todosVenceram ? "venceu" : esgotouTentativas ? "perdeu" : "jogando";

    setLetrasAtivas(new Array(TAMANHO_PALAVRA).fill(""));
    setPosicaoFoco(0);

    if (ritmo === "diario") {
      let novasStatsModo = dadosPersistidos.estatisticas[tipoJogo];
      if (novoStatus !== "jogando") {
        novasStatsModo = atualizarEstatisticasComResultado(
          novasStatsModo,
          todosVenceram,
          novasTentativasGerais.length,
          jogoAtivo.dataIso
        );
      }

      const novosDados: DadosTermoPersistidos = {
        ...dadosPersistidos,
        jogosDoDia: {
          ...dadosPersistidos.jogosDoDia,
          [tipoJogo]: {
            ...jogoAtivo,
            tentativasGerais: novasTentativasGerais,
            tentativasPorTabuleiro: novasTentativasPorTab,
            resolvidos: novosResolvidos,
            status: novoStatus,
            finalizadoEm: novoStatus !== "jogando" ? new Date().toISOString() : undefined,
          },
        },
        estatisticas: {
          ...dadosPersistidos.estatisticas,
          [tipoJogo]: novasStatsModo,
        },
      };

      setDadosPersistidos(novosDados);

      const cfg = lerConfig();
      const resGravar = await gravarDadosTermo(cfg, novosDados, shaDados);
      if (resGravar.sha) setShaDados(resGravar.sha);

      if (novoStatus !== "jogando") {
        setTimeout(() => {
          setModalEstatisticasAberto(true);
        }, 1200);
      }
    } else {
      const novoJogoInfinito: EstadoJogoGenerico = {
        ...jogoAtivo,
        tentativasGerais: novasTentativasGerais,
        tentativasPorTabuleiro: novasTentativasPorTab,
        resolvidos: novosResolvidos,
        status: novoStatus,
        finalizadoEm: novoStatus !== "jogando" ? new Date().toISOString() : undefined,
      };

      setJogosInfinitos((prev) => ({
        ...prev,
        [tipoJogo]: novoJogoInfinito,
      }));

      if (novoStatus !== "jogando") {
        setTimeout(() => {
          setModalEstatisticasAberto(true);
        }, 1200);
      }
    }
  }, [
    jogoAtivo,
    letrasAtivas,
    tipoJogo,
    ritmo,
    dadosPersistidos,
    shaDados,
    configModo.tabuleiros,
    maxTentativas,
  ]);

  // Listener Global Robusto para Teclado Físico
  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (modalEstatisticasAberto || modalComoJogarAberto) return;

      const tecla = e.key;

      if (tecla === "Enter") {
        e.preventDefault();
        confirmarPalavra();
      } else if (tecla === "Backspace" || tecla === "Delete") {
        e.preventDefault();
        apagarLetra();
      } else if (tecla === "ArrowLeft") {
        e.preventDefault();
        setPosicaoFoco((prev) => Math.max(0, prev - 1));
      } else if (tecla === "ArrowRight") {
        e.preventDefault();
        setPosicaoFoco((prev) => Math.min(TAMANHO_PALAVRA - 1, prev + 1));
      } else if (/^[a-zA-ZçÇáàãâéêíóôõúüÁÀÃÂÉÊÍÓÔÕÚÜ]$/.test(tecla)) {
        if (e.repeat) return;
        e.preventDefault();
        inserirLetra(tecla);
      }
    };

    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [
    modalEstatisticasAberto,
    modalComoJogarAberto,
    confirmarPalavra,
    apagarLetra,
    inserirLetra,
  ]);

  const iniciarNovaPartidaInfinita = () => {
    const novo = criarNovoJogo(tipoJogo, new Date(), "infinito");
    setJogosInfinitos((prev) => ({
      ...prev,
      [tipoJogo]: novo,
    }));
    setLetrasAtivas(new Array(TAMANHO_PALAVRA).fill(""));
    setPosicaoFoco(0);
    setModalEstatisticasAberto(false);
  };

  const trocarTipoJogo = (novoTipo: TipoJogo) => {
    setTipoJogo(novoTipo);
    setLetrasAtivas(new Array(TAMANHO_PALAVRA).fill(""));
    setPosicaoFoco(0);
  };

  const trocarRitmo = (novoRitmo: "diario" | "infinito") => {
    setRitmo(novoRitmo);
    setLetrasAtivas(new Array(TAMANHO_PALAVRA).fill(""));
    setPosicaoFoco(0);
  };

  const streakAtual = dadosPersistidos.estatisticas[tipoJogo]?.sequenciaAtual || 0;
  const tamanhoGrade: TamanhoGrade =
    tipoJogo === "quarteto" ? "mini" : tipoJogo === "dueto" ? "compacto" : "padrao";

  return (
    <div className="space-y-3 sm:space-y-4 w-full">
      {/* Barra de Controle: Seletor de Modalidade + Ritmo */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 p-1.5 sm:p-2 rounded-2xl border border-border bg-card/75 backdrop-blur-md shadow-2xs">
        {/* Abas dos Tipos de Jogo (Termo, Dueto, Quarteto) */}
        <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => trocarTipoJogo("termo")}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              tipoJogo === "termo"
                ? "bg-card text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <span>Termo</span>
            <span className="text-[10px] opacity-70 font-mono font-normal">(1)</span>
          </button>

          <button
            type="button"
            onClick={() => trocarTipoJogo("dueto")}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              tipoJogo === "dueto"
                ? "bg-card text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Layers size={13} />
            <span>Dueto</span>
            <span className="text-[10px] opacity-70 font-mono font-normal">(2)</span>
          </button>

          <button
            type="button"
            onClick={() => trocarTipoJogo("quarteto")}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              tipoJogo === "quarteto"
                ? "bg-card text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Grid2X2 size={13} />
            <span>Quarteto</span>
            <span className="text-[10px] opacity-70 font-mono font-normal">(4)</span>
          </button>
        </div>

        {/* Alternador de Ritmo (Diário / Infinito) e Ações */}
        <div className="flex items-center justify-between sm:justify-end gap-1.5 sm:gap-2">
          <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => trocarRitmo("diario")}
              className={`flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                ritmo === "diario"
                  ? "bg-primary text-primary-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Calendar size={12} />
              <span>Diário</span>
            </button>

            <button
              type="button"
              onClick={() => trocarRitmo("infinito")}
              className={`flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                ritmo === "infinito"
                  ? "bg-primary text-primary-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <InfinityIcon size={12} />
              <span>Infinito</span>
            </button>
          </div>

          <div className="flex items-center gap-1">
            <Botao
              variante="neutro"
              tamanho="pequeno"
              onClick={() => setModalComoJogarAberto(true)}
              className="text-xs h-8 px-2"
              title="Como jogar"
            >
              <HelpCircle size={14} />
            </Botao>
            <Botao
              variante="neutro"
              tamanho="pequeno"
              onClick={() => setModalEstatisticasAberto(true)}
              className="text-xs h-8 px-2"
              title="Ver estatísticas"
            >
              <BarChart3 size={14} />
            </Botao>
          </div>

          {ritmo === "diario" ? (
            <div className="flex items-center gap-1 text-xs font-bold text-amber-600 dark:text-amber-400 px-2 py-1 bg-amber-500/10 rounded-lg shrink-0">
              <Flame size={13} className="fill-amber-500" />
              <span>{streakAtual} d</span>
            </div>
          ) : (
            <Botao
              variante="neutro"
              tamanho="pequeno"
              onClick={iniciarNovaPartidaInfinita}
              className="text-xs shrink-0 h-8 px-2.5"
              title="Sortear nova palavra"
            >
              <RotateCcw size={12} />
              <span className="hidden sm:inline">Nova Palavra</span>
            </Botao>
          )}
        </div>
      </div>

      {/* Área Principal do Termo */}
      <Cartao className="flex flex-col items-center justify-center p-1 sm:p-4 bg-card/85 backdrop-blur-md shadow-sm border-border/80 w-full">
        <div className="w-full flex flex-col items-center gap-2 sm:gap-3.5">
          {jogoAtivo.status === "jogando" && (
            <div className="text-[11px] text-muted-foreground text-center select-none flex items-center gap-1 px-1">
              <span>Toque na casa para editar ou use as setas ← → do teclado</span>
            </div>
          )}

          {/* Grades */}
          <div
            className={`w-full ${
              tipoJogo === "termo"
                ? "flex justify-center max-w-xs sm:max-w-sm"
                : tipoJogo === "dueto"
                ? "grid grid-cols-2 gap-1.5 sm:gap-4 max-w-3xl lg:max-w-4xl"
                : "grid grid-cols-2 gap-1 sm:gap-3 max-w-3xl lg:max-w-4xl"
            }`}
          >
            {jogoAtivo.palavras.map((palavra, tIdx) => {
              const resolvido = jogoAtivo.resolvidos[tIdx];
              return (
                <div
                  key={`tabuleiro-${tipoJogo}-${tIdx}`}
                  className="flex flex-col items-center relative p-0.5 sm:p-2 rounded-xl sm:rounded-2xl bg-secondary/15 sm:bg-secondary/25 border border-border/40 shadow-2xs"
                >
                  {tipoJogo !== "termo" && (
                    <div className="flex items-center justify-between w-full px-1 sm:px-1.5 pb-0.5 sm:pb-1 text-[11px] sm:text-xs font-bold text-muted-foreground">
                      <span>Palavra {tIdx + 1}</span>
                      {resolvido ? (
                        <span className="text-[#3aa394] dark:text-[#3aa394] flex items-center gap-0.5 text-[10px] sm:text-xs font-extrabold">
                          <Sparkles size={11} />
                          {obterPalavraOriginal(palavra)}
                        </span>
                      ) : (
                        <span className="text-[10px] sm:text-[11px] opacity-60 font-mono">
                          {jogoAtivo.tentativasPorTabuleiro[tIdx]?.length || 0}/{maxTentativas}
                        </span>
                      )}
                    </div>
                  )}

                  <GradeTermo
                    tentativas={jogoAtivo.tentativasPorTabuleiro[tIdx] || []}
                    letrasAtivas={letrasAtivas}
                    posicaoFoco={posicaoFoco}
                    solucao={palavra}
                    linhaComErro={linhaComErro}
                    revelandoLinhaIdx={revelandoLinhaIdx}
                    maxTentativas={maxTentativas}
                    resolvido={resolvido}
                    aoClicarCelula={focarCelula}
                    tamanho={tamanhoGrade}
                  />
                </div>
              );
            })}
          </div>

          {/* Feedback Final */}
          {jogoAtivo.status !== "jogando" && (
            <div className="flex items-center justify-center gap-2 pt-1 animate-in fade-in duration-300">
              <Botao
                variante="primario"
                tamanho="pequeno"
                onClick={() => setModalEstatisticasAberto(true)}
              >
                <BarChart3 size={15} />
                Ver Resultado e Estatísticas
              </Botao>
              {ritmo === "infinito" && (
                <Botao
                  variante="neutro"
                  tamanho="pequeno"
                  onClick={iniciarNovaPartidaInfinita}
                >
                  <RotateCcw size={15} />
                  Jogar Novamente
                </Botao>
              )}
            </div>
          )}

          {/* Teclado */}
          <TecladoTermo
            statusTeclado={statusTecladoMulti}
            tabuleiros={configModo.tabuleiros}
            resolvidos={jogoAtivo.resolvidos}
            aoPressionarLetra={inserirLetra}
            aoConfirmar={confirmarPalavra}
            aoApagar={apagarLetra}
            desabilitado={jogoAtivo.status !== "jogando"}
          />
        </div>
      </Cartao>

      {/* Modais */}
      <ModalEstatisticasTermo
        aberto={modalEstatisticasAberto}
        aoFechar={() => setModalEstatisticasAberto(false)}
        jogo={jogoAtivo}
        estatisticas={dadosPersistidos.estatisticas[tipoJogo]}
        tipoJogo={tipoJogo}
        aoJogarInfinito={
          ritmo === "diario"
            ? () => {
                setModalEstatisticasAberto(false);
                setRitmo("infinito");
              }
            : iniciarNovaPartidaInfinita
        }
      />

      <ModalComoJogarTermo
        aberto={modalComoJogarAberto}
        aoFechar={() => setModalComoJogarAberto(false)}
      />
    </div>
  );
}
