import { useEffect, useRef, useState, useCallback } from "react";
import {
  Maximize2,
  RotateCcw,
  Play,
  Pause,
  Search,
} from "lucide-react";
import {
  construirGrafo3D,
  simularPassoFisica3D,
  type DadosGrafo3D,
  type NoGrafo3D,
  type TipoNoGrafo,
} from "@/lib/grafo";
import type { ItemRepo } from "@/lib/repo";
import { cn } from "@/lib/utils";

interface NavegadorGrafo3DProps {
  acervo: ItemRepo[];
  aoSelecionarItem: (caminho: string) => void;
  className?: string;
}

export function NavegadorGrafo3D({
  acervo,
  aoSelecionarItem,
  className,
}: NavegadorGrafo3DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Filtros e opções
  const [pesquisa, setPesquisa] = useState("");
  const [filtroTipo, setFiltroTipo] = useState<TipoNoGrafo | "todos">("todos");
  const [mostrarTags] = useState(true);
  const [autoRotacionar, setAutoRotacionar] = useState(true);
  const [simulando, setSimulando] = useState(true);

  // Nó sob o cursor e nó selecionado
  const [noHover, setNoHover] = useState<NoGrafo3D | null>(null);

  // Câmera 3D (ângulos de rotação Pitch/Yaw e distância de Zoom)
  const cameraRef = useRef({
    rotX: 0.3,
    rotY: 0.5,
    zoom: 1.0,
    alvoX: 0,
    alvoY: 0,
  });

  // Estado da física do grafo
  const grafoRef = useRef<DadosGrafo3D>({ nos: [], arestas: [] });

  // Inicializa o grafo 3D a partir do acervo de itens
  useEffect(() => {
    if (acervo.length === 0) return;
    grafoRef.current = construirGrafo3D(acervo, { incluirTags: mostrarTags });
  }, [acervo, mostrarTags]);

  // Projeção 3D para 2D (Perspective Projection Matrix)
  const projetar3D = useCallback((x: number, y: number, z: number, largura: number, altura: number) => {
    const { rotX, rotY, zoom } = cameraRef.current;

    // Rotação Y (Yaw)
    const cosY = Math.cos(rotY);
    const sinY = Math.sin(rotY);
    const x1 = x * cosY - z * sinY;
    const z1 = x * sinY + z * cosY;

    // Rotação X (Pitch)
    const cosX = Math.cos(rotX);
    const sinX = Math.sin(rotX);
    const y2 = y * cosX - z1 * sinX;
    const z2 = y * sinX + z1 * cosX;

    const fov = 600;
    const distancia = z2 + 800;
    const escala = (fov / Math.max(distancia, 100)) * zoom;

    const px = largura / 2 + x1 * escala;
    const py = altura / 2 + y2 * escala;

    return { px, py, zIndex: z2, escala };
  }, []);

  // Loop de Animação e Renderização 60 FPS
  useEffect(() => {
    let animId: number;

    const render = (tempoAtual: number) => {
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

      // 1. Executa um passo da simulação de física 3D se ativo
      if (simulando && grafoRef.current.nos.length > 0) {
        simularPassoFisica3D(grafoRef.current, 0.88);
      }

      // 2. Rotação automática suave da câmera
      if (autoRotacionar) {
        cameraRef.current.rotY += 0.002;
      }

      // Limpa a tela com fundo escuro tecnológico
      ctx.fillStyle = "#090d16";
      ctx.fillRect(0, 0, largura, altura);

      // Desenha grade de fundo suave no espaço 3D
      ctx.strokeStyle = "rgba(30, 41, 59, 0.25)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = -500; i <= 500; i += 100) {
        const p1 = projetar3D(i, 200, -500, largura, altura);
        const p2 = projetar3D(i, 200, 500, largura, altura);
        ctx.moveTo(p1.px, p1.py);
        ctx.lineTo(p2.px, p2.py);
      }
      ctx.stroke();

      const { nos, arestas } = grafoRef.current;

      // 3. Projeta todos os nós para 2D e ordena por profundidade zIndex
      const nosProjetados = nos
        .filter((n) => {
          if (filtroTipo !== "todos" && n.tipo !== filtroTipo) return false;
          return true;
        })
        .map((n) => {
          const proj = projetar3D(n.x, n.y, n.z, largura, altura);
          const coincidePesquisa = pesquisa
            ? n.titulo.toLowerCase().includes(pesquisa.toLowerCase())
            : true;
          return { no: n, ...proj, coincidePesquisa };
        })
        .sort((a, b) => b.zIndex - a.zIndex);

      const mapaProjetados = new Map(nosProjetados.map((p) => [p.no.id, p]));

      // 4. Renderiza Arestas de Conexão com Pulsos de Partículas
      const tempoSegundos = tempoAtual / 1000;

      for (const a of arestas) {
        const orig = mapaProjetados.get(a.origem);
        const dest = mapaProjetados.get(a.destino);
        if (!orig || !dest) continue;

        const ehHoverRelacionado =
          noHover && (noHover.id === orig.no.id || noHover.id === dest.no.id);

        ctx.strokeStyle = ehHoverRelacionado
          ? "rgba(245, 158, 11, 0.8)"
          : orig.coincidePesquisa && dest.coincidePesquisa
          ? "rgba(59, 130, 246, 0.25)"
          : "rgba(30, 41, 59, 0.1)";

        ctx.lineWidth = ehHoverRelacionado ? 2.5 : 1;
        ctx.beginPath();
        ctx.moveTo(orig.px, orig.py);
        ctx.lineTo(dest.px, dest.py);
        ctx.stroke();

        // Desenha pulso luminoso viajando ao longo da conexão
        if (ehHoverRelacionado || Math.random() < 0.3) {
          const t = (tempoSegundos * 0.8 + (orig.no.x % 10)) % 1;
          const pxPulso = orig.px + (dest.px - orig.px) * t;
          const pyPulso = orig.py + (dest.py - orig.py) * t;

          ctx.fillStyle = ehHoverRelacionado ? "#f59e0b" : "#60a5fa";
          ctx.beginPath();
          ctx.arc(pxPulso, pyPulso, ehHoverRelacionado ? 3 : 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // 5. Renderiza Nós como Esferas 3D Brilhantes
      for (const p of nosProjetados) {
        const { no, px, py, escala, coincidePesquisa } = p;
        const ehHover = noHover && noHover.id === no.id;
        const raioProj = Math.max(3, no.raio * escala);

        ctx.save();
        ctx.globalAlpha = coincidePesquisa ? 1.0 : 0.2;

        // Halo de Brilho Neon Externo
        if (ehHover || coincidePesquisa) {
          const gradGlow = ctx.createRadialGradient(px, py, raioProj * 0.2, px, py, raioProj * 2.5);
          gradGlow.addColorStop(0, no.cor);
          gradGlow.addColorStop(1, "rgba(0,0,0,0)");
          ctx.fillStyle = gradGlow;
          ctx.beginPath();
          ctx.arc(px, py, raioProj * 2.5, 0, Math.PI * 2);
          ctx.fill();
        }

        // Esfera 3D com Gradiente Radial Interno
        const gradNo = ctx.createRadialGradient(
          px - raioProj * 0.3,
          py - raioProj * 0.3,
          raioProj * 0.1,
          px,
          py,
          raioProj
        );
        gradNo.addColorStop(0, "#ffffff");
        gradNo.addColorStop(0.4, no.cor);
        gradNo.addColorStop(1, "#000000");

        ctx.fillStyle = gradNo;
        ctx.beginPath();
        ctx.arc(px, py, raioProj, 0, Math.PI * 2);
        ctx.fill();

        // Rótulo Flutuante do Título
        if (ehHover || escala > 0.8 || (pesquisa && coincidePesquisa)) {
          ctx.font = `${ehHover ? "bold 13px" : "11px"} sans-serif`;
          ctx.fillStyle = ehHover ? "#ffffff" : "rgba(226, 232, 240, 0.85)";
          ctx.textAlign = "center";
          ctx.fillText(no.titulo, px, py + raioProj + 14);
        }

        ctx.restore();
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [projetar3D, filtroTipo, pesquisa, autoRotacionar, simulando, noHover]);

  // Controles de Arraste da Câmera no Canvas (Orbit Controls 3D)
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

      cameraRef.current.rotY += dx * 0.005;
      cameraRef.current.rotX += dy * 0.005;
      posAnteriorRef.current = { x: clientX, y: clientY };
      return;
    }

    // Detecção de Hover sobre um nó 3D
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = clientX - rect.left;
    const my = clientY - rect.top;

    const { nos } = grafoRef.current;
    let achado: NoGrafo3D | null = null;

    for (const no of nos) {
      const proj = projetar3D(no.x, no.y, no.z, canvas.width, canvas.height);
      const dist = Math.hypot(mx - proj.px, my - proj.py);
      if (dist < Math.max(no.raio * proj.escala, 12)) {
        achado = no;
        break;
      }
    }

    setNoHover(achado);
  };

  const aoFinalizarArraste = () => {
    estaArrastandoRef.current = false;
  };

  // Zoom da Câmera com o Wheel do Mouse
  const aoRolarWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const del = e.deltaY * -0.0015;
    cameraRef.current.zoom = Math.min(Math.max(0.3, cameraRef.current.zoom + del), 3.0);
  };

  // Clique no Nó 3D para abrir o documento no Notion Modal
  const aoClicarCanvas = () => {
    if (noHover && !noHover.caminho.startsWith("tag_")) {
      aoSelecionarItem(noHover.caminho);
    }
  };

  return (
    <div className={cn("relative w-full h-[calc(100vh-80px)] rounded-2xl overflow-hidden border border-border bg-slate-950 shadow-2xl", className)}>
      {/* Canvas Principal 3D */}
      <canvas
        ref={canvasRef}
        onMouseDown={aoIniciarArraste}
        onMouseMove={aoMoverArraste}
        onMouseUp={aoFinalizarArraste}
        onTouchStart={aoIniciarArraste}
        onTouchMove={aoMoverArraste}
        onTouchEnd={aoFinalizarArraste}
        onWheel={aoRolarWheel}
        onClick={aoClicarCanvas}
        className="w-full h-full cursor-grab active:cursor-grabbing block"
      />

      {/* Painel de Controle Flutuante Superior (Busca e Filtros) */}
      <div className="absolute top-4 left-4 right-4 flex flex-wrap items-center justify-between gap-3 pointer-events-none">
        <div className="flex items-center gap-2 bg-card/85 backdrop-blur-md p-1.5 rounded-xl border border-border/80 shadow-lg pointer-events-auto max-w-sm w-full">
          <Search size={16} className="text-muted-foreground ml-2 shrink-0" />
          <input
            type="text"
            value={pesquisa}
            onChange={(e) => setPesquisa(e.target.value)}
            placeholder="Buscar no Grafo Neural 3D..."
            className="w-full bg-transparent border-0 outline-none text-xs text-foreground placeholder:text-muted-foreground focus:ring-0"
          />
        </div>

        {/* Filtros por Categoria de Entidade */}
        <div className="flex items-center gap-1 bg-card/85 backdrop-blur-md p-1.5 rounded-xl border border-border/80 shadow-lg pointer-events-auto overflow-x-auto">
          {(["todos", "nota", "tarefa", "meta", "referencia", "lousa"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setFiltroTipo(t)}
              className={cn(
                "px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all flex items-center gap-1 capitalize shrink-0",
                filtroTipo === t
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              {t === "todos" ? "Tudo" : t}
            </button>
          ))}
        </div>
      </div>

      {/* Barra de Ferramentas Flutuante Inferior (Controles de Câmera e Física) */}
      <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between gap-2 pointer-events-none">
        <div className="flex items-center gap-2 bg-card/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-border/60 text-xs font-medium text-muted-foreground pointer-events-auto">
          <span>{grafoRef.current.nos.length} Nós</span>
          <span>•</span>
          <span>{grafoRef.current.arestas.length} Conexões</span>
        </div>

        <div className="flex items-center gap-1.5 bg-card/85 backdrop-blur-md p-1.5 rounded-xl border border-border/80 shadow-lg pointer-events-auto">
          <button
            onClick={() => setAutoRotacionar(!autoRotacionar)}
            className={cn(
              "p-2 rounded-lg text-xs font-medium transition-colors flex items-center gap-1",
              autoRotacionar ? "bg-amber-500/20 text-amber-500 font-semibold" : "text-muted-foreground hover:bg-accent"
            )}
            title="Alternar rotação automática da câmera"
          >
            <RotateCcw size={15} />
            <span className="hidden sm:inline">Auto-Giro</span>
          </button>

          <button
            onClick={() => setSimulando(!simulando)}
            className={cn(
              "p-2 rounded-lg text-xs font-medium transition-colors flex items-center gap-1",
              simulando ? "bg-emerald-500/20 text-emerald-500 font-semibold" : "text-muted-foreground hover:bg-accent"
            )}
            title="Pausar/Retomar simulação de física 3D"
          >
            {simulando ? <Pause size={15} /> : <Play size={15} />}
            <span className="hidden sm:inline">{simulando ? "Física Ativa" : "Pausada"}</span>
          </button>

          <button
            onClick={() => {
              cameraRef.current = { rotX: 0.3, rotY: 0.5, zoom: 1.0, alvoX: 0, alvoY: 0 };
            }}
            className="p-2 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            title="Resetar câmera 3D"
          >
            <Maximize2 size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
