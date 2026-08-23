import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import { useTimer } from "react-timer-hook";
import { type Tarefa } from "@/lib/tipos";
import { lerConfig } from "@/lib/settings";
import { carregarRepo, atualizarCacheLocal } from "@/lib/repo";
import { ler } from "@/lib/github";
import { lerMarkdown, escreverMarkdown } from "@/lib/markdown";
import { comoTarefa, tarefaParaArquivo } from "@/lib/entidades";
import { registrarCiclo } from "@/lib/tarefas";
import { salvarRascunhoLocal, sincronizarFilaOffline } from "@/lib/offlineQueue";
import {
  type LogTempo,
  CAMINHO_TELEMETRIA,
  extrairLogsTelemetria,
  obterShaTelemetria,
  adicionarLog,
} from "@/lib/telemetria";
import { toast } from "@/lib/toast";
import { ModalConfirmacao } from "@/components/ui";

export const LISTA_SONS_AMBIENTE = [
  { id: "chuva", nome: "Chuva Forte", url: "https://cdn.jsdelivr.net/gh/rivea0/ambient-sounds-web-components/src/assets/heavy-rain/heavy-rain.mp3" },
  { id: "fogueira", nome: "Fogueira", url: "https://cdn.jsdelivr.net/gh/rivea0/ambient-sounds-web-components/src/assets/fire/fire.mp3" },
  { id: "cafeteria", nome: "Cafeteria", url: "https://cdn.jsdelivr.net/gh/rivea0/ambient-sounds-web-components/src/assets/coffee-shop/coffee-shop.mp3" },
  { id: "vento", nome: "Vento do Vale", url: "https://cdn.jsdelivr.net/gh/rivea0/ambient-sounds-web-components/src/assets/wind/wind.mp3" },
  { id: "ondas", nome: "Ondas do Mar", url: "https://cdn.jsdelivr.net/gh/rivea0/ambient-sounds-web-components/src/assets/waves/waves.mp3" },
  { id: "passaros", nome: "Pássaros na Floresta", url: "https://cdn.jsdelivr.net/gh/rivea0/ambient-sounds-web-components/src/assets/birds/birds.mp3" },
];

interface ConfigPomodoro {
  tempoFoco: number; // minutos
  tempoPausa: number; // minutos
}

interface ContextoCronometroProps {
  tarefa: Tarefa | null;
  rodando: boolean;
  modo: "foco" | "pausa";
  restante: number; // em segundos
  total: number; // segundos totais do ciclo
  config: ConfigPomodoro;
  metaDiaria: number;
  concluidosHoje: number;
  somAmbiente: string | null;
  setSomAmbiente: (som: string | null) => void;
  somAmbienteTocando: boolean;
  setSomAmbienteTocando: (tocando: boolean) => void;
  volumeSomAmbiente: number;
  setVolumeSomAmbiente: (vol: number) => void;
  iniciar: (tarefa: Tarefa) => void;
  pausar: () => void;
  retomar: () => void;
  reiniciar: () => void;
  parar: () => void;
  salvarConfig: (novas: ConfigPomodoro) => void;
}

const ContextoCronometro = createContext<ContextoCronometroProps | undefined>(undefined);

function carregarConfigPomodoro(): ConfigPomodoro {
  try {
    const salvo = localStorage.getItem("pomodoro-config");
    if (salvo) {
      const parsed = JSON.parse(salvo);
      if (typeof parsed.tempoFoco === "number" && typeof parsed.tempoPausa === "number") {
        return parsed;
      }
    }
  } catch {
    /* fallback */
  }
  return { tempoFoco: 25, tempoPausa: 5 };
}

