import { useState, useEffect, useCallback, useMemo, useRef, lazy, Suspense } from "react";
import {
  Square,
  PanelRight,
  Maximize2,
  PictureInPicture2,
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
  ChevronLeft,
  ChevronRight,
  Layout,
  FileText,
  ListTodo,
  Image as ImageIcon,
  Link as LinkIcon,
  Eye,
  EyeOff,
  Sparkles,
} from "lucide-react";
import { Aviso, ModalConfirmacao, Tooltip } from "@/components/ui";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { PropriedadesNotion, abrirItemSpa } from "@/components/PropriedadesNotion";
import { EditorNotion } from "@/components/EditorNotion";
import { Subtarefas } from "@/components/Subtarefas";
import { MencionadoEm } from "@/components/Links";
import { PainelTarefasNota } from "@/components/PainelTarefasNota";
import { PainelReferenciasNota } from "@/components/PainelReferenciasNota";
import { SumarioNota } from "@/components/SumarioNota";
import { ImagemPrivada } from "@/components/ImagemPrivada";
import { useWorkspace } from "@/components/workspace/WorkspaceContext";
import { obterTarefasVinculadas, obterReferenciasVinculadas } from "@/lib/vinculosNota";
import { sincronizarRelacionamentos } from "@/lib/links";
import { cn } from "@/lib/utils";
import { gerenciadorCamadas, NIVEIS_CAMADAS } from "@/lib/camadas";
import { lerMarkdown, escreverMarkdown, nomeLivre, mesclarFrontmatter } from "@/lib/markdown";
import { useSalvar } from "@/lib/useSalvar";
import { cache, invalidarCache } from "@/lib/repo";
import { lerConfig } from "@/lib/settings";
import { toast } from "@/lib/toast";

