import { useEffect, useRef, useState, useCallback } from "react";
import {
  Play,
  Pause,
  Search,
  ZoomIn,
  ZoomOut,
  Crosshair,
} from "lucide-react";
import {
  construirGrafo3D as construirGrafo,
  simularPassoFisica3D as simularFisica,
  type DadosGrafo3D as DadosGrafo,
  type NoGrafo3D as NoGrafo,
  type TipoNoGrafo,
  CORES_TIPOS_GRAFO,
} from "@/lib/grafo";
import type { ItemRepo } from "@/lib/repo";
import { cn } from "@/lib/utils";

interface NavegadorGrafoProps {
  acervo: ItemRepo[];
  aoSelecionarItem: (caminho: string) => void;
  className?: string;
}

/**
 * Visualizador de Grafo de Conhecimento Minimalista & Funcional (Estilo Obsidian / Reflect).
 *
 * Apresenta uma visão limpa e interativa de todas as notas, tarefas, metas e conexões.
 */
export function NavegadorGrafo3D({
  acervo,
  aoSelecionarItem,
  className,
}: NavegadorGrafoProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Filtros e opções
  const [pesquisa, setPesquisa] = useState("");
  const [filtroTipo, setFiltroTipo] = useState<TipoNoGrafo | "todos">("todos");
  const [simulando, setSimulando] = useState(true);
  const [noHover, setNoHover] = useState<NoGrafo | null>(null);

  // Posição de Pan e Zoom 2D da Câmera
  const cameraRef = useRef({
    panX: 0,
    panY: 0,
    zoom: 1.0,
  });

  // Estado do grafo
  const grafoRef = useRef<DadosGrafo>({ nos: [], arestas: [] });

  // Constrói o grafo a partir dos itens do acervo
  useEffect(() => {
    if (acervo.length === 0) return;
    const dados = construirGrafo(acervo, { incluirTags: true });
    // Zera Z para manter projeção 2D limpa e previsível
    dados.nos.forEach((n) => {
      n.z = 0;
      n.vz = 0;
    });
    grafoRef.current = dados;
  }, [acervo]);

  // Centraliza a câmera no grafo
  const reajustarCentralizacao = useCallback(() => {
    cameraRef.current = { panX: 0, panY: 0, zoom: 1.0 };
  }, []);

  // Loop de Renderização e Animação (60 FPS)
  useEffect(() => {
    let animId: number;

    const render = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const largura = canvas.clientWidth;
      const altura = canvas.clientHeight;
      if (canvas.width !== largura || canvas.height !== altura) {
        canvas.width = largura;
        canvas.height = altura;
      }

      // Executa passo de simulação física se ativado
      if (simulando && grafoRef.current.nos.length > 0) {
        simularFisica(grafoRef.current, 0.88);
        // Mantém Z zerado para estabilidade 2D
        grafoRef.current.nos.forEach((n) => {
          n.z = 0;
          n.vz = 0;
        });
      }

      const { panX, panY, zoom } = cameraRef.current;
      const centroX = largura / 2 + panX;
      const centroY = altura / 2 + panY;

      const escuro = document.documentElement.classList.contains("dark");

      // Limpa o canvas para que ele herde o fundo definido via CSS/Tailwind (bg-background)
      ctx.clearRect(0, 0, largura, altura);

      const { nos, arestas } = grafoRef.current;

      // Mapeamento de nós conectados ao nó sob hover
      const conexoesHover = new Set<string>();
      if (noHover) {
        conexoesHover.add(noHover.id);
        for (const a of arestas) {
          if (a.origem === noHover.id) conexoesHover.add(a.destino);
          if (a.destino === noHover.id) conexoesHover.add(a.origem);
        }
      }

      const mapaNos = new Map(nos.map((n) => [n.id, n]));

      // 1. Desenha as Arestas de Conexão (Linhas Finas e Elegantes)
      for (const a of arestas) {
        const n1 = mapaNos.get(a.origem);
        const n2 = mapaNos.get(a.destino);
        if (!n1 || !n2) continue;

        // Filtro de tipo ativo
        if (filtroTipo !== "todos" && n1.tipo !== filtroTipo && n2.tipo !== filtroTipo) {
          continue;
        }

        const x1 = centroX + n1.x * zoom;
        const y1 = centroY + n1.y * zoom;
        const x2 = centroX + n2.x * zoom;
        const y2 = centroY + n2.y * zoom;

        const estaConectadoAoHover =
          noHover && (a.origem === noHover.id || a.destino === noHover.id);

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);

        if (estaConectadoAoHover) {
          ctx.strokeStyle = escuro ? "#60a5fa" : "#3b82f6";
          ctx.lineWidth = 1.8 * zoom;
          ctx.globalAlpha = 0.9;
        } else {
          ctx.strokeStyle = escuro ? "rgba(148, 163, 184, 0.18)" : "rgba(100, 116, 139, 0.22)";
          ctx.lineWidth = 1 * zoom;
          ctx.globalAlpha = noHover ? 0.08 : 0.4;
        }
        ctx.stroke();
        ctx.globalAlpha = 1.0;
      }

      // 2. Desenha os Nós como Círculos Limpos
      for (const no of nos) {
        if (filtroTipo !== "todos" && no.tipo !== filtroTipo) continue;

        const x = centroX + no.x * zoom;
        const y = centroY + no.y * zoom;

        const coincidePesquisa = pesquisa
          ? no.titulo.toLowerCase().includes(pesquisa.toLowerCase())
          : true;

        const ehHover = noHover?.id === no.id;
        const ehConectadoAoHover = conexoesHover.has(no.id);

        let alpha = 1.0;
        if (pesquisa && !coincidePesquisa) alpha = 0.15;
        else if (noHover && !ehConectadoAoHover) alpha = 0.2;

        const raioBase = Math.max(4, Math.min(no.raio * 0.7, 16));
        const raioFinal = (ehHover ? raioBase * 1.3 : raioBase) * zoom;

        ctx.save();
        ctx.globalAlpha = alpha;

        // Anel Externo ao Passar o Mouse
        if (ehHover) {
          ctx.beginPath();
          ctx.arc(x, y, raioFinal + 4, 0, Math.PI * 2);
          ctx.strokeStyle = no.cor;
          ctx.lineWidth = 2;
          ctx.stroke();
        }

        // Círculo do Nó
        ctx.beginPath();
        ctx.arc(x, y, raioFinal, 0, Math.PI * 2);
        ctx.fillStyle = no.cor;
        ctx.fill();

        // Borda sutil
        ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
        ctx.lineWidth = 1;
        ctx.stroke();

        // Rótulo do Título (aparece no hover, no zoom próximo ou na busca)
        const deveMostrarRotulo =
          ehHover ||
          (noHover && ehConectadoAoHover) ||
          zoom > 1.2 ||
          (pesquisa && coincidePesquisa);

        if (deveMostrarRotulo) {
          ctx.font = `${ehHover ? "600 12px" : "11px"} sans-serif`;
          ctx.fillStyle = ehHover
            ? (escuro ? "#ffffff" : "#0f172a")
            : (escuro ? "rgba(226, 232, 240, 0.85)" : "rgba(15, 23, 42, 0.85)");
          ctx.textAlign = "center";
          ctx.fillText(no.titulo, x, y + raioFinal + 12);
        }

        ctx.restore();
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [simulando, filtroTipo, pesquisa, noHover]);

  // Controles de Pan (Arraste 2D do Canvas)
  const estaArrastandoRef = useRef(false);
  const posAnteriorRef = useRef({ x: 0, y: 0 });

  const aoIniciarArraste = (e: React.MouseEvent | React.TouchEvent) => {
    estaArrastandoRef.current = true;
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    posAnteriorRef.current = { x: clientX, y: clientY };
  };

  const aoMoverArraste = (e: React.MouseEvent | React.TouchEvent) => {
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

    if (estaArrastandoRef.current) {
      const dx = clientX - posAnteriorRef.current.x;
      const dy = clientY - posAnteriorRef.current.y;

      cameraRef.current.panX += dx;
      cameraRef.current.panY += dy;
      posAnteriorRef.current = { x: clientX, y: clientY };
      return;
    }

    // Hover sobre os nós no canvas 2D
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = clientX - rect.left;
    const my = clientY - rect.top;

    const largura = canvas.width;
    const altura = canvas.height;
    const { panX, panY, zoom } = cameraRef.current;
    const centroX = largura / 2 + panX;
    const centroY = altura / 2 + panY;

    const { nos } = grafoRef.current;
    let achado: NoGrafo | null = null;

    for (const no of nos) {
      if (filtroTipo !== "todos" && no.tipo !== filtroTipo) continue;
      const nx = centroX + no.x * zoom;
      const ny = centroY + no.y * zoom;
      const dist = Math.hypot(mx - nx, my - ny);
      if (dist < Math.max(no.raio * zoom, 10)) {
        achado = no;
        break;
      }
    }

    setNoHover(achado);
  };

  const aoFinalizarArraste = () => {
    estaArrastandoRef.current = false;
  };

  // Zoom no scroll do mouse
  const aoRolarWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 0.9 : 1.1;
    cameraRef.current.zoom = Math.min(Math.max(0.4, cameraRef.current.zoom * factor), 3.5);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.addEventListener("wheel", aoRolarWheel, { passive: false });
    return () => {
      canvas.removeEventListener("wheel", aoRolarWheel);
    };
  }, [aoRolarWheel]);

  // Clique para abrir o documento no Notion Modal
  const aoClicarCanvas = () => {
    if (noHover && !noHover.caminho.startsWith("tag_")) {
      aoSelecionarItem(noHover.caminho);
    }
  };

  return (
    <div className={cn("relative w-full h-[calc(100vh-140px)] rounded-2xl overflow-hidden border border-border bg-[#0c1017] shadow-xl", className)}>
      {/* Canvas 2D Minimalista */}
      <canvas
        ref={canvasRef}
        onMouseDown={aoIniciarArraste}
        onMouseMove={aoMoverArraste}
        onMouseUp={aoFinalizarArraste}
        onTouchStart={aoIniciarArraste}
        onTouchMove={aoMoverArraste}
        onTouchEnd={aoFinalizarArraste}
        onClick={aoClicarCanvas}
        className="w-full h-full bg-background cursor-grab active:cursor-grabbing block"
      />

      {/* Barra de Filtros Minimalista no Topo */}
      <div className="absolute top-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2.5 pointer-events-none">
        <div className="flex items-center gap-2 bg-card/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-border/80 shadow-md pointer-events-auto max-w-xs w-full">
          <Search size={15} className="text-muted-foreground shrink-0" />
          <input
            type="text"
            value={pesquisa}
            onChange={(e) => setPesquisa(e.target.value)}
            placeholder="Buscar notas, tarefas, tags..."
            className="w-full bg-transparent border-0 outline-none text-xs text-foreground placeholder:text-muted-foreground focus:ring-0"
          />
        </div>

        {/* Chips de Categoria Minimalistas */}
        <div className="flex items-center gap-1 bg-card/90 backdrop-blur-md p-1 rounded-xl border border-border/80 shadow-md pointer-events-auto overflow-x-auto">
          {(["todos", "nota", "tarefa", "meta", "referencia", "lousa"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setFiltroTipo(t)}
              className={cn(
                "px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all capitalize shrink-0 flex items-center gap-1.5",
                filtroTipo === t
                  ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              {t !== "todos" && (
                <span
                  className="w-2 h-2 rounded-full inline-block"
                  style={{ backgroundColor: CORES_TIPOS_GRAFO[t] }}
                />
              )}
              <span>{t === "todos" ? "Tudo" : t}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Cartão Informativo de Hover no Nó Sob o Cursor */}
      {noHover && (
        <div className="absolute top-16 left-3 pointer-events-none bg-card/95 border border-border rounded-xl p-3 shadow-xl backdrop-blur-md animate-in fade-in duration-100 max-w-xs">
          <div className="flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: noHover.cor }}
            />
            <span className="text-xs font-bold text-foreground truncate">{noHover.titulo}</span>
          </div>
          <div className="mt-1.5 flex items-center justify-between text-[11px] text-muted-foreground">
            <span className="capitalize">{noHover.tipo}</span>
            <span>{noHover.conexoesCount} conexão{noHover.conexoesCount === 1 ? "" : "ões"}</span>
          </div>
        </div>
      )}

      {/* Controles de Câmera e Status no Rodapé */}
      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2 pointer-events-none">
        <div className="flex items-center gap-2 bg-card/85 backdrop-blur-md px-3 py-1 rounded-full border border-border/60 text-[11px] font-medium text-muted-foreground pointer-events-auto">
          <span>{grafoRef.current.nos.length} nós</span>
          <span>•</span>
          <span>{grafoRef.current.arestas.length} conexões</span>
        </div>

        <div className="flex items-center gap-1 bg-card/90 backdrop-blur-md p-1 rounded-xl border border-border/80 shadow-md pointer-events-auto">
          <button
            onClick={() => setSimulando(!simulando)}
            className={cn(
              "p-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1",
              simulando ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-semibold" : "text-muted-foreground hover:bg-accent"
            )}
            title={simulando ? "Pausar física" : "Ativar física"}
          >
            {simulando ? <Pause size={14} /> : <Play size={14} />}
          </button>

          <button
            onClick={() => {
              cameraRef.current.zoom = Math.min(cameraRef.current.zoom * 1.25, 3.5);
            }}
            className="p-1.5 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            title="Aumentar Zoom"
          >
            <ZoomIn size={14} />
          </button>

          <button
            onClick={() => {
              cameraRef.current.zoom = Math.max(cameraRef.current.zoom * 0.8, 0.4);
            }}
            className="p-1.5 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            title="Diminuir Zoom"
          >
            <ZoomOut size={14} />
          </button>

          <button
            onClick={reajustarCentralizacao}
            className="p-1.5 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            title="Centralizar Câmera"
          >
            <Crosshair size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
