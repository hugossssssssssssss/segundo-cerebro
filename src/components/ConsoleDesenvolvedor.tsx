import React, { useState, useEffect, useRef } from "react";
import { 
  obterLogs, 
  inscreverLogs, 
  limparLogs, 
  type EntradaLog, 
  type TipoLog 
} from "@/lib/logger";
import { 
  Terminal, 
  Trash2, 
  Copy, 
  X, 
  ChevronRight, 
  ChevronDown, 
  Check,
  AlertTriangle,
  Info
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip } from "@/components/ui/tooltip";
import { lerConfig, salvarConfig } from "@/lib/settings";

export function ConsoleDesenvolvedor() {
  const [ativo, setAtivo] = useState(false);
  const [logs, setLogs] = useState<EntradaLog[]>([]);
  const [filtro, setFiltro] = useState<"todos" | TipoLog | "gerais">("todos");
  const [logExpandido, setLogExpandido] = useState<Record<string, boolean>>({});
  const [copiadoTudo, setCopiadoTudo] = useState(false);
  const [copiadoLogId, setCopiadoLogId] = useState<string | null>(null);
  
  // Posicionamento e tamanho do Console Flutuante (Persistido no localStorage)
  const [posicao, setPosicao] = useState(() => {
    const salvo = localStorage.getItem("klaus_console_pos");
    if (salvo) {
      try {
        const p = JSON.parse(salvo);
        if (typeof p.x === "number" && typeof p.y === "number") {
          return {
            x: Math.max(0, Math.min(window.innerWidth - 100, p.x)),
            y: Math.max(0, Math.min(window.innerHeight - 50, p.y)),
          };
        }
      } catch {}
    }
    return {
      x: Math.max(16, window.innerWidth - 620),
      y: Math.max(16, window.innerHeight - 440),
    };
  });

  const [tamanho, setTamanho] = useState(() => {
    const salvo = localStorage.getItem("klaus_console_tam");
    if (salvo) {
      try {
        const t = JSON.parse(salvo);
        if (typeof t.largura === "number" && typeof t.altura === "number") return t;
      } catch {}
    }
    return {
      largura: Math.min(600, window.innerWidth - 32),
      altura: Math.min(400, window.innerHeight - 80),
    };
  });

  const painelRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const salvarPosTam = (x: number, y: number, largura: number, altura: number) => {
    setPosicao({ x, y });
    setTamanho({ largura, altura });
    localStorage.setItem("klaus_console_pos", JSON.stringify({ x, y }));
    localStorage.setItem("klaus_console_tam", JSON.stringify({ largura, altura }));
  };

  // Mover console (arrastar pelo cabeçalho)
  const [arrastando, setArrastando] = useState(false);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const posTempRef = useRef({ x: posicao.x, y: posicao.y });

  const iniciarArrastoCabecalho = (e: React.MouseEvent | React.TouchEvent) => {
    if ((e.target as HTMLElement).closest("button, input, select, textarea")) return;

    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

    const elem = painelRef.current;
    const currentLeft = elem ? elem.offsetLeft : posicao.x;
    const currentTop = elem ? elem.offsetTop : posicao.y;

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

      const elem = painelRef.current;
      const elemWidth = elem ? elem.offsetWidth : tamanho.largura;

      const maxLeft = Math.max(0, window.innerWidth - elemWidth);
      const maxTop = Math.max(0, window.innerHeight - 50);

      const novoX = Math.max(0, Math.min(maxLeft, clientX - dragOffsetRef.current.x));
      const novoY = Math.max(0, Math.min(maxTop, clientY - dragOffsetRef.current.y));

      posTempRef.current = { x: novoX, y: novoY };

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
        tamanho.largura,
        tamanho.altura
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
  }, [arrastando, tamanho.largura, tamanho.altura]);

  // Redimensionamento em 8 direções
  const [redimensionando, setRedimensionando] = useState<string | null>(null);
  const resizeStartRef = useRef({
    mouseX: 0,
    mouseY: 0,
    posX: 0,
    posY: 0,
    largura: 0,
    altura: 0,
  });
  const tamTempRef = useRef({ largura: tamanho.largura, altura: tamanho.altura });

  const iniciarRedimensionamento = (
    direcao: string,
    e: React.MouseEvent | React.TouchEvent
  ) => {
    e.stopPropagation();
    e.preventDefault();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

    const elem = painelRef.current;
    const posX = elem ? elem.offsetLeft : posicao.x;
    const posY = elem ? elem.offsetTop : posicao.y;
    const larg = elem ? elem.offsetWidth : tamanho.largura;
    const alt = elem ? elem.offsetHeight : tamanho.altura;

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

      const MIN_W = 320;
      const MIN_H = 200;

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

  // Monitorar se a opção Desenvolvedor está ativa em Ajustes
  const checarConfig = () => {
    try {
      const cfg = lerConfig();
      setAtivo(!!cfg.modoDesenvolvedor);
    } catch {
      setAtivo(false);
    }
  };

  useEffect(() => {
    checarConfig();
    window.addEventListener("klaus-config-mudou", checarConfig);
    return () => {
      window.removeEventListener("klaus-config-mudou", checarConfig);
    };
  }, []);

  // Monitorar a pilha de logs
  useEffect(() => {
    if (!ativo) return;

    setLogs(obterLogs());
    const desinscrever = inscreverLogs(() => {
      setLogs(obterLogs());
    });

    return () => {
      desinscrever();
    };
  }, [ativo]);

  // Rolar para o final ao receber novos logs
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, filtro]);

  if (!ativo) return null;

  // Filtrar logs
  const logsFiltrados = logs.filter((l) => {
    if (filtro === "todos") return true;
    if (filtro === "gerais") return l.tipo === "info" || l.tipo === "warn";
    return l.tipo === filtro;
  });

  const alternarExpandir = (id: string) => {
    setLogExpandido((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Copiar todos os logs exibidos
  const copiarTudo = () => {
    const texto = logsFiltrados
      .map((l) => {
        let txt = `[${l.timestamp}] [${l.tipo.toUpperCase()}] ${l.mensagem}`;
        if (l.detalhes) {
          txt += `\nDetalhes:\n${l.detalhes}`;
        }
        return txt;
      })
      .join("\n\n");
    
    navigator.clipboard.writeText(texto);
    setCopiadoTudo(true);
    setTimeout(() => setCopiadoTudo(false), 2000);
  };

  // Copiar log individual
  const copiarLog = (e: React.MouseEvent, l: EntradaLog) => {
    e.stopPropagation();
    let txt = `[${l.timestamp}] [${l.tipo.toUpperCase()}] ${l.mensagem}`;
    if (l.detalhes) {
      txt += `\nDetalhes:\n${l.detalhes}`;
    }
    navigator.clipboard.writeText(txt);
    setCopiadoLogId(l.id);
    setTimeout(() => setCopiadoLogId(null), 2000);
  };

  return (
    <div
      ref={painelRef}
      style={{
        position: "fixed",
        left: `${posicao.x}px`,
        top: `${posicao.y}px`,
        width: `${tamanho.largura}px`,
        height: `${tamanho.altura}px`,
        zIndex: 9999,
      }}
      className="fixed flex flex-col rounded-2xl border border-slate-800 bg-slate-950/95 dark:bg-slate-950/98 backdrop-blur-md text-slate-300 font-mono shadow-[0_20px_50px_rgba(0,0,0,0.5)] dark:shadow-[0_20px_60px_rgba(0,0,0,0.8)] overflow-hidden animate-in zoom-in-95 duration-150 select-text"
    >
      {/* Barra de Ferramentas / Cabeçalho do Console Arrastável */}
      <div 
        onMouseDown={iniciarArrastoCabecalho}
        onTouchStart={iniciarArrastoCabecalho}
        className="flex shrink-0 items-center justify-between border-b border-slate-900 bg-slate-900/50 px-4 py-2 text-xs cursor-grab active:cursor-grabbing select-none"
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 font-bold text-amber-500">
            <Terminal size={14} />
            <span>KLAUS CONSOLE</span>
          </div>

          <span className="text-[10px] text-slate-500">|</span>

          {/* Filtros */}
          <div className="flex items-center gap-1">
            {(["todos", "request", "error", "gerais"] as const).map((opt) => (
              <button
                key={opt}
                onClick={() => setFiltro(opt)}
                className={cn(
                  "px-2 py-0.5 rounded transition-colors text-[10px] font-semibold uppercase tracking-wider cursor-pointer",
                  filtro === opt
                    ? "bg-slate-800 text-white font-bold"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
                )}
              >
                {opt === "request" ? "requisições" : opt}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Ações */}
          <Tooltip conteudo="Copiar logs exibidos">
            <button
              onClick={copiarTudo}
              disabled={logsFiltrados.length === 0}
              className="flex items-center gap-1 rounded bg-slate-900 border border-slate-800 px-2.5 py-1 text-[11px] text-slate-300 hover:bg-slate-850 hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              aria-label="Copiar logs exibidos"
            >
              {copiadoTudo ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
              <span>{copiadoTudo ? "Copiado!" : "Copiar Tudo"}</span>
            </button>
          </Tooltip>

          <Tooltip conteudo="Limpar console">
            <button
              onClick={limparLogs}
              disabled={logs.length === 0}
              className="flex items-center gap-1 rounded bg-slate-900 border border-slate-800 px-2.5 py-1 text-[11px] text-slate-300 hover:bg-slate-850 hover:text-white hover:border-red-500/30 hover:text-red-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              aria-label="Limpar console"
            >
              <Trash2 size={12} />
              <span>Limpar</span>
            </button>
          </Tooltip>

          <span className="text-slate-700">|</span>

          {/* Minimizar/Fechar temporariamente */}
          <Tooltip conteudo="Fechar console (Desativar em Ajustes)">
            <button
              onClick={() => {
                // Desativa o console alterando a config
                try {
                  const cfg = lerConfig();
                  const novaCfg = { ...cfg, modoDesenvolvedor: false };
                  salvarConfig(novaCfg);
                } catch {
                  // fallback manual
                  localStorage.setItem("segundo-cerebro:config:enc", "");
                }
                window.dispatchEvent(new CustomEvent("klaus-config-mudou"));
              }}
              className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
              aria-label="Fechar console"
            >
              <X size={14} />
            </button>
          </Tooltip>
        </div>
      </div>

      {/* Corpo de logs */}
      <div 
        ref={scrollRef}
        className="flex-1 min-h-0 overflow-y-auto px-4 py-2 space-y-1.5 scrollbar-thin text-xs leading-relaxed"
      >
        {logsFiltrados.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-605 gap-1.5 py-8 select-none">
            <Terminal size={18} className="opacity-40" />
            <span className="text-[11px]">Nenhum evento registrado nesta sessão</span>
          </div>
        ) : (
          logsFiltrados.map((log) => {
            const ehReq = log.tipo === "request";
            const ehErro = log.tipo === "error";
            const ehWarn = log.tipo === "warn";
            const temDet = !!log.detalhes;
            const exp = !!logExpandido[log.id];

            return (
              <div 
                key={log.id} 
                className={cn(
                  "border rounded border-transparent px-2 py-1 transition-colors select-text hover:bg-slate-900/40",
                  ehErro && "bg-red-950/10 hover:bg-red-950/20",
                  ehWarn && "bg-amber-950/10 hover:bg-amber-950/20",
                  exp && "border-slate-800/80 bg-slate-900/20"
                )}
              >
                {/* Linha principal */}
                <div 
                  className={cn(
                    "flex items-start gap-2",
                    temDet ? "cursor-pointer" : "cursor-default"
                  )}
                  onClick={() => temDet && alternarExpandir(log.id)}
                >
                  {/* Marcador de detalhes expandidos */}
                  {temDet ? (
                    <span className="mt-0.5 text-slate-600 hover:text-slate-400 transition-colors shrink-0">
                      {exp ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </span>
                  ) : (
                    <span className="w-3.5 shrink-0" />
                  )}

                  {/* Timestamp */}
                  <span className="text-slate-500 font-mono text-[11px] shrink-0 select-none">
                    [{log.timestamp}]
                  </span>

                  {/* Ícone ou tipo */}
                  <span className="shrink-0 select-none">
                    {ehReq && (
                      <span className={cn(
                        "text-[10px] font-bold px-1 py-0.5 rounded leading-none uppercase",
                        log.mensagem.startsWith("→") 
                          ? "bg-sky-500/10 text-sky-400 border border-sky-500/20" 
                          : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                      )}>
                        {log.mensagem.startsWith("→") ? "req" : "res"}
                      </span>
                    )}
                    {ehErro && (
                      <span className="bg-red-500/10 text-red-400 border border-red-500/20 text-[10px] font-bold px-1 py-0.5 rounded leading-none uppercase flex items-center gap-0.5">
                        <AlertTriangle size={10} />
                        erro
                      </span>
                    )}
                    {ehWarn && (
                      <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-bold px-1 py-0.5 rounded leading-none uppercase flex items-center gap-0.5">
                        <Info size={10} />
                        aviso
                      </span>
                    )}
                    {log.tipo === "info" && (
                      <span className="bg-slate-800 text-slate-300 text-[10px] font-bold px-1 py-0.5 rounded leading-none uppercase">
                        info
                      </span>
                    )}
                  </span>

                  {/* Mensagem do Log */}
                  <span className={cn(
                    "flex-1 break-all font-mono",
                    ehErro && "text-red-400/90 font-medium",
                    ehWarn && "text-amber-400/90",
                    ehReq && "text-slate-200"
                  )}>
                    {log.mensagem}
                  </span>

                  {/* Copiar individual */}
                  <Tooltip conteudo="Copiar esta entrada">
                    <button
                      onClick={(e) => copiarLog(e, log)}
                      className="opacity-0 group-hover:opacity-100 hover:bg-slate-800 p-1 rounded text-slate-500 hover:text-slate-200 transition-all select-none shrink-0 cursor-pointer"
                      style={{ contentVisibility: "auto" }} // Otimizacao de performance
                      aria-label="Copiar esta entrada"
                    >
                      {copiadoLogId === log.id ? (
                        <Check size={12} className="text-emerald-500 animate-in fade-in" />
                      ) : (
                        <Copy size={12} className="hover:scale-105" />
                      )}
                    </button>
                  </Tooltip>
                </div>

                {/* Detalhes expandidos */}
                {temDet && exp && (
                  <div className="mt-2 ml-6 pl-4 border-l-2 border-slate-800/60 text-slate-400 space-y-1.5 select-text">
                    <pre className="whitespace-pre-wrap break-all bg-slate-950/40 p-2 rounded border border-slate-900/60 font-mono text-[11px] max-h-96 overflow-y-auto">
                      {log.detalhes}
                    </pre>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Handles de Redimensionamento em 8 direções */}
      <div
        onMouseDown={(e) => iniciarRedimensionamento("e", e)}
        onTouchStart={(e) => iniciarRedimensionamento("e", e)}
        className="absolute right-0 top-0 bottom-0 w-1.5 cursor-e-resize hover:bg-amber-500/10 transition-colors z-10"
      />
      <div
        onMouseDown={(e) => iniciarRedimensionamento("s", e)}
        onTouchStart={(e) => iniciarRedimensionamento("s", e)}
        className="absolute left-0 right-0 bottom-0 h-1.5 cursor-s-resize hover:bg-amber-500/10 transition-colors z-10"
      />
      <div
        onMouseDown={(e) => iniciarRedimensionamento("w", e)}
        onTouchStart={(e) => iniciarRedimensionamento("w", e)}
        className="absolute left-0 top-0 bottom-0 w-1.5 cursor-w-resize hover:bg-amber-500/10 transition-colors z-10"
      />
      <div
        onMouseDown={(e) => iniciarRedimensionamento("n", e)}
        onTouchStart={(e) => iniciarRedimensionamento("n", e)}
        className="absolute left-0 right-0 top-0 h-1.5 cursor-n-resize hover:bg-amber-500/10 transition-colors z-10"
      />

      {/* Canto SE (Inferior Direito com alça visual) */}
      <Tooltip conteudo="Arrastar para redimensionar">
        <div
          onMouseDown={(e) => iniciarRedimensionamento("se", e)}
          onTouchStart={(e) => iniciarRedimensionamento("se", e)}
          className="absolute right-0 bottom-0 w-4 h-4 cursor-se-resize flex items-center justify-center text-slate-500 hover:text-amber-500 hover:scale-125 transition-all z-20"
          role="separator"
          aria-label="Redimensionar console"
        >
          <svg width="8" height="8" viewBox="0 0 10 10" fill="currentColor">
            <path d="M6 0L10 4L4 10L0 6L6 0Z" opacity="0.4" />
            <path d="M8 4L10 6L6 10L4 8L8 4Z" opacity="0.8" />
          </svg>
        </div>
      </Tooltip>

      <div
        onMouseDown={(e) => iniciarRedimensionamento("sw", e)}
        onTouchStart={(e) => iniciarRedimensionamento("sw", e)}
        className="absolute left-0 bottom-0 w-3 h-3 cursor-sw-resize z-20"
      />
      <div
        onMouseDown={(e) => iniciarRedimensionamento("ne", e)}
        onTouchStart={(e) => iniciarRedimensionamento("ne", e)}
        className="absolute right-0 top-0 w-3 h-3 cursor-ne-resize z-20"
      />
      <div
        onMouseDown={(e) => iniciarRedimensionamento("nw", e)}
        onTouchStart={(e) => iniciarRedimensionamento("nw", e)}
        className="absolute left-0 top-0 w-3 h-3 cursor-nw-resize z-20"
      />
    </div>
  );
}