const MapaMentalEmbed = lazy(() =>
  import("@/components/MapaMentalEmbed").then((m) => ({
    default: m.MapaMentalEmbed,
  })),
);

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
  elementoAcimaCorpo?: React.ReactNode;
  campoFocoInicial?: string;
  posicaoLateral?: "esquerda" | "direita";
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
  elementoAcimaCorpo,
  campoFocoInicial,
  posicaoLateral = "direita",
}: PainelNotionBaseProps) {
  const [confirmandoApagar, setConfirmandoApagar] = useState(false);
  const [minimizadoFlutuante, setMinimizadoFlutuante] = useState(false);
  const [vendoHistorico, setVendoHistorico] = useState(false);
  const [menuAcoesAberto, setMenuAcoesAberto] = useState(false);
  const [confirmandoConversao, setConfirmandoConversao] = useState<{ novoTipo: string; novaPasta: string } | null>(null);
  const [lightboxImagem, setLightboxImagem] = useState<{ src: string; titulo: string } | null>(null);

  type AbaContextoPainel = "tudo" | "documento" | "tarefas" | "moodboard" | "conexoes";
  const [abaAtiva, setAbaAtiva] = useState<AbaContextoPainel>(() => {
    const salvo = localStorage.getItem("klaus_aba_contexto_painel");
    return (salvo as AbaContextoPainel) || "tudo";
  });

  const eTarefa = Boolean(rotuloTipo?.toLowerCase().includes("tarefa") || caminhoItem?.startsWith("tarefas/"));

  let workspace: any = null;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    workspace = useWorkspace();
  } catch {}

  const [modoFoco, setModoFoco] = useState(false);

  const abrirEmTelaCheiaComAbas = () => {
    if (workspace?.abrirNoWorkspace) {
      workspace.abrirNoWorkspace({
        id: caminhoItem || `doc-${Date.now()}`,
        titulo,
        corpo,
        dadosProps,
        camposFixosProps,
        rotuloTipo,
        caminho: caminhoItem,
        sha: (dadosProps as any)?.sha || "",
        temMudancas,
        salvando,
        erro,
        mencoes,
        opcoesRelacionamento,
        aoSalvar: async () => { await aoSalvar(); },
        aoRemover: aoRemover ? async () => { await aoRemover(); } : undefined,
      });
      aoFechar();
    } else {
      setModoVisao("telacheia");
      setMinimizadoFlutuante(false);
    }
  };

  const trocarAba = (nova: AbaContextoPainel) => {
    setAbaAtiva(nova);
    localStorage.setItem("klaus_aba_contexto_painel", nova);
  };

  const cfg = useMemo(() => lerConfig(), []);
  const { salvarTexto, apagarItem } = useSalvar(cfg);

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

  const moverParaPasta = useCallback(async (novaSubpasta: string) => {
    if (!caminhoItem) return;
    const partes = caminhoItem.split("/");
    const pastaRaiz = partes[0] === "pdi" ? `pdi/${partes[1]}` : partes[0];
    const nomeArquivo = partes[partes.length - 1];
    const prefixoDestino = novaSubpasta ? `${pastaRaiz}/${novaSubpasta}` : pastaRaiz;
    const novoCaminho = `${prefixoDestino}/${nomeArquivo}`;

    if (novoCaminho === caminhoItem) return;

    try {
      const texto = escreverMarkdown({ dados: dadosProps, corpo });
      await salvarTexto(novoCaminho, texto, undefined, `mover: ${nomeArquivo} para ${novaSubpasta || "raiz"}`);
      const itemOrigem = cache?.itens.find((i) => i.caminho === caminhoItem);
      if (itemOrigem?.sha) {
        await apagarItem(caminhoItem, itemOrigem.sha);
      }
      invalidarCache();
      window.dispatchEvent(new CustomEvent("acervo-atualizado"));
      toast(`Documento movido para "${novaSubpasta || pastaRaiz}" com sucesso!`, { tipo: "sucesso" });
      aoFechar();
      abrirItemSpa(novoCaminho);
    } catch (err: any) {
      toast(`Erro ao mover o item: ${err?.message || err}`, { tipo: "erro" });
    }
  }, [caminhoItem, dadosProps, corpo, salvarTexto, apagarItem, aoFechar]);

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

  const aoSalvarRef = useRef(aoSalvar);
  aoSalvarRef.current = aoSalvar;

  // ── Auto-save invisível com debounce de 12s ──────────────────────────────
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!temMudancas || salvando || fechandoRef.current) {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = null;
      }
      return;
    }

    autoSaveTimerRef.current = setTimeout(async () => {
      if (!temMudancasRef.current || salvandoRef.current || fechandoRef.current) return;
      try {
        await aoSalvarRef.current();
      } catch {
        // Falha silenciosa — o save por fechar ainda funciona como fallback
      }
    }, 12000);

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = null;
      }
    };
  }, [temMudancas, salvando, titulo, corpo, dadosProps]);

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
    const ehLado = modoVisao === "lado";
    const limpar = gerenciadorCamadas.registrar({
      id: `painel-notion-${caminhoItem || titulo || "editor"}`,
      nivel: ehFlutuante ? NIVEIS_CAMADAS.JANELA_FLUTUANTE : NIVEIS_CAMADAS.PAINEL_NOTION_BASE,
      temBackdrop: !ehFlutuante && !ehLado,
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

  // Informações de Navegação Sequencial no Pop-up (Ex: "3 de 100" e setas < e >)
  const infoSequencial = useMemo(() => {
    if (!caminhoItem) {
      return { indice: 0, total: 0, podeAnterior: false, podeProximo: false, anterior: null, proximo: null };
    }

    const pasta = caminhoItem.includes("/")
      ? caminhoItem.substring(0, caminhoItem.lastIndexOf("/"))
      : "";

    // Agrega todos os itens conhecidos (opções de relacionamento + cache global)
    const mapaItens = new Map<string, { caminho: string; titulo: string }>();

    if (Array.isArray(opcoesRelacionamento)) {
      for (const op of opcoesRelacionamento) {
        if (op?.caminho) {
          mapaItens.set(op.caminho, { caminho: op.caminho, titulo: op.titulo });
        }
      }
    }

    if (cache?.itens) {
      for (const it of cache.itens) {
        if (it?.caminho && !mapaItens.has(it.caminho)) {
          mapaItens.set(it.caminho, { caminho: it.caminho, titulo: it.nome });
        }
      }
    }

    const todosItens = Array.from(mapaItens.values()).filter((i) => {
      if (!pasta) return true;
      return (
        i.caminho.startsWith(pasta + "/") &&
        !i.caminho.endsWith(".excalidraw.json") &&
        !i.caminho.endsWith(".png") &&
        !i.caminho.endsWith(".jpg")
      );
    });

    const ordenados = [...todosItens].sort((a, b) => a.caminho.localeCompare(b.caminho));
    const idx = ordenados.findIndex((i) => i.caminho === caminhoItem);

    if (idx === -1) {
      return { indice: 1, total: Math.max(1, ordenados.length), podeAnterior: false, podeProximo: false, anterior: null, proximo: null };
    }

    return {
      indice: idx + 1,
      total: ordenados.length,
      podeAnterior: idx > 0,
      podeProximo: idx < ordenados.length - 1,
      anterior: idx > 0 ? ordenados[idx - 1] : null,
      proximo: idx < ordenados.length - 1 ? ordenados[idx + 1] : null,
    };
  }, [caminhoItem, opcoesRelacionamento]);

  const navegarSequencial = async (direcao: "anterior" | "proximo") => {
    const itemAlvo = direcao === "anterior" ? infoSequencial.anterior : infoSequencial.proximo;
    if (!itemAlvo) return;
    if (temMudancas) {
      try {
        await aoSalvar();
      } catch {}
    }
    abrirItemSpa(itemAlvo.caminho);
  };

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
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        {/* Botão de Modo Foco / Zen */}
        <Tooltip conteudo={modoFoco ? "Sair do Modo Foco" : "Modo Foco (Escrita limpa sem distrações)"}>
          <button
            type="button"
            onClick={() => setModoFoco(!modoFoco)}
            className={cn(
              "p-1.5 rounded-lg transition-colors cursor-pointer flex items-center justify-center text-xs font-medium",
              modoFoco
                ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 font-semibold border border-amber-500/30 shadow-2xs"
                : "text-muted-foreground hover:text-foreground hover:bg-accent/60"
            )}
            aria-label="Alternar modo foco"
          >
            {modoFoco ? <EyeOff size={14} className="text-amber-500" /> : <Eye size={14} />}
          </button>
        </Tooltip>

        {/* Alternador direto e instantâneo de modos de visualização */}
        <div className="flex items-center bg-secondary/60 rounded-xl p-0.5 border border-border/60 shrink-0">
          <Tooltip conteudo="Pop-up Central">
            <button
              type="button"
              onClick={() => { setModoVisao("popup"); setMinimizadoFlutuante(false); }}
              className={cn(
                "p-1.5 rounded-lg transition-colors cursor-pointer",
                modoVisao === "popup" 
                  ? "bg-primary text-primary-foreground shadow-2xs font-semibold" 
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/60"
              )}
              aria-label="Modo Pop-up Central"
            >
              <Square size={13} />
            </button>
          </Tooltip>

          <Tooltip conteudo="Painel Lateral">
            <button
              type="button"
              onClick={() => { setModoVisao("lado"); setMinimizadoFlutuante(false); }}
              className={cn(
                "p-1.5 rounded-lg transition-colors cursor-pointer",
                modoVisao === "lado" 
                  ? "bg-primary text-primary-foreground shadow-2xs font-semibold" 
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/60"
              )}
              aria-label="Modo Painel Lateral"
            >
              <PanelRight size={13} />
            </button>
          </Tooltip>

          <Tooltip conteudo="Tela Cheia (Abas no Navegador)">
            <button
              type="button"
              onClick={abrirEmTelaCheiaComAbas}
              className={cn(
                "p-1.5 rounded-lg transition-colors cursor-pointer",
                modoVisao === "telacheia" 
                  ? "bg-primary text-primary-foreground shadow-2xs font-semibold" 
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/60"
              )}
              aria-label="Modo Tela Cheia com Abas"
            >
              <Maximize2 size={13} />
            </button>
          </Tooltip>

          <Tooltip conteudo="Janela Flutuante Livre">
            <button
              type="button"
              onClick={() => { setModoVisao("flutuante"); setMinimizadoFlutuante(false); }}
              className={cn(
                "p-1.5 rounded-lg transition-colors cursor-pointer",
                modoVisao === "flutuante" 
                  ? "bg-primary text-primary-foreground shadow-2xs font-semibold" 
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/60"
              )}
              aria-label="Modo Janela Flutuante"
            >
              <PictureInPicture2 size={13} />
            </button>
          </Tooltip>
        </div>

        {modoVisao === "flutuante" && (
          <Tooltip conteudo={minimizadoFlutuante ? "Expandir janela" : "Minimizar janela"} posicao="bottom">
            <button
              type="button"
              onClick={() => setMinimizadoFlutuante(!minimizadoFlutuante)}
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors cursor-pointer"
              aria-label={minimizadoFlutuante ? "Expandir janela" : "Minimizar janela"}
            >
              {minimizadoFlutuante ? <Maximize size={15} /> : <Minimize2 size={15} />}
            </button>
          </Tooltip>
        )}

        <Popover open={menuAcoesAberto} onOpenChange={setMenuAcoesAberto}>
          <Tooltip conteudo="Ações do documento" posicao="bottom">
            <PopoverTrigger asChild>
              <button
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors cursor-pointer"
                aria-label="Ações do item"
              >
                <MoreVertical size={16} />
              </button>
            </PopoverTrigger>
          </Tooltip>
          <PopoverContent className="z-[300] w-56 p-1.5 shadow-xl border-border" align="end">
            <div className="flex flex-col gap-0.5">
              {caminhoItem ? (
                <>
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

                  <div className="my-1 border-t border-border/60" />
                  <button
                    onClick={() => {
                      setMenuAcoesAberto(false);
                      setVendoHistorico(true);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs text-left text-foreground hover:bg-accent transition-colors"
                  >
                    <IconeHistorico size={14} className="opacity-70 shrink-0" />
                    <span>Histórico de versões</span>
                  </button>

                  {aoRemover && (
                    <button
                      onClick={() => {
                        setMenuAcoesAberto(false);
                        setConfirmandoApagar(true);
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs text-left text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <Trash2 size={14} className="shrink-0" />
                      <span>Excluir {rotuloTipo?.toLowerCase() || "item"}</span>
                    </button>
                  )}
                </>
              ) : (
                <div className="px-2.5 py-2 text-xs text-muted-foreground text-center">
                  Salve o documento para liberar opções de link e conversão.
                </div>
              )}
            </div>
          </PopoverContent>
        </Popover>

        <Tooltip conteudo={fechandoESalvando ? "Salvando…" : "Fechar e Salvar"} posicao="bottom">
          <button
            onClick={tentarFechar}
            disabled={fechandoESalvando}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors disabled:opacity-40 disabled:cursor-wait"
            aria-label="Fechar e Salvar"
          >
            <X size={17} />
          </button>
        </Tooltip>
      </div>
    </div>
  );

  const rodape = infoSequencial.total > 0 ? (
    <div className="flex shrink-0 items-center justify-between gap-2 border-t border-border px-4 sm:px-5 py-2 sm:py-2.5 pb-[max(env(safe-area-inset-bottom),10px)] sm:pb-2.5 bg-card/60 backdrop-blur-xs">
      <div className="flex items-center gap-1 bg-muted/50 px-2 py-0.5 rounded-lg border border-border/60 mx-auto">
        <Tooltip conteudo="Documento anterior" atalho="←" posicao="top" desabilitado={!infoSequencial.podeAnterior}>
          <button
            onClick={() => navegarSequencial("anterior")}
            disabled={!infoSequencial.podeAnterior}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
            aria-label="Documento anterior"
          >
            <ChevronLeft size={14} />
          </button>
        </Tooltip>

        <span className="text-[11px] font-medium text-muted-foreground px-1 select-none">
          {infoSequencial.indice || 1} de {infoSequencial.total}
        </span>

        <Tooltip conteudo="Próximo documento" atalho="→" posicao="top" desabilitado={!infoSequencial.podeProximo}>
          <button
            onClick={() => navegarSequencial("proximo")}
            disabled={!infoSequencial.podeProximo}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
            aria-label="Próximo documento"
          >
            <ChevronRight size={14} />
          </button>
        </Tooltip>
      </div>
    </div>
  ) : null;

  const modaisConfirmacao = (
    <>
      <ModalConfirmacao
        aberto={confirmandoApagar}
        titulo={`Excluir "${titulo || "este item"}"?`}
        descricao="Tem certeza de que deseja excluir? O item será enviado para a Lixeira Soberana (.lixeira/) e poderá ser recuperado a qualquer momento."
        textoConfirmar="Sim, excluir"
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

      {lightboxImagem && (
        <div
          className="fixed inset-0 z-[700] bg-black/95 backdrop-blur-md flex flex-col justify-between p-3 sm:p-6 animate-in fade-in duration-200"
          onClick={() => setLightboxImagem(null)}
        >
          <div className="flex items-center justify-between z-10 select-none pt-[env(safe-area-inset-top,0px)]" onClick={(e) => e.stopPropagation()}>
            <span className="font-bold text-sm text-white/90 truncate max-w-[70vw]">
              {lightboxImagem.titulo}
            </span>
            <button
              type="button"
              onClick={() => setLightboxImagem(null)}
              className="p-2 rounded-full bg-white/15 hover:bg-white/25 text-white transition-colors cursor-pointer"
              aria-label="Fechar visualização"
            >
              <X size={18} />
            </button>
          </div>

          <div
            className="flex-1 flex items-center justify-center p-2 sm:p-4 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <ImagemPrivada
              caminho={lightboxImagem.src}
              alt={lightboxImagem.titulo}
              className="max-h-[80vh] max-w-[95vw] object-contain rounded-2xl shadow-2xl"
            />
          </div>

          <div
            className="flex items-center justify-between gap-2 p-3 pb-[max(env(safe-area-inset-bottom),12px)] rounded-2xl bg-white/10 border border-white/15 backdrop-blur-md text-white/90 text-xs z-10"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="text-[11px] sm:text-xs truncate">
              {caminhoItem || "Imagem do documento"}
            </span>
            <button
              type="button"
              onClick={async (e) => {
                e.stopPropagation();
                await navigator.clipboard.writeText(`![](${lightboxImagem.src})`);
                toast("Código Markdown copiado!");
              }}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/15 hover:bg-white/25 transition-colors cursor-pointer text-xs"
            >
              <Copy size={13} />
              <span>Copiar Markdown</span>
            </button>
          </div>
        </div>
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

  const eNota = !eTarefa && (!rotuloTipo || rotuloTipo.toLowerCase().includes("nota") || rotuloTipo.toLowerCase().includes("rascunho") || Boolean(caminhoItem?.startsWith("notas/")));

  // Busca tarefas e referências vinculadas para controlar a exibição condicional de visões e blocos
  const tarefasVinculadas = useMemo(
    () => obterTarefasVinculadas(titulo, caminhoItem, dadosProps.relacionamentos),
    [titulo, caminhoItem, dadosProps.relacionamentos]
  );

  const referenciasVinculadas = useMemo(
    () => obterReferenciasVinculadas(titulo, caminhoItem, dadosProps.relacionamentos),
    [titulo, caminhoItem, dadosProps.relacionamentos]
  );

  const temTarefas = tarefasVinculadas.length > 0;
  const temReferencias = referenciasVinculadas.length > 0;
  const temConexoes = mencoes.length > 0;
  const temMaisDeUmaVisao = temTarefas || temReferencias || temConexoes;

  // Ajusta aba ativa para não ficar presa numa visão sem conteúdo
  const abaEfetiva: AbaContextoPainel = useMemo(() => {
    if (abaAtiva === "tarefas" && !temTarefas) return "tudo";
    if (abaAtiva === "moodboard" && !temReferencias) return "tudo";
    if (abaAtiva === "conexoes" && !temConexoes) return "tudo";
    return abaAtiva;
  }, [abaAtiva, temTarefas, temReferencias, temConexoes]);

  const abasDisponiveis = useMemo(() => {
    if (!temMaisDeUmaVisao) return [];
    return [
      { id: "tudo", rotulo: "Visão Completa", icone: <Layout className="w-3.5 h-3.5" /> },
      { id: "documento", rotulo: "Documento", icone: <FileText className="w-3.5 h-3.5 text-blue-500" /> },
      ...(temTarefas
        ? [{ id: "tarefas", rotulo: `Tarefas (${tarefasVinculadas.length})`, icone: <ListTodo className="w-3.5 h-3.5 text-primary" /> }]
        : []),
      ...(temReferencias
        ? [{ id: "moodboard", rotulo: `Moodboard (${referenciasVinculadas.length})`, icone: <ImageIcon className="w-3.5 h-3.5 text-purple-500" /> }]
        : []),
      ...(temConexoes
        ? [{ id: "conexoes", rotulo: `Conexões (${mencoes.length})`, icone: <LinkIcon className="w-3.5 h-3.5 text-amber-500" /> }]
        : []),
    ];
  }, [temMaisDeUmaVisao, temTarefas, tarefasVinculadas.length, temReferencias, referenciasVinculadas.length, temConexoes, mencoes.length]);

  const conteudo = (
    <div className="space-y-5 max-w-4xl mx-auto w-full">
      {erro && <Aviso tom="erro">{erro}</Aviso>}

      <input
        type="text"
        value={titulo}
        onChange={(e) => setTitulo(e.target.value)}
        placeholder="Sem título"
        className="w-full text-2xl sm:text-3xl font-bold border-none outline-none bg-transparent placeholder:text-muted-foreground/30 focus:ring-0 px-0 pt-1"
        autoFocus={!campoFocoInicial}
      />

      {modoFoco && (
        <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-600 dark:text-amber-400 select-none animate-in fade-in">
          <span className="flex items-center gap-1.5 font-semibold">
            <Sparkles size={13} />
            Modo Foco Ativo — Escrita limpa sem distrações
          </span>
          <button
            type="button"
            onClick={() => setModoFoco(false)}
            className="text-[11px] underline font-medium hover:text-foreground cursor-pointer"
          >
            Sair do Foco
          </button>
        </div>
      )}

      {!modoFoco && (
        <>
          <div className="flex flex-col gap-2">
            <PropriedadesNotion
              dados={dadosProps}
              corpoTexto={corpo}
              onChange={onChangeProps}
              camposFixos={camposFixosProps}
              opcoesRelacionamento={opcoesRelacionamento}
              caminhoItem={caminhoItem}
              rotuloTipo={rotuloTipo}
              focoPropriedadeInicial={campoFocoInicial}
              aoMoverPasta={moverParaPasta}
            />
          </div>

          <hr className="border-border" />
        </>
      )}

      {elementoAcimaCorpo ? (
        elementoAcimaCorpo
      ) : (
        (() => {
          const imgPath =
            (typeof dadosProps.imagem === "string" && dadosProps.imagem.trim()) ||
            (typeof dadosProps.capa === "string" && dadosProps.capa.trim()) ||
            (caminhoItem?.startsWith("referencias/") &&
              corpo?.match(/!\[.*?\]\((referencias\/imagens\/[^)]+)\)/i)?.[1]) ||
            "";

          if (!imgPath) return null;

          return (
            <div className="relative group rounded-2xl sm:rounded-3xl overflow-hidden border border-border/80 bg-black/5 dark:bg-black/20 max-h-[380px] flex items-center justify-center">
              <ImagemPrivada
                caminho={imgPath}
                alt={titulo || "Imagem de referência"}
                className="max-h-[380px] w-full object-contain rounded-2xl transition-transform duration-300 group-hover:scale-[1.01]"
              />
              <div className="absolute top-3 right-3 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                <Tooltip conteudo="Copiar código Markdown">
                  <button
                    type="button"
                    onClick={async (e) => {
                      e.stopPropagation();
                      await navigator.clipboard.writeText(`![](${imgPath})`);
                      toast("Código da imagem copiado!");
                    }}
                    className="p-1.5 rounded-full bg-black/60 text-white backdrop-blur-sm hover:scale-110 transition-transform cursor-pointer shadow-md"
                    aria-label="Copiar código Markdown"
                  >
                    <Copy size={13} />
                  </button>
                </Tooltip>
                <Tooltip conteudo="Ver em tela cheia">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setLightboxImagem({ src: imgPath, titulo: titulo || "Imagem" });
                    }}
                    className="p-1.5 rounded-full bg-black/60 text-white backdrop-blur-sm hover:scale-110 transition-transform cursor-pointer shadow-md"
                    aria-label="Ver em tela cheia"
                  >
                    <Maximize2 size={13} />
                  </button>
                </Tooltip>
              </div>
            </div>
          );
        })()
      )}

      {/* Abas Superiores de Contexto (só exibe se houver mais de uma visão disponível) */}
      {temMaisDeUmaVisao && abasDisponiveis.length > 1 && (
        <div className="flex items-center gap-1.5 border-b border-border/60 pb-2 overflow-x-auto select-none pt-1">
          {abasDisponiveis.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => trocarAba(tab.id as AbaContextoPainel)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap",
                abaEfetiva === tab.id
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/60"
              )}
            >
              {tab.icone}
              <span>{tab.rotulo}</span>
            </button>
          ))}
        </div>
      )}

      {/* Bloco 1: Documento (Editor e Subtarefas) */}
      {(abaEfetiva === "tudo" || abaEfetiva === "documento") && (
        <div className="space-y-4 animate-in fade-in duration-150">
          {eNota && <SumarioNota corpo={corpo} />}

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
              aoAbrirMencao={async (alvo) => {
                if (temMudancas) {
                  try {
                    await aoSalvar();
                  } catch {}
                }
                abrirItemSpa(alvo.caminho);
              }}
              onChange={(v) => {
                const nCorpo = v ?? "";
                setCorpo(nCorpo);
              }}
            />
            {lousasMencionadas.map((l) => (
              <Suspense key={l.caminho} fallback={<div className="p-4 text-center text-xs text-muted-foreground animate-pulse">Carregando visualização do mapa mental...</div>}>
                <MapaMentalEmbed
                  item={{
                    caminho: l.caminho,
                    nome: l.caminho.split("/").pop() || "",
                    sha: "",
                    texto: "",
                    tamanho: 0,
                    doc: { dados: { titulo: l.titulo, tipo: "lousa" }, corpo: "" },
                  }}
                />
              </Suspense>
            ))}
          </div>
        </div>
      )}

      {/* Bloco 2: Tarefas do Projeto (só exibe se houver tarefas vinculadas) */}
      {temTarefas && (abaEfetiva === "tudo" || abaEfetiva === "tarefas") && (
        <div className="space-y-3 pt-2 animate-in fade-in duration-150">
          <PainelTarefasNota
            tituloNota={titulo}
            caminhoNota={caminhoItem}
            relacionamentos={dadosProps.relacionamentos}
            tarefasPrecarregadas={tarefasVinculadas}
          />
        </div>
      )}

      {/* Bloco 3: Moodboard e Referências Visuais (só exibe se houver referências vinculadas) */}
      {temReferencias && (abaEfetiva === "tudo" || abaEfetiva === "moodboard") && (
        <div className="space-y-3 pt-2 animate-in fade-in duration-150">
          <PainelReferenciasNota
            tituloNota={titulo}
            caminhoNota={caminhoItem}
            relacionamentos={dadosProps.relacionamentos}
            referenciasPrecarregadas={referenciasVinculadas}
          />
        </div>
      )}

      {/* Bloco 4: Conexões e Menções (só exibe se houver conexões) */}
      {temConexoes && (abaEfetiva === "tudo" || abaEfetiva === "conexoes") && (
        <div className="mt-6 border-t border-border pt-5 animate-in fade-in duration-150">
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
        <Tooltip conteudo="Arrastar para redimensionar">
          <div
            onMouseDown={(e) => iniciarRedimensionamento("se", e)}
            onTouchStart={(e) => iniciarRedimensionamento("se", e)}
            className="absolute right-0 bottom-0 w-5 h-5 cursor-se-resize flex items-center justify-center text-muted-foreground/40 hover:text-foreground hover:scale-125 transition-all z-20"
            role="separator"
            aria-label="Redimensionar janela flutuante"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
              <path d="M6 0L10 4L4 10L0 6L6 0Z" opacity="0.4" />
              <path d="M8 4L10 6L6 10L4 8L8 4Z" opacity="0.8" />
            </svg>
          </div>
        </Tooltip>

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

  // MODO 2: DO LADO (Painel Lateral / Lado a Lado)
  if (modoVisao === "lado") {
    const ehEsquerda = posicaoLateral === "esquerda";
    return (
      <div
        className={cn(
          "fixed z-50 flex flex-col rounded-none sm:rounded-2xl border-0 sm:border border-border bg-card shadow-2xl overflow-hidden animate-in duration-200 pointer-events-auto",
          "top-0 bottom-0 sm:top-2 sm:bottom-2",
          ehEsquerda
            ? "left-0 sm:left-2 slide-in-from-left w-full sm:w-[540px] md:w-[620px] lg:w-[calc(50vw-16px)]"
            : "right-0 sm:right-2 slide-in-from-right w-full sm:w-[540px] md:w-[620px] lg:w-[calc(50vw-16px)]"
        )}
      >
        {cabecalho}
        <div className="min-h-0 flex-1 overflow-y-auto px-4 sm:px-8 py-4 sm:py-6">{conteudo}</div>
        {rodape}
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
          <div className="min-h-0 flex-1 overflow-y-auto px-4 sm:px-12 py-5 sm:py-8">{conteudo}</div>
          {rodape}
        </div>
        {modaisConfirmacao}
      </div>
    );
  }

  // MODO 1: POP-UP CENTRALIZADO (Padrão) - no mobile vira tela cheia imersiva
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background sm:bg-black/30 backdrop-blur-none sm:backdrop-blur-[2px] p-0 sm:p-6 animate-in fade-in duration-150"
      onClick={tentarFechar}
    >
      <div
        className="flex h-full sm:h-auto sm:max-h-[90vh] w-full max-w-3xl flex-col rounded-none sm:rounded-2xl border-0 sm:border border-border bg-card shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {cabecalho}
        <div className="min-h-0 flex-1 overflow-y-auto px-4 sm:px-8 py-4 sm:py-6">{conteudo}</div>
        {rodape}
      </div>
      {modaisConfirmacao}
    </div>
  );
}