export function CronometroProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfigState] = useState<ConfigPomodoro>(carregarConfigPomodoro);
  const [tarefa, setTarefa] = useState<Tarefa | null>(null);
  const [modo, setModo] = useState<"foco" | "pausa">("foco");
  const [conflito, setConflito] = useState<{ tarefaPendente: Tarefa } | null>(null);
  
  // Metas diárias
  const [metaDiaria, setMetaDiaria] = useState(5);
  const [concluidosHoje, setConcluidosHoje] = useState(0);

  // Som ambiente
  const [somAmbiente, setSomAmbienteState] = useState<string | null>(() => {
    return localStorage.getItem("klaus-som-ambiente");
  });
  const [somAmbienteTocando, setSomAmbienteTocandoState] = useState<boolean>(false);
  const [volumeSomAmbiente, setVolumeSomAmbienteState] = useState<number>(() => {
    const salvo = localStorage.getItem("klaus-volume-som");
    return salvo ? Number(salvo) : 0.5;
  });
  const audioAmbienteRef = useRef<HTMLAudioElement | null>(null);

  const setSomAmbiente = useCallback((novoSom: string | null) => {
    setSomAmbienteState(novoSom);
    if (novoSom) {
      localStorage.setItem("klaus-som-ambiente", novoSom);
      setSomAmbienteTocandoState(true); // Se selecionar, dá play
    } else {
      localStorage.removeItem("klaus-som-ambiente");
      setSomAmbienteTocandoState(false);
    }
  }, []);

  const setSomAmbienteTocando = useCallback((tocando: boolean) => {
    setSomAmbienteTocandoState(tocando);
  }, []);

  const setVolumeSomAmbiente = useCallback((vol: number) => {
    const v = Math.max(0, Math.min(1, vol));
    setVolumeSomAmbienteState(v);
    localStorage.setItem("klaus-volume-som", String(v));
    if (audioAmbienteRef.current) {
      audioAmbienteRef.current.volume = v;
    }
  }, []);

  const fimEmRef = useRef<number | null>(null);
  const tarefaRef = useRef<Tarefa | null>(null);
  const modoRef = useRef<"foco" | "pausa">("foco");
  const configRef = useRef<ConfigPomodoro>(config);

  // Sincroniza refs para evitar stale closures em callbacks assíncronos
  useEffect(() => { tarefaRef.current = tarefa; }, [tarefa]);
  useEffect(() => { modoRef.current = modo; }, [modo]);
  useEffect(() => { configRef.current = config; }, [config]);

  const total = (modo === "foco" ? config.tempoFoco : config.tempoPausa) * 60;

  // Inicializa o useTimer do react-timer-hook
  const {
    seconds,
    minutes,
    isRunning,
    pause,
    restart,
  } = useTimer({
    expiryTimestamp: new Date(),
    onExpire: () => {
      lidarComTermino();
    },
    autoStart: false,
  });

  const restante = minutes * 60 + seconds;

  // Conclusão com sucesso do ciclo
  const lidarComTermino = useCallback(async () => {
    const t = tarefaRef.current;
    if (!t) return;

    const modoTerminado = modoRef.current;
    const duracaoMinutos = modoTerminado === "foco" ? configRef.current.tempoFoco : configRef.current.tempoPausa;

    try {
      const cfg = lerConfig();

      if (modoTerminado === "foco") {
        // 1. Grava telemetria como "Completo"
        const acervo = await carregarRepo(cfg, { memoria: 30_000 });
        const logs = extrairLogsTelemetria(acervo);
        const shaTelemetria = obterShaTelemetria(acervo);
        const novoLog: LogTempo = {
          data: new Date().toISOString(),
          tarefaCaminho: t.caminho,
          tarefaTitulo: t.titulo,
          duracaoSegundos: duracaoMinutos * 60,
          modo: "foco",
          status: "Completo",
        };

        const textoTelemetria = adicionarLog(logs, novoLog);
        salvarRascunhoLocal(CAMINHO_TELEMETRIA, textoTelemetria, shaTelemetria, `Foco concluído em "${t.titulo}"`, false, "gravar");
        atualizarCacheLocal(CAMINHO_TELEMETRIA, textoTelemetria, lerMarkdown(textoTelemetria), shaTelemetria || `temp_${Math.random()}`);

        // 2. Grava ciclo de tempo na própria tarefa
        let textoTarefa = "";
        let shaTarefa = t.sha;
        try {
          const arq = await ler(cfg, t.caminho);
          textoTarefa = arq.texto;
          shaTarefa = arq.sha;
        } catch {
          // Fallback para o estado local se houver falha de rede
          const { corpo } = tarefaParaArquivo(t);
          textoTarefa = escreverMarkdown({ dados: t.bruto, corpo });
        }

        const docTarefa = lerMarkdown(textoTarefa);
        const tarefaEntidade = comoTarefa(docTarefa, t.caminho, shaTarefa, t.titulo);
        const novoCorpo = registrarCiclo(docTarefa.corpo, duracaoMinutos);

        const tarefaAtualizada = { ...tarefaEntidade, corpo: novoCorpo };
        const { dados: dadosNovos, corpo: corpoNovo } = tarefaParaArquivo(tarefaAtualizada);
        const textoNovo = escreverMarkdown({ dados: dadosNovos, corpo: corpoNovo });

        salvarRascunhoLocal(t.caminho, textoNovo, shaTarefa, `+${duracaoMinutos}min em ${t.titulo}`, false, "gravar");
        atualizarCacheLocal(t.caminho, textoNovo, lerMarkdown(textoNovo), shaTarefa);

        window.dispatchEvent(new CustomEvent("acervo-atualizado"));

        if (navigator.onLine) {
          sincronizarFilaOffline(cfg).catch(() => {});
        }

        toast(`Ciclo de foco concluído para: ${t.titulo}!`, { tipo: "sucesso" });

        // Muda para descanso (pausa), mas de forma MANUAL (autoStart = false)
        setModo("pausa");
        const tempoSegundos = configRef.current.tempoPausa * 60;
        fimEmRef.current = null;
        restart(new Date(Date.now() + tempoSegundos * 1000), false);
      } else {
        // Terminou a pausa, muda para foco mas aguarda play ativo (MANUAL)
        toast("Seu descanso acabou. Clique em iniciar foco para continuar!", { tipo: "info" });
        setModo("foco");
        const tempoSegundos = configRef.current.tempoFoco * 60;
        fimEmRef.current = null;
        restart(new Date(Date.now() + tempoSegundos * 1000), false);
      }

      setSomAmbienteTocandoState(false);
 
      // Alerta sonoro básico
      try {
        new Audio(
          "data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=",
        ).play();
      } catch {
        /* sem som */
      }
    } catch (e) {
      console.error("Erro ao concluir ciclo:", e);
    }
  }, [restart]);

  // Interrupção manual ou cancelamento do timer (Registra Fratura)
  const parar = useCallback(async () => {
    const t = tarefaRef.current;
    if (!t) return;

    const isFoco = modoRef.current === "foco";
    const segundosTotais = (isFoco ? configRef.current.tempoFoco : configRef.current.tempoPausa) * 60;
    const segundosPassados = segundosTotais - restante;

    // Só grava interrupção se rodou por mais de 60 segundos de foco
    if (isFoco && segundosPassados >= 60) {
      try {
        const cfg = lerConfig();
        const acervo = await carregarRepo(cfg, { memoria: 30_000 });
        const logs = extrairLogsTelemetria(acervo);
        const shaTelemetria = obterShaTelemetria(acervo);
        
        // 1. Grava na telemetria
        const novoLog: LogTempo = {
          data: new Date().toISOString(),
          tarefaCaminho: t.caminho,
          tarefaTitulo: t.titulo,
          duracaoSegundos: segundosPassados,
          modo: "foco",
          status: "Interrompido",
        };

        const textoTelemetria = adicionarLog(logs, novoLog);
        salvarRascunhoLocal(CAMINHO_TELEMETRIA, textoTelemetria, shaTelemetria, `Foco interrompido (${Math.round(segundosPassados / 60)}min)`, false, "gravar");
        atualizarCacheLocal(CAMINHO_TELEMETRIA, textoTelemetria, lerMarkdown(textoTelemetria), shaTelemetria || `temp_${Math.random()}`);

        // 2. Grava a FRATURA na própria tarefa (Frontmatter: PomodoroFraturado)
        let textoTarefa = "";
        let shaTarefa = t.sha;
        try {
          const arq = await ler(cfg, t.caminho);
          textoTarefa = arq.texto;
          shaTarefa = arq.sha;
        } catch {
          const { corpo } = tarefaParaArquivo(t);
          textoTarefa = escreverMarkdown({ dados: t.bruto, corpo });
        }

        const docTarefa = lerMarkdown(textoTarefa);
        const tarefaEntidade = comoTarefa(docTarefa, t.caminho, shaTarefa, t.titulo);
        
        // Incrementa o número de fraturas (limite máximo de 5)
        const novasFraturas = Math.min((tarefaEntidade.fraturados || 0) + 1, 5);
        const tarefaAtualizada = { ...tarefaEntidade, fraturados: novasFraturas };
        const { dados: dadosNovos, corpo: corpoNovo } = tarefaParaArquivo(tarefaAtualizada);
        const textoNovo = escreverMarkdown({ dados: dadosNovos, corpo: corpoNovo });

        salvarRascunhoLocal(t.caminho, textoNovo, shaTarefa, `Fratura registrada em "${t.titulo}"`, false, "gravar");
        atualizarCacheLocal(t.caminho, textoNovo, lerMarkdown(textoNovo), shaTarefa);

        window.dispatchEvent(new CustomEvent("acervo-atualizado"));

        if (navigator.onLine) {
          sincronizarFilaOffline(cfg).catch(() => {});
        }

        toast(`Prisma de foco interrompido para "${t.titulo}".`, { tipo: "info" });
      } catch (e) {
        console.error("Erro ao gravar interrupção:", e);
      }
    }

    setTarefa(null);
    setModo("foco");
    fimEmRef.current = null;
    setSomAmbienteTocandoState(false);
    pause();
  }, [restante, pause]);

  // Controles
  const iniciar = useCallback((novaTarefa: Tarefa) => {
    const ativa = tarefaRef.current;
    if (ativa && isRunning && ativa.caminho !== novaTarefa.caminho) {
      // Conflito! Pergunta ao usuário
      setConflito({ tarefaPendente: novaTarefa });
      return;
    }

    setTarefa(novaTarefa);
    setModo("foco");
    const tempoSegundos = config.tempoFoco * 60;
    fimEmRef.current = Date.now() + tempoSegundos * 1000;
    restart(new Date(Date.now() + tempoSegundos * 1000), true);
    if (somAmbiente) setSomAmbienteTocandoState(true);
  }, [config.tempoFoco, isRunning, restart, somAmbiente]);

  const pausar = useCallback(() => {
    fimEmRef.current = null;
    setSomAmbienteTocandoState(false);
    pause();
  }, [pause]);

  const retomar = useCallback(() => {
    fimEmRef.current = Date.now() + restante * 1000;
    restart(new Date(Date.now() + restante * 1000), true);
    if (somAmbiente) setSomAmbienteTocandoState(true);
  }, [restante, restart, somAmbiente]);

  const reiniciar = useCallback(() => {
    fimEmRef.current = isRunning ? Date.now() + total * 1000 : null;
    restart(new Date(Date.now() + total * 1000), isRunning);
  }, [isRunning, total, restart]);

  const salvarConfig = useCallback((novas: ConfigPomodoro) => {
    setConfigState(novas);
    localStorage.setItem("pomodoro-config", JSON.stringify(novas));
    if (!isRunning) {
      const nTotal = (modoRef.current === "foco" ? novas.tempoFoco : novas.tempoPausa) * 60;
      restart(new Date(Date.now() + nTotal * 1000), false);
    }
  }, [isRunning, restart]);

  // Resolve troca confirmada no modal de conflito
  const resolverConflito = useCallback(() => {
    if (!conflito) return;
    const pendente = conflito.tarefaPendente;
    setConflito(null);

    // Salva a interrupção da tarefa ativa e depois inicia a nova
    parar().then(() => {
      setTarefa(pendente);
      setModo("foco");
      const tempoSegundos = config.tempoFoco * 60;
      fimEmRef.current = Date.now() + tempoSegundos * 1000;
      restart(new Date(Date.now() + tempoSegundos * 1000), true);
    });
  }, [conflito, config.tempoFoco, parar, restart]);

  // Lógica de cálculo da Meta Diária Dinâmica
  const recalcularMetasDiarias = useCallback(async () => {
    try {
      const cfg = lerConfig();
      const acervo = await carregarRepo(cfg, { memoria: 30_000 });
      const logs = extrairLogsTelemetria(acervo);

      // Determina fuso local hoje (YYYY-MM-DD)
      const d = new Date();
      const ano = d.getFullYear();
      const mes = String(d.getMonth() + 1).padStart(2, "0");
      const dia = String(d.getDate()).padStart(2, "0");
      const hojeLocal = `${ano}-${mes}-${dia}`;

      // 1. Calcula concluídos hoje
      const logsHoje = logs.filter((l) => {
        const diaLog = l.data.slice(0, 10);
        return diaLog === hojeLocal && l.modo === "foco" && l.status === "Completo";
      });
      setConcluidosHoje(logsHoje.length);

      // 2. Calcula meta diária baseado nos últimos 7 dias
      const logsUltimaSemana = logs.filter((l) => {
        if (l.modo !== "foco" || l.status !== "Completo") return false;
        const tempoDiferenca = Date.now() - new Date(l.data).getTime();
        return tempoDiferenca <= 7 * 24 * 60 * 60 * 1000;
      });

      // Agrupa concluídos por dia
      const focosPorDia: Record<string, number> = {};
      logsUltimaSemana.forEach((l) => {
        const diaLog = l.data.slice(0, 10);
        focosPorDia[diaLog] = (focosPorDia[diaLog] || 0) + 1;
      });

      const diasAtivos = Object.keys(focosPorDia);
      if (diasAtivos.length > 0) {
        const totalFocos = Object.values(focosPorDia).reduce((a, b) => a + b, 0);
        const media = totalFocos / diasAtivos.length;
        
        // Limita a meta diária dinâmica entre 3 e 8 prismas
        const metaEstipulada = Math.min(Math.max(Math.round(media), 3), 8);
        setMetaDiaria(metaEstipulada);
      } else {
        setMetaDiaria(5); // Meta diária padrão inicial
      }
    } catch (e) {
      console.error("Erro ao calcular metas diárias:", e);
    }
  }, []);

  // Monitora alterações para reavaliar as metas diárias
  useEffect(() => {
    recalcularMetasDiarias();
    window.addEventListener("acervo-atualizado", recalcularMetasDiarias);
    return () => {
      window.removeEventListener("acervo-atualizado", recalcularMetasDiarias);
    };
  }, [recalcularMetasDiarias]);

  // Persistência em localStorage para sobrevivência a F5/recarregamento
  useEffect(() => {
    if (!tarefa) {
      localStorage.removeItem("klaus-cronometro-estado");
      return;
    }
    const estado = {
      tarefa,
      modo,
      fimEm: isRunning ? fimEmRef.current : null,
      rodando: isRunning,
      segundosRestantes: restante,
    };
    localStorage.setItem("klaus-cronometro-estado", JSON.stringify(estado));
  }, [tarefa, modo, isRunning, restante]);

  // Restaura estado no F5/recarregamento
  useEffect(() => {
    try {
      const salvo = localStorage.getItem("klaus-cronometro-estado");
      if (salvo) {
        const estado = JSON.parse(salvo);
        if (estado.tarefa) {
          if (estado.rodando && estado.fimEm) {
            const falta = Math.round((estado.fimEm - Date.now()) / 1000);
            if (falta > 0) {
              setTarefa(estado.tarefa);
              setModo(estado.modo);
              fimEmRef.current = estado.fimEm;
              restart(new Date(Date.now() + falta * 1000), true);
            } else {
              // Expirou enquanto estava fora: conclui
              setTarefa(estado.tarefa);
              setModo(estado.modo);
              setTimeout(() => {
                lidarComTermino();
              }, 100);
            }
          } else {
            // Estava pausado ou parado
            setTarefa(estado.tarefa);
            setModo(estado.modo);
            fimEmRef.current = null;
            restart(new Date(Date.now() + estado.segundosRestantes * 1000), false);
          }
        }
      }
    } catch (e) {
      console.error("Falha ao restaurar cronômetro:", e);
    }
  }, [restart, lidarComTermino]);


  // Controla a execução do som ambiente baseado no foco, play manual e volume
  useEffect(() => {
    const deveTocar = somAmbiente && somAmbienteTocando;

    if (deveTocar) {
      const som = LISTA_SONS_AMBIENTE.find(s => s.id === somAmbiente);
      if (som) {
        if (!audioAmbienteRef.current) {
          audioAmbienteRef.current = new Audio(som.url);
          audioAmbienteRef.current.loop = true;
          audioAmbienteRef.current.volume = volumeSomAmbiente;
        } else if (audioAmbienteRef.current.src !== som.url) {
          audioAmbienteRef.current.pause();
          audioAmbienteRef.current = new Audio(som.url);
          audioAmbienteRef.current.loop = true;
          audioAmbienteRef.current.volume = volumeSomAmbiente;
        } else {
          audioAmbienteRef.current.volume = volumeSomAmbiente;
        }

        audioAmbienteRef.current.play().catch(err => {
          console.warn("Áudio não pôde ser reproduzido automaticamente devido a políticas do navegador:", err);
        });
      }
    } else {
      if (audioAmbienteRef.current) {
        audioAmbienteRef.current.pause();
      }
    }
  }, [somAmbiente, somAmbienteTocando, volumeSomAmbiente]);

  // Limpa o som ao desmontar
  useEffect(() => {
    return () => {
      if (audioAmbienteRef.current) {
        audioAmbienteRef.current.pause();
        audioAmbienteRef.current = null;
      }
    };
  }, []);

  return (
    <ContextoCronometro.Provider
      value={{
        tarefa,
        rodando: isRunning,
        modo,
        restante,
        total,
        config,
        metaDiaria,
        concluidosHoje,
        somAmbiente,
        setSomAmbiente,
        somAmbienteTocando,
        setSomAmbienteTocando,
        volumeSomAmbiente,
        setVolumeSomAmbiente,
        iniciar,
        pausar,
        retomar,
        reiniciar,
        parar,
        salvarConfig,
      }}
    >
      {children}

      <ModalConfirmacao
        aberto={conflito !== null}
        titulo="Alterar Foco"
        descricao={`Você já tem um ciclo de foco ativo para a tarefa "${tarefa?.titulo}". Deseja interrompê-la e iniciar o foco em "${conflito?.tarefaPendente.titulo}"? O progresso percorrido será guardado.`}
        textoConfirmar="Interromper e Iniciar"
        aoConfirmar={resolverConflito}
        aoCancelar={() => setConflito(null)}
      />
    </ContextoCronometro.Provider>
  );
}

export function useCronometro() {
  const ctx = useContext(ContextoCronometro);
  if (!ctx) {
    throw new Error("useCronometro precisa ser usado sob um CronometroProvider");
  }
  return ctx;
}
