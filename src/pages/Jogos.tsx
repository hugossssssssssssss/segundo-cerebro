import { useState, useEffect, useCallback, useMemo } from "react";
import { CabecalhoPagina } from "@/components/CabecalhoPagina";
import { SeloStatus } from "@/components/SeloStatus";
import { Botao, Cartao } from "@/components/ui";
import { GradeTermo } from "@/components/jogos/GradeTermo";
import { TecladoTermo } from "@/components/jogos/TecladoTermo";
import { ModalEstatisticasTermo } from "@/components/jogos/ModalEstatisticasTermo";
import { ModalComoJogarTermo } from "@/components/jogos/ModalComoJogarTermo";
import {
  Gamepad2,
  HelpCircle,
  BarChart3,
  RotateCcw,
  Flame,
  Calendar,
  Infinity as InfinityIcon,
} from "lucide-react";
import { toast } from "@/lib/toast";
import { lerConfig, configCompleta } from "@/lib/settings";
import { carregarRepo } from "@/lib/repo";
import {
  palavraExisteNoDicionario,
  normalizarPalavra,
  obterPalavraAleatoria,
  obterPalavraDoDia,
} from "@/lib/jogos/palavras";
import {
  TAMANHO_PALAVRA,
  MAX_TENTATIVAS,
  calcularStatusTeclado,
  avaliarChute,
} from "@/lib/jogos/termoEngine";
import {
  lerDadosTermoLocal,
  carregarDadosTermo,
  gravarDadosTermo,
  atualizarEstatisticasComResultado,
  criarNovoJogoDoDia,
  type EstadoJogoTermo,
  type DadosTermoPersistidos,
} from "@/lib/jogos/termoStorage";

