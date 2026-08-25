import { useState, useEffect, useCallback, useMemo, useRef, lazy, Suspense } from "react";
import {
  Square,
  PanelRight,
  Maximize2,
  StickyNote,
  X,
  Trash2,
  Minimize2,
  Maximize,
  Pin,
  GripHorizontal,
  History as IconeHistorico,
  MoreVertical,
  Copy,
  CopyPlus,
  ArrowRightLeft,
} from "lucide-react";
import { Botao, Aviso, ModalConfirmacao } from "@/components/ui";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { PropriedadesNotion, abrirItemSpa } from "@/components/PropriedadesNotion";
import { EditorNotion } from "@/components/EditorNotion";
import { Subtarefas } from "@/components/Subtarefas";
import { MencionadoEm } from "@/components/Links";
import { MapaMentalEmbed } from "@/components/MapaMentalEmbed";
import { sincronizarRelacionamentos } from "@/lib/links";
import { cn } from "@/lib/utils";
import { gerenciadorCamadas, NIVEIS_CAMADAS } from "@/lib/camadas";
import { lerMarkdown, escreverMarkdown, nomeLivre, mesclarFrontmatter } from "@/lib/markdown";
import { useSalvar } from "@/lib/useSalvar";
import { cache, invalidarCache } from "@/lib/repo";
import { lerConfig } from "@/lib/settings";
import { toast } from "@/lib/toast";
import { useWorkspace } from "@/components/workspace/WorkspaceContext";

const HistoricoDiffModal = lazy(() =>
  import("@/components/HistoricoDiffModal").then((m) => ({
    default: m.HistoricoDiffModal,
  })),
);

export type ModoVisaoNotion = "popup" | "lado" | "telacheia" | "flutuante";

export interface PainelNotionBaseProps {
  rotuloTipo: string;
  modoVisao: ModoVisaoNotion;
  setModoVisao: (m: ModoVisaoNotion) => void;
  titulo: string;
  setTitulo: (t: string) => void;
  corpo: string;
  setCorpo: (c: string) => void;
  dadosProps: Record<string, any>;
  onChangeProps: (novosDados: Record<string, any>) => void;
  camposFixosProps?: Record<string, any>;
  caminhoItem?: string;
  salvando: boolean;
  temMudancas: boolean;
  aoFechar: () => void;
  aoSalvar: () => Promise<void>;
  aoRemover?: () => Promise<void>;
  erro?: string;
  mencoes?: any[];
  opcoesRelacionamento?: { titulo: string; caminho: string }[];
}

