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
import { lerConfig, salvarConfig } from "@/lib/settings";

export function ConsoleDesenvolvedor() {
  const [ativo, setAtivo] = useState(false);
  const [logs, setLogs] = useState<EntradaLog[]>([]);
  const [filtro, setFiltro] = useState<"todos" | TipoLog | "gerais">("todos");
  const [logExpandido, setLogExpandido] = useState<Record<string, boolean>>({});
  const [copiadoTudo, setCopiadoTudo] = useState(false);
  const [copiadoLogId, setCopiadoLogId] = useState<string | null>(null);
  
  const [altura, setAltura] = useState(() => {
    const salvo = localStorage.getItem("klaus_console_altura");
    return salvo ? parseInt(salvo, 10) : 260;
  });

  const scrollRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const startYRef = useRef(0);
  const startAlturaRef = useRef(0);

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

  // Drag para redimensionamento
  const iniciarRedimensionamento = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    e.preventDefault();
    draggingRef.current = true;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    startYRef.current = clientY;
    startAlturaRef.current = altura;
    document.body.style.cursor = "ns-resize";
    document.body.style.userSelect = "none";
  };

  useEffect(() => {
    const aoMover = (e: MouseEvent | TouchEvent) => {
      if (!draggingRef.current) return;
      const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
      const dy = clientY - startYRef.current;
      const novaAltura = Math.max(140, Math.min(window.innerHeight - 80, startAlturaRef.current - dy));
      setAltura(novaAltura);
      localStorage.setItem("klaus_console_altura", String(novaAltura));
    };

    const aoSoltar = () => {
      if (draggingRef.current) {
        draggingRef.current = false;
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      }
    };

    window.addEventListener("mousemove", aoMover);
    window.addEventListener("mouseup", aoSoltar);
    window.addEventListener("touchmove", aoMover, { passive: true });
    window.addEventListener("touchend", aoSoltar);

    return () => {
      window.removeEventListener("mousemove", aoMover);
      window.removeEventListener("mouseup", aoSoltar);
      window.removeEventListener("touchmove", aoMover);
      window.removeEventListener("touchend", aoSoltar);
    };
  }, [altura]);

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
      style={{ height: `${altura}px` }}
      className="fixed bottom-0 left-0 right-0 z-50 flex flex-col border-t border-slate-800 bg-slate-950/95 dark:bg-slate-950/98 backdrop-blur-md text-slate-300 font-mono shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-200 select-text"
    >
      {/* Alça superior para arrasto */}
      <div
        onMouseDown={iniciarRedimensionamento}
        onTouchStart={iniciarRedimensionamento}
        className="h-1.5 w-full bg-slate-800 hover:bg-amber-500 cursor-ns-resize transition-colors shrink-0"
        title="Arrastar para ajustar altura"
      />

      {/* Barra de Ferramentas / Cabeçalho do Console */}
      <div className="flex shrink-0 items-center justify-between border-b border-slate-900 bg-slate-900/50 px-4 py-2 text-xs">
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
                  "px-2 py-0.5 rounded transition-colors text-[10px] font-semibold uppercase tracking-wider",
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
          <button
            onClick={copiarTudo}
            disabled={logsFiltrados.length === 0}
            className="flex items-center gap-1 rounded bg-slate-900 border border-slate-800 px-2.5 py-1 text-[11px] text-slate-300 hover:bg-slate-850 hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            title="Copiar logs exibidos"
          >
            {copiadoTudo ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
            <span>{copiadoTudo ? "Copiado!" : "Copiar Tudo"}</span>
          </button>

          <button
            onClick={limparLogs}
            disabled={logs.length === 0}
            className="flex items-center gap-1 rounded bg-slate-900 border border-slate-800 px-2.5 py-1 text-[11px] text-slate-300 hover:bg-slate-850 hover:text-white hover:border-red-500/30 hover:text-red-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            title="Limpar console"
          >
            <Trash2 size={12} />
            <span>Limpar</span>
          </button>

          <span className="text-slate-700">|</span>

          {/* Minimizar/Fechar temporariamente */}
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
            className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
            title="Fechar console (Desativar em Ajustes)"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Corpo de logs */}
      <div 
        ref={scrollRef}
        className="flex-1 min-h-0 overflow-y-auto px-4 py-2 space-y-1.5 scrollbar-thin text-xs leading-relaxed"
      >
        {logsFiltrados.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-650 gap-1.5 py-8 select-none">
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
                  <button
                    onClick={(e) => copiarLog(e, log)}
                    className="opacity-0 group-hover:opacity-100 hover:bg-slate-800 p-1 rounded text-slate-500 hover:text-slate-200 transition-all select-none shrink-0"
                    style={{ contentVisibility: "auto" }} // Otimizacao de performance
                    title="Copiar esta entrada"
                  >
                    {copiadoLogId === log.id ? (
                      <Check size={12} className="text-emerald-500 animate-in fade-in" />
                    ) : (
                      <Copy size={12} className="hover:scale-105" />
                    )}
                  </button>
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
    </div>
  );
}