export default function Jogos() {
  const [modo, setModo] = useState<"diario" | "infinito">("diario");
  const [dadosPersistidos, setDadosPersistidos] = useState<DadosTermoPersistidos>(() =>
    lerDadosTermoLocal()
  );
  const [shaDados, setShaDados] = useState<string | undefined>();

  // Estado para o modo infinito (independente do dia)
  const [jogoInfinito, setJogoInfinito] = useState<EstadoJogoTermo>(() => ({
    dataIso: "infinito",
    numeroJogo: 0,
    palavra: obterPalavraAleatoria(),
    tentativas: [],
    status: "jogando",
    modo: "infinito",
  }));

  // Jogo ativo atual (depende do modo selecionado)
  const jogoAtivo = modo === "diario" ? dadosPersistidos.jogoDoDia : jogoInfinito;

  const [tentativaAtual, setTentativaAtual] = useState("");
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
        // fallback mantém dados locais silenciosamente
      }
    };

    carregarRemoto();
    return () => {
      cancelado = true;
    };
  }, []);

  // Detector de virada de meia-noite (verifica a cada 30 segundos)
  useEffect(() => {
    const verificarMeiaNoite = () => {
      const agora = new Date();
      const infoHoje = obterPalavraDoDia(agora);
      if (dadosPersistidos.jogoDoDia.dataIso !== infoHoje.dataIso) {
        const novosDados: DadosTermoPersistidos = {
          ...dadosPersistidos,
          jogoDoDia: criarNovoJogoDoDia(agora),
        };
        setDadosPersistidos(novosDados);
        setTentativaAtual("");
        const cfg = lerConfig();
        gravarDadosTermo(cfg, novosDados, shaDados);
        toast("Um novo Termo do dia está disponível! Boa sorte! 🎯", { tipo: "sucesso" });
      }
    };

    const interval = setInterval(verificarMeiaNoite, 30_000);
    return () => clearInterval(interval);
  }, [dadosPersistidos, shaDados]);

  // Mapa de status do teclado consolidado
  const statusTeclado = useMemo(() => {
    return calcularStatusTeclado(jogoAtivo.tentativas, jogoAtivo.palavra);
  }, [jogoAtivo.tentativas, jogoAtivo.palavra]);

  // Ações de Digitação
  const inserirLetra = useCallback(
    (letra: string) => {
      if (jogoAtivo.status !== "jogando") return;
      if (tentativaAtual.length >= TAMANHO_PALAVRA) return;

      const norm = normalizarPalavra(letra);
      if (!norm || norm.length !== 1) return;

      setTentativaAtual((prev) => (prev + norm).slice(0, TAMANHO_PALAVRA));
    },
    [jogoAtivo.status, tentativaAtual.length]
  );

  const apagarLetra = useCallback(() => {
    if (jogoAtivo.status !== "jogando") return;
    setTentativaAtual((prev) => prev.slice(0, -1));
  }, [jogoAtivo.status]);

  const dispararAnimacaoErro = () => {
    setLinhaComErro(true);
    setTimeout(() => setLinhaComErro(false), 600);
  };

  const confirmarPalavra = useCallback(async () => {
    if (jogoAtivo.status !== "jogando") return;

    if (tentativaAtual.length < TAMANHO_PALAVRA) {
      dispararAnimacaoErro();
      toast("Digite uma palavra de 5 letras completa.", { tipo: "aviso" });
      return;
    }

    if (!palavraExisteNoDicionario(tentativaAtual)) {
      dispararAnimacaoErro();
      toast("Palavra não reconhecida no dicionário.", { tipo: "erro" });
      return;
    }

    const novaTentativa = tentativaAtual;
    const novasTentativas = [...jogoAtivo.tentativas, novaTentativa];
    const indiceLinha = jogoAtivo.tentativas.length;

    // Disparar animação de revelação da linha
    setRevelandoLinhaIdx(indiceLinha);
    setTimeout(() => setRevelandoLinhaIdx(undefined), TAMANHO_PALAVRA * 150 + 200);

    const avaliacao = avaliarChute(novaTentativa, jogoAtivo.palavra);
    const venceu = avaliacao.ehCorreta;
    const perdeu = !venceu && novasTentativas.length >= MAX_TENTATIVAS;
    const novoStatus = venceu ? "venceu" : perdeu ? "perdeu" : "jogando";

    setTentativaAtual("");

    if (modo === "diario") {
      let novasEstatisticas = dadosPersistidos.estatisticas;
      if (novoStatus !== "jogando") {
        novasEstatisticas = atualizarEstatisticasComResultado(
          dadosPersistidos.estatisticas,
          venceu,
          novasTentativas.length,
          jogoAtivo.dataIso
        );
      }

      const novosDados: DadosTermoPersistidos = {
        versao: 1,
        jogoDoDia: {
          ...jogoAtivo,
          tentativas: novasTentativas,
          status: novoStatus,
          finalizadoEm: novoStatus !== "jogando" ? new Date().toISOString() : undefined,
        },
        estatisticas: novasEstatisticas,
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
      // Modo Infinito
      const novoJogoInfinito: EstadoJogoTermo = {
        ...jogoInfinito,
        tentativas: novasTentativas,
        status: novoStatus,
        finalizadoEm: novoStatus !== "jogando" ? new Date().toISOString() : undefined,
      };
      setJogoInfinito(novoJogoInfinito);

      if (novoStatus !== "jogando") {
        setTimeout(() => {
          setModalEstatisticasAberto(true);
        }, 1200);
      }
    }
  }, [
    jogoAtivo,
    tentativaAtual,
    modo,
    dadosPersistidos,
    shaDados,
    jogoInfinito,
  ]);

  // Listener para Teclado Físico
  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (modalEstatisticasAberto || modalComoJogarAberto) return;

      const tecla = e.key.toUpperCase();

      if (tecla === "ENTER") {
        e.preventDefault();
        confirmarPalavra();
      } else if (tecla === "BACKSPACE" || tecla === "DELETE") {
        e.preventDefault();
        apagarLetra();
      } else if (/^[A-ZÇ]$/.test(tecla)) {
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
    setJogoInfinito({
      dataIso: "infinito",
      numeroJogo: 0,
      palavra: obterPalavraAleatoria(),
      tentativas: [],
      status: "jogando",
      modo: "infinito",
    });
    setTentativaAtual("");
    setModalEstatisticasAberto(false);
  };

  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-200 w-full max-w-4xl mx-auto pb-12">
      {/* 1. Cabeçalho Principal */}
      <CabecalhoPagina
        titulo="Jogos & Desafios"
        descricao="Desafie seu vocabulário e exercite a mente com o Termo e quebra-cabeças no Klaus."
        icone={<Gamepad2 size={20} />}
        corIcone="bg-purple-500/10 text-purple-600 dark:text-purple-400"
        badge={
          <SeloStatus
            rotulo={modo === "diario" ? `Termo #${jogoAtivo.numeroJogo}` : "Modo Infinito"}
            tom="primario"
          />
        }
        acoes={
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Botao
              variante="neutro"
              tamanho="pequeno"
              onClick={() => setModalComoJogarAberto(true)}
              title="Como jogar"
            >
              <HelpCircle size={15} />
              <span className="hidden sm:inline">Ajuda</span>
            </Botao>
            <Botao
              variante="neutro"
              tamanho="pequeno"
              onClick={() => setModalEstatisticasAberto(true)}
              title="Ver estatísticas"
            >
              <BarChart3 size={15} />
              <span className="hidden sm:inline">Estatísticas</span>
            </Botao>
          </div>
        }
      />

      {/* 2. Barra de Seleção de Modos */}
      <div className="flex items-center justify-between gap-2 p-1.5 rounded-xl border border-border bg-card/60 backdrop-blur-xs">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => {
              setModo("diario");
              setTentativaAtual("");
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              modo === "diario"
                ? "bg-primary text-primary-foreground shadow-2xs"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            }`}
          >
            <Calendar size={14} />
            <span>Termo Diário</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setModo("infinito");
              setTentativaAtual("");
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              modo === "infinito"
                ? "bg-primary text-primary-foreground shadow-2xs"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            }`}
          >
            <InfinityIcon size={14} />
            <span>Modo Infinito</span>
          </button>
        </div>

        {/* Indicador de Streak Diário ou Botão de Novo Jogo Infinito */}
        {modo === "diario" ? (
          <div className="flex items-center gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-400 px-2 py-1 bg-amber-500/10 rounded-lg">
            <Flame size={14} className="fill-amber-500" />
            <span>{dadosPersistidos.estatisticas.sequenciaAtual} dias</span>
          </div>
        ) : (
          <Botao
            variante="fantasma"
            tamanho="pequeno"
            onClick={iniciarNovaPartidaInfinita}
            className="text-xs"
          >
            <RotateCcw size={13} />
            Nova Palavra
          </Botao>
        )}
      </div>

      {/* 3. Área Principal do Jogo */}
      <Cartao className="flex flex-col items-center justify-center p-3 sm:p-6 bg-card/80 backdrop-blur-md shadow-sm border-border/80">
        <div className="w-full flex flex-col items-center gap-3 sm:gap-4 max-w-md">
          {/* Grade de Tentativas */}
          <GradeTermo
            tentativas={jogoAtivo.tentativas}
            tentativaAtual={tentativaAtual}
            solucao={jogoAtivo.palavra}
            linhaComErro={linhaComErro}
            revelandoLinhaIdx={revelandoLinhaIdx}
          />

          {/* Feedback de status em andamento */}
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
              {modo === "infinito" && (
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

          {/* Teclado Virtual */}
          <TecladoTermo
            statusTeclado={statusTeclado}
            aoPressionarLetra={inserirLetra}
            aoConfirmar={confirmarPalavra}
            aoApagar={apagarLetra}
            desabilitado={jogoAtivo.status !== "jogando"}
          />
        </div>
      </Cartao>

      {/* 4. Modais */}
      <ModalEstatisticasTermo
        aberto={modalEstatisticasAberto}
        aoFechar={() => setModalEstatisticasAberto(false)}
        jogo={jogoAtivo}
        estatisticas={dadosPersistidos.estatisticas}
        aoJogarInfinito={
          modo === "diario"
            ? () => {
                setModalEstatisticasAberto(false);
                setModo("infinito");
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