export function PainelNotionBase({
  rotuloTipo,
  modoVisao,
  setModoVisao,
  titulo,
  setTitulo,
  corpo,
  setCorpo,
  dadosProps,
  onChangeProps,
  camposFixosProps,
  caminhoItem,
  salvando,
  temMudancas,
  aoFechar,
  aoSalvar,
  aoRemover,
  erro,
  mencoes = [],
  opcoesRelacionamento = [],
}: PainelNotionBaseProps) {
  const [confirmandoApagar, setConfirmandoApagar] = useState(false);
  const [minimizadoFlutuante, setMinimizadoFlutuante] = useState(false);
  const [vendoHistorico, setVendoHistorico] = useState(false);
  const [menuAcoesAberto, setMenuAcoesAberto] = useState(false);
  const [confirmandoConversao, setConfirmandoConversao] = useState<{ novoTipo: string; novaPasta: string } | null>(null);

  const cfg = useMemo(() => lerConfig(), []);
  const { salvarTexto, apagarItem } = useSalvar(cfg);

  let workspace: any = null;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    workspace = useWorkspace();
  } catch {}

  const abrirEmTelaCheiaWorkspace = useCallback(() => {
    if (workspace?.abrirNoWorkspace) {
      workspace.abrirNoWorkspace({
        id: caminhoItem || `item-${Date.now()}`,
        caminho: caminhoItem,
        rotuloTipo,
        titulo,
        corpo,
        dadosProps,
        camposFixosProps,
        temMudancas,
        salvando,
        mencoes,
        opcoesRelacionamento,
        aoSalvar: async () => {
          await aoSalvar();
        },
        aoRemover,
      });
      aoFechar();
    } else {
      setModoVisao("telacheia");
      setMinimizadoFlutuante(false);
    }
  }, [
    workspace,
    caminhoItem,
    rotuloTipo,
    titulo,
    corpo,
    dadosProps,
    camposFixosProps,
    temMudancas,
    salvando,
    mencoes,
    opcoesRelacionamento,
    aoSalvar,
    aoRemover,
    aoFechar,
    setModoVisao,
  ]);

  useEffect(() => {
    if (modoVisao === "telacheia" && workspace?.abrirNoWorkspace) {
      abrirEmTelaCheiaWorkspace();
    }
  }, [modoVisao, workspace, abrirEmTelaCheiaWorkspace]);

  const acaoCopiarLink = useCallback(() => {
    if (!caminhoItem) return;
    const pasta = caminhoItem.split("/")[0]?.toLowerCase() || "";
    let rota = "/notas";
    if (pasta === "tarefas") rota = "/tarefas";
    else if (pasta === "referencias") rota = "/referencias";
    else if (pasta === "pdi" || pasta === "metas") rota = "/pdi";
    else if (pasta === "lousas") rota = "/lousas";
    const url = `${window.location.origin}${window.location.pathname}#${rota}?abrir=${encodeURIComponent(caminhoItem)}`;
    navigator.clipboard.writeText(url);
    toast("Link copiado para a área de transferência!");
    setMenuAcoesAberto(false);
  }, [caminhoItem]);

  const acaoDuplicar = useCallback(async () => {
    if (!caminhoItem) return;
    const pasta = caminhoItem.split("/").slice(0, -1).join("/") || caminhoItem.split("/")[0];
    const novoTitulo = `Cópia de ${titulo}`;
    const caminhosExistentes = cache?.itens.map((i) => i.caminho) || [];
    const caminhoNovo = nomeLivre(pasta, novoTitulo, caminhosExistentes);

    const dadosNovos = { ...dadosProps };
    if (pasta.includes("metas")) {
      dadosNovos.id = caminhoNovo.split("/").pop()!.replace(/\.md$/, "");
    }

    const textoNovo = escreverMarkdown({ dados: dadosNovos, corpo });

    try {
      await salvarTexto(caminhoNovo, textoNovo, undefined, `duplicar ${caminhoItem}`);
      invalidarCache();
      toast("Item duplicado com sucesso!");
      abrirItemSpa(caminhoNovo);
      setMenuAcoesAberto(false);
      aoFechar();
    } catch (err: any) {
      toast(`Erro ao duplicar item: ${err?.message || err}`, { tipo: "erro" });
    }
  }, [caminhoItem, titulo, dadosProps, corpo, aoFechar, salvarTexto]);

  const acaoConverter = useCallback((novoTipo: string, novaPasta: string) => {
    setConfirmandoConversao({ novoTipo, novaPasta });
    setMenuAcoesAberto(false);
  }, []);

  const executarConversao = useCallback(async (novoTipo: string, novaPasta: string) => {
    if (!caminhoItem) return;
    const caminhosExistentes = cache?.itens.map((i) => i.caminho) || [];
    const caminhoNovo = nomeLivre(novaPasta, titulo, caminhosExistentes);

    const dadosLimpos = { ...dadosProps };
    let dadosNovos: Record<string, any> = {};

    if (novoTipo === "nota") {
      delete dadosLimpos.status;
      delete dadosLimpos.prazo;
      delete dadosLimpos.indicador;
      delete dadosLimpos.metas;
      delete dadosLimpos.id;
      dadosNovos = mesclarFrontmatter(dadosLimpos, {
        tipo: "nota",
        tags: dadosProps.tags || []
      });
    } else if (novoTipo === "tarefa") {
      delete dadosLimpos.indicador;
      delete dadosLimpos.metas;
      delete dadosLimpos.id;
      dadosNovos = mesclarFrontmatter(dadosLimpos, {
        tipo: "tarefa",
        status: dadosProps.status || "a-fazer",
        tags: dadosProps.tags || []
      });
    } else if (novoTipo === "meta") {
      delete dadosLimpos.tags;
      delete dadosLimpos.metas;
      const novoId = caminhoNovo.split("/").pop()!.replace(/\.md$/, "");
      dadosNovos = mesclarFrontmatter(dadosLimpos, {
        tipo: "meta",
        id: novoId,
        status: dadosProps.status || "a-fazer",
        indicador: dadosProps.indicador || ""
      });
    }

    const textoNovo = escreverMarkdown({ dados: dadosNovos, corpo });

    try {
      await salvarTexto(caminhoNovo, textoNovo, undefined, `converter de ${caminhoItem} para ${novoTipo}`);
      const itemOrigem = cache?.itens.find((i) => i.caminho === caminhoItem);
      const shaOrigem = itemOrigem?.sha || "";
      if (shaOrigem) {
        await apagarItem(caminhoItem, shaOrigem);
      }
      invalidarCache();
      toast("Item convertido com sucesso!");
      abrirItemSpa(caminhoNovo);
      aoFechar();
    } catch (err: any) {
      toast(`Erro ao converter item: ${err?.message || err}`, { tipo: "erro" });
    }
  }, [caminhoItem, titulo, dadosProps, corpo, aoFechar, salvarTexto, apagarItem]);

  const painelRef = useRef<HTMLDivElement>(null);
  const miniRef = useRef<HTMLDivElement>(null);

  // Posicionamento e Redimensionamento da Janela Flutuante (Persistido no localStorage)
  const [posicaoFlutuante, setPosicaoFlutuante] = useState(() => {
    const salvo = localStorage.getItem("klaus_flutuante_pos");
    if (salvo) {
      try {
        const p = JSON.parse(salvo);
        if (typeof p.x === "number" && typeof p.y === "number") {
          return {
            x: Math.max(10, Math.min(window.innerWidth - 200, p.x)),
            y: Math.max(10, Math.min(window.innerHeight - 100, p.y)),
          };
        }
      } catch {}
    }
    return {
      x: Math.max(16, window.innerWidth - 520),
      y: Math.max(16, window.innerHeight - 580),
    };
  });

  const [tamanhoFlutuante, setTamanhoFlutuante] = useState(() => {
    const salvo = localStorage.getItem("klaus_flutuante_tam");
    if (salvo) {
      try {
        const t = JSON.parse(salvo);
        if (typeof t.largura === "number" && typeof t.altura === "number") return t;
      } catch {}
    }
    return {
      largura: Math.min(480, window.innerWidth - 32),
      altura: Math.min(540, window.innerHeight - 32),
    };
  });

  // Salvar posição e tamanho quando terminar o movimento
  const salvarPosTam = (x: number, y: number, largura: number, altura: number) => {
    setPosicaoFlutuante({ x, y });
    setTamanhoFlutuante({ largura, altura });
    localStorage.setItem("klaus_flutuante_pos", JSON.stringify({ x, y }));
    localStorage.setItem("klaus_flutuante_tam", JSON.stringify({ largura, altura }));
  };

  // 🚀 ALTA PERFORMANCE (60FPS): Mover janela flutuante sem re-renderizar o editor durante o arrasto
  const [arrastando, setArrastando] = useState(false);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const posTempRef = useRef({ x: posicaoFlutuante.x, y: posicaoFlutuante.y });

  const iniciarArrastoCabecalho = (e: React.MouseEvent | React.TouchEvent) => {
    if (modoVisao !== "flutuante") return;
    if ((e.target as HTMLElement).closest("button, input, select, textarea")) return;

    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

    const elem = minimizadoFlutuante ? miniRef.current : painelRef.current;
    const currentLeft = elem ? elem.offsetLeft : posicaoFlutuante.x;
    const currentTop = elem ? elem.offsetTop : posicaoFlutuante.y;

    dragOffsetRef.current = {
      x: clientX - currentLeft,
      y: clientY - currentTop,
    };
    posTempRef.current = { x: currentLeft, y: currentTop };
    setArrastando(true);
  };

  useEffect(() => {
    if (!arrastando) return;

    const aoMoverMouse = (e: MouseEvent | TouchEvent) => {
      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

      const elem = minimizadoFlutuante ? miniRef.current : painelRef.current;
      const elemWidth = elem ? elem.offsetWidth : tamanhoFlutuante.largura;

      const maxLeft = Math.max(0, window.innerWidth - elemWidth);
      const maxTop = Math.max(0, window.innerHeight - 50);

      const novoX = Math.max(0, Math.min(maxLeft, clientX - dragOffsetRef.current.x));
      const novoY = Math.max(0, Math.min(maxTop, clientY - dragOffsetRef.current.y));

      posTempRef.current = { x: novoX, y: novoY };

      // Atualização direta de DOM para 60fps lisinho
      if (elem) {
        elem.style.left = `${novoX}px`;
        elem.style.top = `${novoY}px`;
      }
    };

    const aoSoltarMouse = () => {
      setArrastando(false);
      salvarPosTam(
        posTempRef.current.x,
        posTempRef.current.y,
        tamanhoFlutuante.largura,
        tamanhoFlutuante.altura
      );
    };

    window.addEventListener("mousemove", aoMoverMouse, { passive: true });
    window.addEventListener("mouseup", aoSoltarMouse);
    window.addEventListener("touchmove", aoMoverMouse, { passive: true });
    window.addEventListener("touchend", aoSoltarMouse);

    return () => {
      window.removeEventListener("mousemove", aoMoverMouse);
      window.removeEventListener("mouseup", aoSoltarMouse);
      window.removeEventListener("touchmove", aoMoverMouse);
      window.removeEventListener("touchend", aoSoltarMouse);
    };
  }, [arrastando, minimizadoFlutuante, tamanhoFlutuante.largura, tamanhoFlutuante.altura]);

  // 🚀 ALTA PERFORMANCE (60FPS): Redimensionamento em 8 direções via manipulador de DOM direto
  const [redimensionando, setRedimensionando] = useState<string | null>(null);
  const resizeStartRef = useRef({
    mouseX: 0,
    mouseY: 0,
    posX: 0,
    posY: 0,
    largura: 0,
    altura: 0,
  });
  const tamTempRef = useRef({ largura: tamanhoFlutuante.largura, altura: tamanhoFlutuante.altura });

  const iniciarRedimensionamento = (
    direcao: string,
    e: React.MouseEvent | React.TouchEvent
  ) => {
    e.stopPropagation();
    e.preventDefault();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

    const elem = painelRef.current;
    const posX = elem ? elem.offsetLeft : posicaoFlutuante.x;
    const posY = elem ? elem.offsetTop : posicaoFlutuante.y;
    const larg = elem ? elem.offsetWidth : tamanhoFlutuante.largura;
    const alt = elem ? elem.offsetHeight : tamanhoFlutuante.altura;

    resizeStartRef.current = {
      mouseX: clientX,
      mouseY: clientY,
      posX,
      posY,
      largura: larg,
      altura: alt,
    };
    posTempRef.current = { x: posX, y: posY };
    tamTempRef.current = { largura: larg, altura: alt };
    setRedimensionando(direcao);
  };

  useEffect(() => {
    if (!redimensionando) return;

    const aoMoverResize = (e: MouseEvent | TouchEvent) => {
      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

      const dx = clientX - resizeStartRef.current.mouseX;
      const dy = clientY - resizeStartRef.current.mouseY;

      let novaLargura = resizeStartRef.current.largura;
      let novaAltura = resizeStartRef.current.altura;
      let novoX = resizeStartRef.current.posX;
      let novoY = resizeStartRef.current.posY;

      const MIN_W = 300;
      const MIN_H = 240;

      if (redimensionando.includes("e")) {
        novaLargura = Math.max(MIN_W, Math.min(window.innerWidth - novoX, resizeStartRef.current.largura + dx));
      }
      if (redimensionando.includes("s")) {
        novaAltura = Math.max(MIN_H, Math.min(window.innerHeight - novoY, resizeStartRef.current.altura + dy));
      }
      if (redimensionando.includes("w")) {
        const descW = resizeStartRef.current.largura - dx;
        if (descW >= MIN_W && resizeStartRef.current.posX + dx >= 0) {
          novaLargura = descW;
          novoX = resizeStartRef.current.posX + dx;
        }
      }
      if (redimensionando.includes("n")) {
        const descH = resizeStartRef.current.altura - dy;
        if (descH >= MIN_H && resizeStartRef.current.posY + dy >= 0) {
          novaAltura = descH;
          novoY = resizeStartRef.current.posY + dy;
        }
      }

      posTempRef.current = { x: novoX, y: novoY };
      tamTempRef.current = { largura: novaLargura, altura: novaAltura };

      // Atualização direta de DOM para renderização de 60fps sem travamento
      if (painelRef.current) {
        painelRef.current.style.left = `${novoX}px`;
        painelRef.current.style.top = `${novoY}px`;
        painelRef.current.style.width = `${novaLargura}px`;
        painelRef.current.style.height = `${novaAltura}px`;
      }
    };

    const aoSoltarResize = () => {
      setRedimensionando(null);
      salvarPosTam(
        posTempRef.current.x,
        posTempRef.current.y,
        tamTempRef.current.largura,
        tamTempRef.current.altura
      );
    };

    window.addEventListener("mousemove", aoMoverResize, { passive: true });
    window.addEventListener("mouseup", aoSoltarResize);
    window.addEventListener("touchmove", aoMoverResize, { passive: true });
    window.addEventListener("touchend", aoSoltarResize);

    return () => {
      window.removeEventListener("mousemove", aoMoverResize);
      window.removeEventListener("mouseup", aoSoltarResize);
      window.removeEventListener("touchmove", aoMoverResize);
      window.removeEventListener("touchend", aoSoltarResize);
    };
  }, [redimensionando]);

  // Guarda referencias atualizadas para evitar fechar sem salvar
  const salvandoRef = useRef(salvando);
  const temMudancasRef = useRef(temMudancas);
  salvandoRef.current = salvando;
  temMudancasRef.current = temMudancas;

  const [fechandoESalvando, setFechandoESalvando] = useState(false);
  const fechandoRef = useRef(false);

  const tentarFechar = useCallback(async () => {
    if (fechandoRef.current) return;
    if (!temMudancasRef.current) {
      aoFechar();
      return;
    }
    fechandoRef.current = true;
    setFechandoESalvando(true);
    try {
      await aoSalvar();
      aoFechar();
    } catch {
      // mantem painel aberto se falhar
    } finally {
      fechandoRef.current = false;
      setFechandoESalvando(false);
    }
  }, [aoSalvar, aoFechar]);

  // Registro centralizado no gerenciador de camadas do Klaus
  useEffect(() => {
    const ehFlutuante = modoVisao === "flutuante";
    const limpar = gerenciadorCamadas.registrar({
      id: `painel-notion-${caminhoItem || titulo || "editor"}`,
      nivel: ehFlutuante ? NIVEIS_CAMADAS.JANELA_FLUTUANTE : NIVEIS_CAMADAS.PAINEL_NOTION_BASE,
      temBackdrop: !ehFlutuante,
      aoFechar: tentarFechar,
    });
    return () => limpar();
  }, [modoVisao, caminhoItem, titulo, tentarFechar]);



  // Alerta de segurança ao tentar sair/fechar a aba do navegador
  useEffect(() => {
    if (!temMudancas) return;
    const aoSairDaJanela = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", aoSairDaJanela);
    return () => window.removeEventListener("beforeunload", aoSairDaJanela);
  }, [temMudancas]);

  const alvosOverride = useMemo(() => {
    if (!opcoesRelacionamento || opcoesRelacionamento.length === 0) return undefined;
    return opcoesRelacionamento.map((o) => {
      const pasta = o.caminho.split("/")[0]?.toLowerCase() || "";
      let tipo: any = "nota";
      if (pasta === "tarefas") tipo = "tarefa";
      else if (pasta === "referencias") tipo = "referencia";
      else if (pasta === "pdi" || pasta === "metas") tipo = "meta";
      else if (pasta === "lousas") tipo = "lousa";
      return {
        caminho: o.caminho,
        titulo: o.titulo,
        tipo,
      };
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opcoesRelacionamento.map((x) => x.caminho).join(",")]);

  // Cabeçalho unificado
  const cabecalho = (
    <div
      onMouseDown={iniciarArrastoCabecalho}
      onTouchStart={iniciarArrastoCabecalho}
      className={cn(
        "flex shrink-0 items-center justify-between border-b border-border px-4 sm:px-5 py-3 bg-card",
        modoVisao === "flutuante" && "cursor-grab active:cursor-grabbing select-none"
      )}
    >
      <div className="flex items-center gap-2 min-w-0 pr-2">
        {modoVisao === "flutuante" && (
          <GripHorizontal size={16} className="text-amber-500/70 shrink-0" />
        )}
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider shrink-0">
          {rotuloTipo}
        </span>

        <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-accent/60 flex items-center gap-1 shrink-0">
          {salvando || fechandoESalvando ? (
            <span className="text-blue-500 animate-pulse font-semibold">Salvando...</span>
          ) : temMudancas ? (
            <span className="text-amber-600 dark:text-amber-400 font-medium">Salva ao fechar</span>
          ) : (
            <span className="text-emerald-600 dark:text-emerald-400 font-medium">✓ Sincronizado</span>
          )}
        </span>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <div className="flex items-center gap-0.5 rounded-lg border border-border/80 bg-muted/40 p-0.5 sm:p-1">
          <button
            onClick={() => { setModoVisao("popup"); setMinimizadoFlutuante(false); }}
            className={cn(
              "p-1.5 rounded-md transition-colors flex items-center justify-center",
              modoVisao === "popup"
                ? "bg-background text-foreground shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            )}
            title="Pop-up central"
          >
            <Square size={15} />
          </button>

          <button
            onClick={() => { setModoVisao("lado"); setMinimizadoFlutuante(false); }}
            className={cn(
              "p-1.5 rounded-md transition-colors flex items-center justify-center",
              modoVisao === "lado"
                ? "bg-background text-foreground shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            )}
            title="Painel lateral (Do lado)"
          >
            <PanelRight size={15} />
          </button>

          <button
            onClick={abrirEmTelaCheiaWorkspace}
            className={cn(
              "p-1.5 rounded-md transition-colors flex items-center justify-center",
              modoVisao === "telacheia"
                ? "bg-background text-foreground shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            )}
            title="Workspace em Tela Cheia (com abas)"
          >
            <Maximize2 size={15} />
          </button>

          <button
            onClick={() => { setModoVisao("flutuante"); setMinimizadoFlutuante(false); }}
            className={cn(
              "p-1.5 rounded-md transition-colors flex items-center justify-center",
              modoVisao === "flutuante"
                ? "bg-amber-500/20 text-amber-600 dark:text-amber-400 shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            )}
            title="Janela Flutuante (Permanece visível pelo app)"
          >
            <StickyNote size={15} />
          </button>
        </div>

        {modoVisao === "flutuante" && (
          <button
            onClick={() => setMinimizadoFlutuante(!minimizadoFlutuante)}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            title={minimizadoFlutuante ? "Expandir janela" : "Minimizar janela"}
          >
            {minimizadoFlutuante ? <Maximize size={15} /> : <Minimize2 size={15} />}
          </button>
        )}

        {caminhoItem && (
          <Popover open={menuAcoesAberto} onOpenChange={setMenuAcoesAberto}>
            <PopoverTrigger asChild>
              <button
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                title="Ações do item"
              >
                <MoreVertical size={16} />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-1.5 shadow-xl border-border" align="end">
              <div className="flex flex-col gap-0.5">
                <button
                  onClick={acaoCopiarLink}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs text-left text-foreground hover:bg-accent transition-colors"
                >
                  <Copy size={14} className="opacity-70 shrink-0" />
                  <span>Copiar link</span>
                </button>

                <button
                  onClick={acaoDuplicar}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs text-left text-foreground hover:bg-accent transition-colors"
                >
                  <CopyPlus size={14} className="opacity-70 shrink-0" />
                  <span>Duplicar</span>
                </button>

                <div className="my-1 border-t border-border/60" />
                <div className="px-2.5 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Converter para
                </div>
                {[
                  { tipo: "nota", pasta: "notas", rotulo: "Nota" },
                  { tipo: "tarefa", pasta: "tarefas", rotulo: "Tarefa" },
                  { tipo: "meta", pasta: "pdi/metas", rotulo: "Meta do PDI" }
                ].map((dest) => {
                  const ehTipoAtual =
                    caminhoItem.startsWith(dest.pasta + "/") ||
                    (dest.tipo === "nota" && rotuloTipo?.toLowerCase().includes("nota")) ||
                    (dest.tipo === "tarefa" && rotuloTipo?.toLowerCase().includes("tarefa")) ||
                    (dest.tipo === "meta" && rotuloTipo?.toLowerCase().includes("meta"));

                  if (ehTipoAtual) return null;

                  return (
                    <button
                      key={dest.tipo}
                      onClick={() => acaoConverter(dest.tipo, dest.pasta)}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs text-left text-foreground hover:bg-accent transition-colors"
                    >
                      <ArrowRightLeft size={14} className="opacity-70 shrink-0" />
                      <span>{dest.rotulo}</span>
                    </button>
                  );
                })}
              </div>
            </PopoverContent>
          </Popover>
        )}

        <button
          onClick={tentarFechar}
          disabled={fechandoESalvando}
          className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors disabled:opacity-40 disabled:cursor-wait"
          title={fechandoESalvando ? "Salvando…" : "Fechar e Salvar"}
        >
          <X size={17} />
        </button>
      </div>
    </div>
  );

  const rodape = (
    <div className="flex shrink-0 items-center justify-between gap-2 border-t border-border px-4 sm:px-5 py-2.5 bg-card">
      <div className="flex items-center gap-1">
        {aoRemover ? (
          <Botao variante="fantasma" onClick={() => setConfirmandoApagar(true)} className="text-destructive hover:bg-destructive/10 text-xs">
            <Trash2 size={14} />
            <span>Apagar</span>
          </Botao>
        ) : null}

        {caminhoItem && (
          <Botao
            variante="fantasma"
            onClick={() => setVendoHistorico(true)}
            className="text-xs text-muted-foreground"
            title="Ver as versões anteriores deste arquivo"
          >
            <IconeHistorico size={14} />
            <span>Histórico</span>
          </Botao>
        )}
      </div>
      <span className="text-[11px] text-muted-foreground">Salva automaticamente ao fechar</span>
    </div>
  );

  const modaisConfirmacao = (
    <>
      <ModalConfirmacao
        aberto={confirmandoApagar}
        titulo={`Apagar "${titulo || "este item"}"?`}
        descricao="Tem certeza de que deseja apagar? Ele será excluído do repositório no GitHub — mas continua recuperável pelo histórico do Git."
        textoConfirmar="Sim, apagar"
        textoCancelar="Cancelar"
        varianteConfirmar="perigo"
        aoConfirmar={() => {
          setConfirmandoApagar(false);
          if (aoRemover) aoRemover();
        }}
        aoCancelar={() => setConfirmandoApagar(false)}
      />

      <ModalConfirmacao
        aberto={confirmandoConversao !== null}
        titulo="Converter item?"
        descricao={`Deseja mesmo converter este item para ${confirmandoConversao?.novoTipo === 'nota' ? 'Nota' : confirmandoConversao?.novoTipo === 'tarefa' ? 'Tarefa' : 'Meta'}? Isso moverá o arquivo físico no seu repositório de dados.`}
        textoConfirmar="Sim, converter"
        textoCancelar="Cancelar"
        varianteConfirmar="primario"
        aoConfirmar={() => {
          if (confirmandoConversao) {
            executarConversao(confirmandoConversao.novoTipo, confirmandoConversao.novaPasta);
          }
          setConfirmandoConversao(null);
        }}
        aoCancelar={() => setConfirmandoConversao(null)}
      />

      {vendoHistorico && caminhoItem && (
        <Suspense fallback={null}>
          <HistoricoDiffModal
            aberto
            aoFechar={() => setVendoHistorico(false)}
            caminho={caminhoItem}
            conteudoAtual={escreverMarkdown({ dados: dadosProps, corpo })}
            aoRestaurar={(textoHistorico) => {
              const { dados, corpo: corpoTexto } = lerMarkdown(textoHistorico);
              if (dados.titulo && typeof dados.titulo === "string") {
                setTitulo(dados.titulo);
              }
              setCorpo(corpoTexto);
              onChangeProps(dados);
            }}
          />
        </Suspense>
      )}
    </>
  );

  const titulosConhecidos = useMemo(
    () =>
      opcoesRelacionamento.length
        ? opcoesRelacionamento.map((o) => o.titulo)
        : undefined,
    [opcoesRelacionamento],
  );

  const sincronizarRef = useRef({ dadosProps, onChangeProps, titulosConhecidos });
  sincronizarRef.current = { dadosProps, onChangeProps, titulosConhecidos };

  const sincronizarCorpo = useCallback((textoDoCorpo: string) => {
    const { dadosProps: dados, onChangeProps: aoMudar, titulosConhecidos: titulos } =
      sincronizarRef.current;
    const sinc = sincronizarRelacionamentos(dados, textoDoCorpo, titulos);
    if (JSON.stringify(sinc) !== JSON.stringify(dados)) aoMudar(sinc);
  }, []);

  useEffect(() => {
    if (!corpo) return;
    sincronizarCorpo(corpo);
  }, [corpo, titulosConhecidos, sincronizarCorpo]);

  const lousasMencionadas = useMemo(() => {
    const rels = (dadosProps.relacionamentos as string[]) || [];
    const textoCombinado = `${corpo || ""} ${rels.join(" ")}`.toLowerCase();

    return (opcoesRelacionamento || []).filter((o) => {
      const ehLousa = o.caminho.startsWith("lousas/") || o.caminho.includes("lousa");
      if (!ehLousa) return false;
      const norm = o.titulo.toLowerCase().trim();
      const arq = o.caminho.split("/").pop()?.replace(/\.md$/, "").toLowerCase().trim() || "";
      return (
        norm &&
        (textoCombinado.includes(`@${norm}`) ||
          textoCombinado.includes(`[[${norm}]]`) ||
          (arq && textoCombinado.includes(arq)))
      );
    });
  }, [opcoesRelacionamento, corpo, dadosProps.relacionamentos]);

  const eTarefa = rotuloTipo?.toLowerCase().includes("tarefa");

  const conteudo = (
    <div className="space-y-5 max-w-4xl mx-auto w-full">
      {erro && <Aviso tom="erro">{erro}</Aviso>}

      <input
        type="text"
        value={titulo}
        onChange={(e) => setTitulo(e.target.value)}
        placeholder="Sem título"
        className="w-full text-2xl sm:text-3xl font-bold border-none outline-none bg-transparent placeholder:text-muted-foreground/30 focus:ring-0 px-0 pt-1"
        autoFocus
      />

      <div className="flex flex-col gap-2">
        <PropriedadesNotion
          dados={dadosProps}
          corpoTexto={corpo}
          onChange={onChangeProps}
          camposFixos={camposFixosProps}
          opcoesRelacionamento={opcoesRelacionamento}
        />
      </div>

      <hr className="border-border" />

      {eTarefa && (
        <>
          <div className="space-y-3">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Passos / Subtarefas
            </label>
            <Subtarefas
              corpo={corpo}
              onChange={(novoCorpo) => setCorpo(novoCorpo)}
            />
          </div>
          <hr className="border-border" />
        </>
      )}

      <div className="min-h-[220px] space-y-4">
        <EditorNotion
          key={caminhoItem || "nota-editor"}
          markdown={corpo}
          alvosOverride={alvosOverride}
          onChange={(v) => {
            const nCorpo = v ?? "";
            setCorpo(nCorpo);
          }}
        />
        {lousasMencionadas.map((l) => (
          <MapaMentalEmbed
            key={l.caminho}
            item={{
              caminho: l.caminho,
              nome: l.caminho.split("/").pop() || "",
              sha: "",
              texto: "",
              tamanho: 0,
              doc: { dados: { titulo: l.titulo, tipo: "lousa" }, corpo: "" },
            }}
          />
        ))}
      </div>

      {mencoes.length > 0 && (
        <div className="mt-6 border-t border-border pt-5">
          <MencionadoEm mencoes={mencoes} />
        </div>
      )}
    </div>
  );

  // MODO 4: FLUTUANTE (Nota Autoadesiva Redimensionável e Móvel com Z-INDEX 9999 e 60FPS)
  if (modoVisao === "flutuante") {
    if (minimizadoFlutuante) {
      return (
        <div
          ref={miniRef}
          style={{
            position: "fixed",
            left: `${posicaoFlutuante.x}px`,
            top: `${posicaoFlutuante.y}px`,
            zIndex: 9999,
          }}
          className="animate-in slide-in-from-bottom duration-200"
        >
          <div
            onClick={() => setMinimizadoFlutuante(false)}
            onMouseDown={iniciarArrastoCabecalho}
            onTouchStart={iniciarArrastoCabecalho}
            className="flex items-center gap-2.5 rounded-full border border-border bg-card/95 backdrop-blur-md px-4 py-2 text-xs font-bold text-foreground shadow-xl shadow-black/20 cursor-grab active:cursor-grabbing hover:scale-105 transition-all select-none"
          >
            <Pin size={14} className="text-primary shrink-0" />
            <span className="truncate max-w-[200px]">{titulo || "Nota Autoadesiva"}</span>
            <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-mono">Flutuante</span>
          </div>
          {modaisConfirmacao}
        </div>
      );
    }

    return (
      <div
        ref={painelRef}
        style={{
          position: "fixed",
          left: `${posicaoFlutuante.x}px`,
          top: `${posicaoFlutuante.y}px`,
          width: `${tamanhoFlutuante.largura}px`,
          height: `${tamanhoFlutuante.altura}px`,
          zIndex: 9999,
        }}
        className="fixed flex flex-col rounded-2xl border border-border/80 bg-card shadow-[0_20px_50px_rgba(0,0,0,0.35)] dark:shadow-[0_20px_60px_rgba(0,0,0,0.7)] overflow-hidden animate-in zoom-in-95 duration-150"
      >
        {/* Cabeçalho arrastável */}
        <div className="shrink-0">{cabecalho}</div>

        {/* Conteúdo */}
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">{conteudo}</div>

        {/* Rodapé */}
        <div className="shrink-0">{rodape}</div>

        {/* Handles de Redimensionamento em 8 direções */}
        <div
          onMouseDown={(e) => iniciarRedimensionamento("e", e)}
          onTouchStart={(e) => iniciarRedimensionamento("e", e)}
          className="absolute right-0 top-0 bottom-0 w-2 cursor-e-resize hover:bg-primary/20 transition-colors z-10"
        />
        <div
          onMouseDown={(e) => iniciarRedimensionamento("s", e)}
          onTouchStart={(e) => iniciarRedimensionamento("s", e)}
          className="absolute left-0 right-0 bottom-0 h-2 cursor-s-resize hover:bg-primary/20 transition-colors z-10"
        />
        <div
          onMouseDown={(e) => iniciarRedimensionamento("w", e)}
          onTouchStart={(e) => iniciarRedimensionamento("w", e)}
          className="absolute left-0 top-0 bottom-0 w-2 cursor-w-resize hover:bg-primary/20 transition-colors z-10"
        />
        <div
          onMouseDown={(e) => iniciarRedimensionamento("n", e)}
          onTouchStart={(e) => iniciarRedimensionamento("n", e)}
          className="absolute left-0 right-0 top-0 h-2 cursor-n-resize hover:bg-primary/20 transition-colors z-10"
        />

        {/* Canto SE (Inferior Direito com alça visual) */}
        <div
          onMouseDown={(e) => iniciarRedimensionamento("se", e)}
          onTouchStart={(e) => iniciarRedimensionamento("se", e)}
          className="absolute right-0 bottom-0 w-5 h-5 cursor-se-resize flex items-center justify-center text-muted-foreground/40 hover:text-foreground hover:scale-125 transition-all z-20"
          title="Arrastar para redimensionar"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
            <path d="M6 0L10 4L4 10L0 6L6 0Z" opacity="0.4" />
            <path d="M8 4L10 6L6 10L4 8L8 4Z" opacity="0.8" />
          </svg>
        </div>

        <div
          onMouseDown={(e) => iniciarRedimensionamento("sw", e)}
          onTouchStart={(e) => iniciarRedimensionamento("sw", e)}
          className="absolute left-0 bottom-0 w-4 h-4 cursor-sw-resize z-20"
        />
        <div
          onMouseDown={(e) => iniciarRedimensionamento("ne", e)}
          onTouchStart={(e) => iniciarRedimensionamento("ne", e)}
          className="absolute right-0 top-0 w-4 h-4 cursor-ne-resize z-20"
        />
        <div
          onMouseDown={(e) => iniciarRedimensionamento("nw", e)}
          onTouchStart={(e) => iniciarRedimensionamento("nw", e)}
          className="absolute left-0 top-0 w-4 h-4 cursor-nw-resize z-20"
        />

        {modaisConfirmacao}
      </div>
    );
  }

  // MODO 2: DO LADO (Painel Lateral / Drawer)
  if (modoVisao === "lado") {
    return (
      <div
        className="fixed inset-0 z-50 flex justify-end bg-black/20 backdrop-blur-[2px] p-0 sm:p-3 animate-in fade-in duration-150"
        onClick={tentarFechar}
      >
        <div
          className="flex h-full w-full sm:w-[560px] md:w-[680px] lg:w-[760px] flex-col rounded-t-2xl sm:rounded-2xl border border-border bg-card shadow-2xl overflow-hidden animate-in slide-in-from-right duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          {cabecalho}
          <div className="min-h-0 flex-1 overflow-y-auto px-5 sm:px-8 py-6">{conteudo}</div>
          {rodape}
        </div>
        {modaisConfirmacao}
      </div>
    );
  }

  // MODO 3: TELA CHEIA
  if (modoVisao === "telacheia") {
    return (
      <div
        className="fixed inset-0 z-[200] flex flex-col w-screen h-screen bg-background animate-in fade-in duration-150 overflow-hidden"
        onClick={tentarFechar}
      >
        <div
          className="flex h-full w-full flex-col bg-card overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {cabecalho}
          <div className="min-h-0 flex-1 overflow-y-auto px-6 sm:px-12 py-8">{conteudo}</div>
          {rodape}
        </div>
        {modaisConfirmacao}
      </div>
    );
  }

  // MODO 1: POP-UP CENTRALIZADO (Padrão)
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-[2px] p-3 sm:p-6 animate-in fade-in duration-150"
      onClick={tentarFechar}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-2xl border border-border bg-card shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {cabecalho}
        <div className="min-h-0 flex-1 overflow-y-auto px-5 sm:px-8 py-6">{conteudo}</div>
        {rodape}
      </div>
      {modaisConfirmacao}
    </div>
  );
}
