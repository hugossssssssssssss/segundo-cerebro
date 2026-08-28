import { useState, useEffect, useCallback, useMemo } from "react";
import { GradeCruzadinha } from "./GradeCruzadinha";
import { ListaPistasCruzadinha } from "./ListaPistasCruzadinha";
import { TecladoTermo } from "../TecladoTermo";
import { Botao, Cartao, Modal } from "@/components/ui";
import {
  CheckCircle2,
  Sparkles,
  Trophy,
  Clock,
  ChevronDown,
  Eye,
  Trash2,
} from "lucide-react";
import { toast } from "@/lib/toast";
import {
  TABULEIROS_CRUZADINHA,
  obterCruzadinhaDoDia,
  type TabuleiroCruzadinha,
} from "@/lib/jogos/cruzadinha/bancoCruzadinhas";
import {
  montarMatrizCruzadinha,
  obterCoordenadasPista,
  verificarVitoriaCruzadinha,
  verificarRespostasCruzadinha,
  chaveCelula,
  type DirecaoPista,
} from "@/lib/jogos/cruzadinha/cruzadinhaEngine";
import {
  lerDadosCruzadinhaLocal,
  salvarDadosCruzadinhaLocal,
  type DadosCruzadinhaPersistidos,
} from "@/lib/jogos/cruzadinha/cruzadinhaStorage";
import { normalizarPalavra } from "@/lib/jogos/palavras";

