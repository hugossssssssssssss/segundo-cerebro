import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowUp,
  Wifi,
  WifiOff,
  Sparkles,
  GitBranch,
  FileText,
  CheckSquare,
  Image as ImageIcon,
  Target,
  Network,
  Headphones,
  Settings as SettingsIcon,
  Inbox,
  Command,
  ShieldCheck,
  Heart,
  ExternalLink,
} from "lucide-react";
import { LogoKlaus } from "./LogoKlaus";
import { versao } from "@/lib/versao";
import { lerConfig, type Settings } from "@/lib/settings";
import { obterRascunhosLocais } from "@/lib/offlineQueue";
import { cn } from "@/lib/utils";

const FRASES_INSPIRADORAS = [
  "A simplicidade é o último grau da sofisticação.",
  "O design não é apenas o que parece. Design é como funciona.",
  "Menos, porém melhor.",
  "A clareza precede o domínio.",
  "Organizar o pensamento é abrir espaço para a criatividade.",
  "Seu cérebro foi feito para ter ideias, não para guardá-las.",
];

export function Rodape() {
  const [cfg, setCfg] = useState<Settings>(lerConfig);
  const [online, setOnline] = useState(() => (typeof navigator !== "undefined" ? navigator.onLine : true));
  const [qtdRascunhos, setQtdRascunhos] = useState(0);
  const [frase] = useState(() => {
    const indice = Math.floor(Math.random() * FRASES_INSPIRADORAS.length);
    return FRASES_INSPIRADORAS[indice];
  });

  useEffect(() => {
    const atualizarStatusRede = () => {
      setOnline(navigator.onLine);
    };

    const atualizarRascunhos = () => {
      try {
        const rascunhos = obterRascunhosLocais();
        setQtdRascunhos(rascunhos.length);
      } catch {
        setQtdRascunhos(0);
      }
    };

    const recarregarConfig = () => {
      setCfg(lerConfig());
    };

    window.addEventListener("online", atualizarStatusRede);
    window.addEventListener("offline", atualizarStatusRede);
    window.addEventListener("acervo-atualizado", atualizarRascunhos);
    window.addEventListener("storage", recarregarConfig);

    atualizarRascunhos();

    return () => {
      window.removeEventListener("online", atualizarStatusRede);
      window.removeEventListener("offline", atualizarStatusRede);
      window.removeEventListener("acervo-atualizado", atualizarRascunhos);
      window.removeEventListener("storage", recarregarConfig);
    };
  }, []);

  const rolarParaTopo = () => {
    // Procura o elemento scrollável principal (<main>) ou a janela
    const mainEl = document.querySelector("main");
    if (mainEl) {
      mainEl.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const temRepo = Boolean(cfg.repoOwner && cfg.repoName);
  const repoUrl = temRepo ? `https://github.com/${cfg.repoOwner}/${cfg.repoName}` : null;
  const temGemini = Boolean(cfg.geminiKey);

  return (
    <footer
      data-testid="rodape-klaus"
      className="mt-12 w-full border-t border-border/60 bg-card/40 backdrop-blur-sm rounded-2xl p-6 sm:p-8 transition-colors select-none"
    >
      <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
        {/* Coluna 1: Identidade e Filosofia */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <LogoKlaus tamanho={26} />
            <span className="text-base font-bold tracking-tight text-foreground">Klaus</span>
            <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-mono font-semibold text-primary border border-primary/20">
              v{versao}
            </span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Seu segundo cérebro digital. Notas, tarefas, referências visuais e metas pessoais
            sincronizadas em arquivos Markdown.
          </p>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <ShieldCheck size={13} className="shrink-0" />
            <span>100% sob seu controle no GitHub</span>
          </div>
        </div>

        {/* Coluna 2: Navegação Rápida */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">Navegação</h4>
          <ul className="space-y-2 text-xs">
            <li>
              <Link
                to="/notas"
                className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
              >
                <FileText size={14} className="text-amber-500" />
                <span>Notas & Conhecimento</span>
              </Link>
            </li>
            <li>
              <Link
                to="/tarefas"
                className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
              >
                <CheckSquare size={14} className="text-blue-500" />
                <span>Tarefas & Projetos</span>
              </Link>
            </li>
            <li>
              <Link
                to="/referencias"
                className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
              >
                <ImageIcon size={14} className="text-pink-500" />
                <span>Referências Visuais</span>
              </Link>
            </li>
            <li>
              <Link
                to="/pdi"
                className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
              >
                <Target size={14} className="text-teal-500" />
                <span>Plano de Carreira (PDI)</span>
              </Link>
            </li>
            <li>
              <Link
                to="/grafo"
                className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
              >
                <Network size={14} className="text-indigo-500" />
                <span>Grafo Neural 3D</span>
              </Link>
            </li>
            <li>
              <Link
                to="/sons"
                className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
              >
                <Headphones size={14} className="text-purple-500" />
                <span>Sons & Foco</span>
              </Link>
            </li>
          </ul>
        </div>

        {/* Coluna 3: Atalhos de Teclado & Utilidades */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">Atalhos & Acesso</h4>
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between rounded-lg border border-border/50 bg-background/50 px-2.5 py-1.5 text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Command size={13} />
                <span>Busca Global</span>
              </span>
              <kbd className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono font-medium text-foreground">
                ⌘K
              </kbd>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border/50 bg-background/50 px-2.5 py-1.5 text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Command size={13} />
                <span>Captura Rápida</span>
              </span>
              <kbd className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono font-medium text-foreground">
                ⌘J
              </kbd>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border/50 bg-background/50 px-2.5 py-1.5 text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Command size={13} />
                <span>Barra Lateral</span>
              </span>
              <kbd className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono font-medium text-foreground">
                ⌘B
              </kbd>
            </div>
          </div>
          <div className="flex items-center gap-3 pt-1 text-xs">
            <Link
              to="/inbox"
              className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
            >
              <Inbox size={13} />
              <span>Inbox</span>
            </Link>
            <span className="text-border">•</span>
            <Link
              to="/config"
              className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
            >
              <SettingsIcon size={13} />
              <span>Ajustes</span>
            </Link>
          </div>
        </div>

        {/* Coluna 4: Status do Sistema em Tempo Real */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">Status do Sistema</h4>
          <div className="space-y-2 rounded-xl border border-border/60 bg-background/50 p-3 text-xs">
            {/* Status Conexão / Rede */}
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Conexão:</span>
              <span
                className={cn(
                  "flex items-center gap-1.5 font-medium",
                  online ? "text-emerald-600 dark:text-emerald-400" : "text-amber-500"
                )}
              >
                {online ? (
                  <>
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    <Wifi size={12} />
                    <span>Online</span>
                  </>
                ) : (
                  <>
                    <span className="h-2 w-2 rounded-full bg-amber-500" />
                    <WifiOff size={12} />
                    <span>Offline</span>
                  </>
                )}
              </span>
            </div>

            {/* Repositório GitHub */}
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">GitHub:</span>
              {temRepo ? (
                <a
                  href={repoUrl || "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 font-mono text-[11px] font-medium text-foreground hover:text-primary transition-colors truncate max-w-[130px]"
                  title={`${cfg.repoOwner}/${cfg.repoName} (${cfg.branch || "main"})`}
                >
                  <GitBranch size={12} className="shrink-0" />
                  <span className="truncate">{cfg.repoName}</span>
                  <ExternalLink size={10} className="shrink-0 opacity-60" />
                </a>
              ) : (
                <Link
                  to="/config"
                  className="text-amber-600 dark:text-amber-400 font-medium hover:underline text-[11px]"
                >
                  Não configurado
                </Link>
              )}
            </div>

            {/* Inteligência Artificial Gemini */}
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">IA Gemini:</span>
              <span
                className={cn(
                  "flex items-center gap-1 font-medium text-[11px]",
                  temGemini ? "text-purple-600 dark:text-purple-400" : "text-muted-foreground"
                )}
              >
                <Sparkles size={12} />
                <span>{temGemini ? "Ativo" : "Opcional"}</span>
              </span>
            </div>

            {/* Fila Offline / Rascunhos */}
            {qtdRascunhos > 0 && (
              <div className="flex items-center justify-between border-t border-border/40 pt-1.5 text-amber-600 dark:text-amber-400 font-medium text-[11px]">
                <span>Rascunhos pendentes:</span>
                <span className="rounded-full bg-amber-500/10 px-2 py-0.5 border border-amber-500/20">
                  {qtdRascunhos}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Linha Inferior com Frase Inspiradora, Assinatura e Voltar ao Topo */}
      <div className="mt-8 flex flex-col items-center justify-between gap-4 border-t border-border/40 pt-4 sm:flex-row text-xs text-muted-foreground">
        <p className="italic text-center sm:text-left text-muted-foreground/80">
          "{frase}"
        </p>

        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1">
            Feito com <Heart size={12} className="text-rose-500 fill-rose-500" /> para {cfg.nomeUsuario || "Hugo Silva"}
          </span>

          <button
            type="button"
            onClick={rolarParaTopo}
            className="flex items-center gap-1.5 rounded-lg border border-border/60 bg-background/60 px-2.5 py-1 text-xs font-medium text-foreground transition-all hover:bg-accent hover:text-primary active:scale-95 cursor-pointer"
            title="Voltar ao topo da página"
            aria-label="Voltar ao topo da página"
          >
            <ArrowUp size={13} />
            <span>Topo</span>
          </button>
        </div>
      </div>
    </footer>
  );
}