export function JogoCruzadinha() {
  const [tabuleiroAtivoId, setTabuleiroAtivoId] = useState<string>(() => {
    const diaria = obterCruzadinhaDoDia();
    return diaria.id;
  });

  const tabuleiro: TabuleiroCruzadinha = useMemo(() => {
    return (
      TABULEIROS_CRUZADINHA.find((t) => t.id === tabuleiroAtivoId) ||
      TABULEIROS_CRUZADINHA[0]
    );
  }, [tabuleiroAtivoId]);

  const [dadosStorage, setDadosStorage] = useState<DadosCruzadinhaPersistidos>(() =>
    lerDadosCruzadinhaLocal()
  );

  // Letras digitadas na cruzadinha atual
  const [letrasDigitadas, setLetrasDigitadas] = useState<Record<string, string>>(() => {
    const salvo = lerDadosCruzadinhaLocal();
    return salvo.progresso[tabuleiroAtivoId]?.letrasDigitadas || {};
  });

  // Foco atual e direção
  const [celulaFoco, setCelulaFoco] = useState<{ linha: number; coluna: number } | null>(() => {
    // Procura primeira célula desbloqueada
    const p1 = tabuleiro.across[1] || Object.values(tabuleiro.across)[0];
    if (p1) return { linha: p1.linha, coluna: p1.coluna };
    return { linha: 0, coluna: 0 };
  });

  const [direcaoAtiva, setDirecaoAtiva] = useState<DirecaoPista>("across");
  const [statusVerificacao, setStatusVerificacao] = useState<Record<string, "correta" | "incorreta">>({});
  const [tempoSegundos, setTempoSegundos] = useState<number>(() => {
    return dadosStorage.progresso[tabuleiroAtivoId]?.tempoSegundos || 0;
  });

  const [jogoConcluido, setJogoConcluido] = useState<boolean>(() => {
    return dadosStorage.progresso[tabuleiroAtivoId]?.concluido || false;
  });
  const [modalVitoriaAberto, setModalVitoriaAberto] = useState(false);

  // Atualiza estado ao trocar de tabuleiro
  useEffect(() => {
    const prog = dadosStorage.progresso[tabuleiroAtivoId];
    setLetrasDigitadas(prog?.letrasDigitadas || {});
    setTempoSegundos(prog?.tempoSegundos || 0);
    setJogoConcluido(prog?.concluido || false);
    setStatusVerificacao({});

    const p1 = tabuleiro.across[1] || Object.values(tabuleiro.across)[0];
    if (p1) {
      setCelulaFoco({ linha: p1.linha, coluna: p1.coluna });
      setDirecaoAtiva("across");
    }
  }, [tabuleiroAtivoId, tabuleiro, dadosStorage.progresso]);

  // Cronômetro de tempo
  useEffect(() => {
    if (jogoConcluido) return;
    const interval = setInterval(() => {
      setTempoSegundos((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [jogoConcluido]);

  // Salvar periodicamente o progresso
  useEffect(() => {
    const novosDados: DadosCruzadinhaPersistidos = {
      ...dadosStorage,
      progresso: {
        ...dadosStorage.progresso,
        [tabuleiroAtivoId]: {
          letrasDigitadas,
          tempoSegundos,
          concluido: jogoConcluido,
          concluidoEm: jogoConcluido ? new Date().toISOString() : undefined,
        },
      },
      totalConcluidas: Object.values({
        ...dadosStorage.progresso,
        [tabuleiroAtivoId]: { concluido: jogoConcluido },
      }).filter((p: any) => p.concluido).length,
    };
    setDadosStorage(novosDados);
    salvarDadosCruzadinhaLocal(novosDados);
  }, [letrasDigitadas, tempoSegundos, jogoConcluido, tabuleiroAtivoId]);

  // Matriz atual do tabuleiro
  const matriz = useMemo(() => {
    return montarMatrizCruzadinha(tabuleiro, letrasDigitadas, statusVerificacao);
  }, [tabuleiro, letrasDigitadas, statusVerificacao]);

  // Número da pista ativa
  const pistaAtivaNum = useMemo(() => {
    if (!celulaFoco) return null;
    const cel = matriz[celulaFoco.linha]?.[celulaFoco.coluna];
    if (!cel || cel.bloqueada) return null;
    return direcaoAtiva === "across" ? cel.pistaAcross || null : cel.pistaDown || null;
  }, [celulaFoco, direcaoAtiva, matriz]);

  // Ações de Foco e Clique
  const lidarCliqueCelula = useCallback(
    (linha: number, coluna: number) => {
      const cel = matriz[linha]?.[coluna];
      if (!cel || cel.bloqueada) return;

      if (celulaFoco?.linha === linha && celulaFoco?.coluna === coluna) {
        // Alterna direção se clicar duas vezes na mesma célula
        if (cel.pistaAcross && cel.pistaDown) {
          setDirecaoAtiva((prev) => (prev === "across" ? "down" : "across"));
        }
      } else {
        setCelulaFoco({ linha, coluna });
        // Se a célula só pertence a uma direção, ajusta automaticamente
        if (cel.pistaAcross && !cel.pistaDown) {
          setDirecaoAtiva("across");
        } else if (!cel.pistaAcross && cel.pistaDown) {
          setDirecaoAtiva("down");
        }
      }
    },
    [celulaFoco, matriz]
  );

  const lidarSelecionarPista = useCallback(
    (direcao: DirecaoPista, numero: number) => {
      const coords = obterCoordenadasPista(tabuleiro, direcao, numero);
      if (coords.length > 0) {
        setDirecaoAtiva(direcao);
        setCelulaFoco(coords[0]);
      }
    },
    [tabuleiro]
  );

  // Inserir Letra e avançar cursor
  const inserirLetra = useCallback(
    (letra: string) => {
      if (jogoConcluido || !celulaFoco) return;
      const norm = normalizarPalavra(letra);
      if (!norm || norm.length !== 1) return;

      const { linha, coluna } = celulaFoco;
      const key = chaveCelula(linha, coluna);

      const novas = { ...letrasDigitadas, [key]: norm };
      setLetrasDigitadas(novas);

      // Limpa status de erro daquela célula
      if (statusVerificacao[key]) {
        setStatusVerificacao((prev) => {
          const cp = { ...prev };
          delete cp[key];
          return cp;
        });
      }

      // Verifica vitória instantânea
      if (verificarVitoriaCruzadinha(tabuleiro, novas)) {
        setJogoConcluido(true);
        setTimeout(() => setModalVitoriaAberto(true), 400);
        return;
      }

      // Avança para a próxima célula da palavra atual
      const coords = pistaAtivaNum
        ? obterCoordenadasPista(tabuleiro, direcaoAtiva, pistaAtivaNum)
        : [];
      const idxAtual = coords.findIndex(
        (c) => c.linha === linha && c.coluna === coluna
      );

      if (idxAtual !== -1 && idxAtual < coords.length - 1) {
        setCelulaFoco(coords[idxAtual + 1]);
      }
    },
    [
      jogoConcluido,
      celulaFoco,
      letrasDigitadas,
      statusVerificacao,
      tabuleiro,
      pistaAtivaNum,
      direcaoAtiva,
    ]
  );

  const apagarLetra = useCallback(() => {
    if (jogoConcluido || !celulaFoco) return;
    const { linha, coluna } = celulaFoco;
    const key = chaveCelula(linha, coluna);

    if (letrasDigitadas[key]) {
      setLetrasDigitadas((prev) => {
        const cp = { ...prev };
        delete cp[key];
        return cp;
      });
    } else {
      // Recua para a célula anterior
      const coords = pistaAtivaNum
        ? obterCoordenadasPista(tabuleiro, direcaoAtiva, pistaAtivaNum)
        : [];
      const idxAtual = coords.findIndex(
        (c) => c.linha === linha && c.coluna === coluna
      );
      if (idxAtual > 0) {
        const prevCoord = coords[idxAtual - 1];
        setCelulaFoco(prevCoord);
        const prevKey = chaveCelula(prevCoord.linha, prevCoord.coluna);
        setLetrasDigitadas((prev) => {
          const cp = { ...prev };
          delete cp[prevKey];
          return cp;
        });
      }
    }
  }, [jogoConcluido, celulaFoco, letrasDigitadas, pistaAtivaNum, tabuleiro, direcaoAtiva]);

  // Listener Global do Teclado Físico
  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (modalVitoriaAberto) return;

      const tecla = e.key;

      if (tecla === "Backspace" || tecla === "Delete") {
        e.preventDefault();
        apagarLetra();
      } else if (tecla === "ArrowLeft") {
        e.preventDefault();
        if (celulaFoco) {
          const novaCol = Math.max(0, celulaFoco.coluna - 1);
          if (!matriz[celulaFoco.linha][novaCol]?.bloqueada) {
            setCelulaFoco({ linha: celulaFoco.linha, coluna: novaCol });
            setDirecaoAtiva("across");
          }
        }
      } else if (tecla === "ArrowRight") {
        e.preventDefault();
        if (celulaFoco) {
          const novaCol = Math.min(tabuleiro.colunas - 1, celulaFoco.coluna + 1);
          if (!matriz[celulaFoco.linha][novaCol]?.bloqueada) {
            setCelulaFoco({ linha: celulaFoco.linha, coluna: novaCol });
            setDirecaoAtiva("across");
          }
        }
      } else if (tecla === "ArrowUp") {
        e.preventDefault();
        if (celulaFoco) {
          const novaLinha = Math.max(0, celulaFoco.linha - 1);
          if (!matriz[novaLinha]?.[celulaFoco.coluna]?.bloqueada) {
            setCelulaFoco({ linha: novaLinha, coluna: celulaFoco.coluna });
            setDirecaoAtiva("down");
          }
        }
      } else if (tecla === "ArrowDown") {
        e.preventDefault();
        if (celulaFoco) {
          const novaLinha = Math.min(tabuleiro.linhas - 1, celulaFoco.linha + 1);
          if (!matriz[novaLinha]?.[celulaFoco.coluna]?.bloqueada) {
            setCelulaFoco({ linha: novaLinha, coluna: celulaFoco.coluna });
            setDirecaoAtiva("down");
          }
        }
      } else if (/^[a-zA-ZçÇáàãâéêíóôõúüÁÀÃÂÉÊÍÓÔÕÚÜ]$/.test(tecla)) {
        if (e.repeat) return;
        e.preventDefault();
        inserirLetra(tecla);
      }
    };

    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [
    modalVitoriaAberto,
    celulaFoco,
    matriz,
    tabuleiro,
    inserirLetra,
    apagarLetra,
  ]);

  // Ações de Ferramentas
  const lidarVerificar = () => {
    const res = verificarRespostasCruzadinha(tabuleiro, letrasDigitadas);
    setStatusVerificacao(res.celulasStatus);

    if (res.incorretas === 0 && res.corretas === res.totalDesbloqueadas) {
      setJogoConcluido(true);
      setModalVitoriaAberto(true);
      toast("Parabéns! Você completou toda a cruzadinha! 🏆", { tipo: "sucesso" });
    } else if (res.incorretas > 0) {
      toast(`Encontradas ${res.incorretas} letra(s) incorreta(s).`, { tipo: "aviso" });
    } else {
      toast("Todas as letras preenchidas até agora estão corretas! Continue assim!", { tipo: "sucesso" });
    }
  };

  const lidarRevelarLetra = () => {
    if (!celulaFoco) return;
    const { linha, coluna } = celulaFoco;
    const cel = matriz[linha]?.[coluna];
    if (!cel || cel.bloqueada) return;

    const key = chaveCelula(linha, coluna);
    const novas = { ...letrasDigitadas, [key]: cel.letraCorreta };
    setLetrasDigitadas(novas);

    if (verificarVitoriaCruzadinha(tabuleiro, novas)) {
      setJogoConcluido(true);
      setModalVitoriaAberto(true);
    }
  };

  const lidarRevelarPalavra = () => {
    if (!celulaFoco || !pistaAtivaNum) return;
    const coords = obterCoordenadasPista(tabuleiro, direcaoAtiva, pistaAtivaNum);
    const novas = { ...letrasDigitadas };

    for (const { linha, coluna } of coords) {
      const cel = matriz[linha]?.[coluna];
      if (cel && !cel.bloqueada) {
        novas[chaveCelula(linha, coluna)] = cel.letraCorreta;
      }
    }

    setLetrasDigitadas(novas);

    if (verificarVitoriaCruzadinha(tabuleiro, novas)) {
      setJogoConcluido(true);
      setModalVitoriaAberto(true);
    }
  };

  const lidarLimparTudo = () => {
    setLetrasDigitadas({});
    setStatusVerificacao({});
    setJogoConcluido(false);
    toast("Cruzadinha reiniciada.", { tipo: "info" });
  };

  // Formatação de tempo
  const minutos = Math.floor(tempoSegundos / 60);
  const segundos = tempoSegundos % 60;
  const tempoFormatado = `${String(minutos).padStart(2, "0")}:${String(segundos).padStart(2, "0")}`;

  return (
    <div className="space-y-4 w-full">
      {/* Barra de Seleção de Tabuleiro & Cronômetro */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-2xl bg-card border border-border/80 shadow-2xs">
        <div className="flex items-center gap-2 flex-wrap">
          <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            Tabuleiro:
          </label>
          <div className="relative">
            <select
              value={tabuleiroAtivoId}
              onChange={(e) => setTabuleiroAtivoId(e.target.value)}
              className="appearance-none bg-secondary text-foreground text-xs font-bold rounded-xl px-3 py-1.5 pr-8 border border-border/60 focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
            >
              {TABULEIROS_CRUZADINHA.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.titulo} ({t.dificuldade})
                </option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-2.5 pointer-events-none opacity-60" />
          </div>
          <span className="text-xs text-muted-foreground hidden sm:inline">•</span>
          <span className="text-xs text-muted-foreground hidden sm:inline">{tabuleiro.tema}</span>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-3">
          <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-foreground bg-muted/60 px-2.5 py-1 rounded-xl">
            <Clock size={13} className="text-primary" />
            <span>{tempoFormatado}</span>
          </div>

          {jogoConcluido && (
            <span className="inline-flex items-center gap-1 text-xs font-bold text-[#3aa394] dark:text-[#3aa394] bg-[#3aa394]/15 px-2.5 py-1 rounded-xl">
              <CheckCircle2 size={13} />
              Concluído
            </span>
          )}
        </div>
      </div>

      {/* Grid Principal & Pistas */}
      <Cartao className="p-3 sm:p-5 bg-card/85 backdrop-blur-md shadow-sm border-border/80 space-y-4">
        <div className="flex flex-col lg:flex-row items-center lg:items-start justify-center gap-4 lg:gap-8">
          {/* Grade da Cruzadinha */}
          <div className="flex flex-col items-center">
            <GradeCruzadinha
              matriz={matriz}
              celulaFoco={celulaFoco}
              direcaoAtiva={direcaoAtiva}
              pistaAtivaNum={pistaAtivaNum}
              aoClicarCelula={lidarCliqueCelula}
            />

            {/* Ações de Verificação e Ajuda */}
            <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 pt-2">
              <Botao
                variante="primario"
                tamanho="pequeno"
                onClick={lidarVerificar}
                className="text-xs"
              >
                <CheckCircle2 size={14} />
                <span>Verificar</span>
              </Botao>
              <Botao
                variante="neutro"
                tamanho="pequeno"
                onClick={lidarRevelarLetra}
                className="text-xs"
                title="Revelar letra da casa selecionada"
              >
                <Eye size={14} />
                <span className="hidden sm:inline">Revelar Letra</span>
              </Botao>
              <Botao
                variante="neutro"
                tamanho="pequeno"
                onClick={lidarRevelarPalavra}
                className="text-xs"
                title="Revelar palavra da pista selecionada"
              >
                <Sparkles size={14} />
                <span className="hidden sm:inline">Revelar Palavra</span>
              </Botao>
              <Botao
                variante="neutro"
                tamanho="pequeno"
                onClick={lidarLimparTudo}
                className="text-xs text-muted-foreground hover:text-destructive"
                title="Limpar todas as letras"
              >
                <Trash2 size={14} />
              </Botao>
            </div>
          </div>

          {/* Painel de Pistas Horizontais e Verticais */}
          <div className="w-full lg:max-w-md flex-1">
            <ListaPistasCruzadinha
              tabuleiro={tabuleiro}
              direcaoAtiva={direcaoAtiva}
              pistaAtivaNum={pistaAtivaNum}
              aoSelecionarPista={lidarSelecionarPista}
            />
          </div>
        </div>

        {/* Teclado Virtual para suporte total ao touch */}
        <div className="pt-2 border-t border-border/40">
          <TecladoTermo
            statusTeclado={{}}
            tabuleiros={1}
            aoPressionarLetra={inserirLetra}
            aoConfirmar={lidarVerificar}
            aoApagar={apagarLetra}
            desabilitado={jogoConcluido}
          />
        </div>
      </Cartao>

      {/* Modal de Vitória */}
      <Modal
        aberto={modalVitoriaAberto}
        aoFechar={() => setModalVitoriaAberto(false)}
        titulo="Cruzadinha Concluída!"
      >
        <div className="space-y-4 text-center py-2">
          <div className="flex items-center justify-center gap-2 text-[#3aa394] font-extrabold text-2xl">
            <Trophy size={28} className="text-amber-500 animate-bounce" />
            <span>Excelente Trabalho!</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Você completou a cruzadinha <strong>"{tabuleiro.titulo}"</strong> em{" "}
            <strong>{tempoFormatado}</strong>!
          </p>

          <div className="pt-2 flex justify-center gap-2">
            <Botao onClick={() => setModalVitoriaAberto(false)}>Fechar</Botao>
          </div>
        </div>
      </Modal>
    </div>
  );
}
