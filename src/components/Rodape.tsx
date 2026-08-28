import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
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
  Compass,
  Zap,
  Code2,
} from "lucide-react";
import { LogoKlaus } from "./LogoKlaus";
import { versao } from "@/lib/versao";
import { lerConfig, type Settings } from "@/lib/settings";
import { obterRascunhosLocais } from "@/lib/offlineQueue";
import { cn, formatarAtalho } from "@/lib/utils";
import { obterCreditosPorRota, TODOS_CREDITOS_OPEN_SOURCE } from "@/lib/creditosOpenSource";
import { ModalCreditosOpenSource } from "./ModalCreditosOpenSource";

const FRASES_INSPIRADORAS = [
  "A simplicidade é o último grau da sofisticação.",
  "O design não é apenas o que parece. Design é como funciona.",
  "Menos, porém melhor.",
  "A clareza precede o domínio.",
  "Organizar o pensamento é abrir espaço para a criatividade.",
  "Seu cérebro foi feito para ter ideias, não para guardá-las.",
];

export function Rodape() {
  const { pathname } = useLocation();
  const [cfg, setCfg] = useState<Settings>(lerConfig);
  const [online, setOnline] = useState(() => (typeof navigator !== "undefined" ? navigator.onLine : true));
  const [qtdRascunhos, setQtdRascunhos] = useState(0);
  const [modalCreditosAberta, setModalCreditosAberta] = useState(false);
  const [frase] = useState(() => {
    const indice = Math.floor(Math.random() * FRASES_INSPIRADORAS.length);
    return FRASES_INSPIRADORAS[indice];
  });

  const creditosDaRota = obterCreditosPorRota(pathname);
  const temCreditoEspecifico = TODOS_CREDITOS_OPEN_SOURCE.some(
    (c) => c.rotas && c.rotas.some((r) => pathname.toLowerCase().startsWith(r))
  );

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
    <>
      <footer
        data-testid="rodape-klaus"
        className="mt-16 w-full rounded-3xl border border-border/80 bg-secondary/40 dark:bg-muted/15 p-6 sm:p-10 shadow-xs backdrop-blur-md relative overflow-hidden transition-colors select-none"
      >
        {/* Linha decorativa sutil no topo do rodapé */}
        <div className="absolute top-0 inset-x-8 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

        {/* Banner de Créditos Open Source da Ferramenta Atual (quando houver tecnologia específica) */}
        {temCreditoEspecifico && creditosDaRota.length > 0 && (
          <div className="mb-8 space-y-2">
            {creditosDaRota.map((c) => (
              <div
                key={c.id}
                data-testid="credito-opensource-banner"
                className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-2xl border border-primary/25 bg-primary/5 dark:bg-primary/10 p-4 text-xs backdrop-blur-xs"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
                    <Code2 size={16} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-foreground">Motor Open Source:</span>
                      <span className="font-bold text-primary">{c.nome}</span>
                      <span className="text-muted-foreground text-[11px]">por {c.autor}</span>
                      <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground border border-border/50">
                        {c.licenca}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate">{c.descricao}</p>
                  </div>
                </div>
                <a
                  href={c.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-primary/30 bg-background/90 px-3 py-1.5 font-mono text-[11px] font-semibold text-primary hover:bg-primary hover:text-primary-foreground transition-all shrink-0 shadow-2xs"
                >
                  <GitBranch size={13} />
                  <span>Acessar no GitHub</span>
                  <ExternalLink size={10} />
                </a>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Coluna 1: Identidade e Filosofia */}
          <div className="space-y-3.5">
            <div className="flex items-center gap-2">
              <LogoKlaus tamanho={28} />
              <span className="text-base font-bold tracking-tight text-foreground">Klaus</span>
              <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-mono font-semibold text-primary border border-primary/20">
                v{versao}
              </span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Seu segundo cérebro digital e repositório de conhecimento. Notas, tarefas, referências visuais e metas pessoais
              sincronizadas em arquivos Markdown.
            </p>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <ShieldCheck size={13} className="shrink-0" />
              <span>100% sob seu controle no GitHub</span>
            </div>
          </div>

          {/* Coluna 2: Navegação Rápida */}
          <div className="space-y-3.5">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-foreground/90 flex items-center gap-1.5">
              <Compass size={13} className="text-primary" />
              <span>Navegação Rápida</span>
            </h4>
            <ul className="space-y-1.5 text-xs">
              <li>
                <Link
                  to="/notas"
                  className="flex items-center gap-2.5 text-muted-foreground hover:text-foreground hover:translate-x-0.5 transition-all py-1 font-medium"
                >
                  <FileText size={14} className="text-amber-500 shrink-0" />
                  <span>Notas & Conhecimento</span>
                </Link>
              </li>
              <li>
                <Link
                  to="/tarefas"
                  className="flex items-center gap-2.5 text-muted-foreground hover:text-foreground hover:translate-x-0.5 transition-all py-1 font-medium"
                >
                  <CheckSquare size={14} className="text-blue-500 shrink-0" />
                  <span>Tarefas & Projetos</span>
                </Link>
              </li>
              <li>
                <Link
                  to="/referencias"
                  className="flex items-center gap-2.5 text-muted-foreground hover:text-foreground hover:translate-x-0.5 transition-all py-1 font-medium"
                >
                  <ImageIcon size={14} className="text-pink-500 shrink-0" />
                  <span>Referências Visuais</span>
                </Link>
              </li>
              <li>
                <Link
                  to="/pdi"
                  className="flex items-center gap-2.5 text-muted-foreground hover:text-foreground hover:translate-x-0.5 transition-all py-1 font-medium"
                >
                  <Target size={14} className="text-teal-500 shrink-0" />
                  <span>Plano de Carreira (PDI)</span>
                </Link>
              </li>
              <li>
                <Link
                  to="/grafo"
                  className="flex items-center gap-2.5 text-muted-foreground hover:text-foreground hover:translate-x-0.5 transition-all py-1 font-medium"
                >
                  <Network size={14} className="text-indigo-500 shrink-0" />
                  <span>Grafo Neural 3D</span>
                </Link>
              </li>
              <li>
                <Link
                  to="/sons"
                  className="flex items-center gap-2.5 text-muted-foreground hover:text-foreground hover:translate-x-0.5 transition-all py-1 font-medium"
                >
                  <Headphones size={14} className="text-purple-500 shrink-0" />
                  <span>Sons & Foco</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Coluna 3: Atalhos de Teclado & Utilidades */}
          <div className="space-y-3.5">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-foreground/90 flex items-center gap-1.5">
              <Zap size={13} className="text-primary" />
              <span>Atalhos do Sistema</span>
            </h4>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between rounded-xl border border-border/70 bg-card/95 dark:bg-card/50 px-3 py-2 text-muted-foreground shadow-2xs">
                <span className="flex items-center gap-2">
                  <Command size={13} className="text-foreground/70" />
                  <span className="font-medium text-foreground/80">Busca Global</span>
                </span>
                <kbd className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-mono font-semibold text-foreground border border-border/60">
                  {formatarAtalho("⌘K")}
                </kbd>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-border/70 bg-card/95 dark:bg-card/50 px-3 py-2 text-muted-foreground shadow-2xs">
                <span className="flex items-center gap-2">
                  <Command size={13} className="text-foreground/70" />
                  <span className="font-medium text-foreground/80">Captura Rápida</span>
                </span>
                <kbd className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-mono font-semibold text-foreground border border-border/60">
                  {formatarAtalho("⌘J")}
                </kbd>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-border/70 bg-card/95 dark:bg-card/50 px-3 py-2 text-muted-foreground shadow-2xs">
                <span className="flex items-center gap-2">
                  <Command size={13} className="text-foreground/70" />
                  <span className="font-medium text-foreground/80">Barra Lateral</span>
                </span>
                <kbd className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-mono font-semibold text-foreground border border-border/60">
                  {formatarAtalho("⌘B")}
                </kbd>
              </div>
            </div>
            <div className="flex items-center gap-3 pt-1 text-xs font-medium">
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
          <div className="space-y-3.5">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-foreground/90 flex items-center gap-1.5">
              <Sparkles size={13} className="text-primary" />
              <span>Status em Tempo Real</span>
            </h4>
            <div className="space-y-2.5 rounded-2xl border border-border/70 bg-card/95 dark:bg-card/50 p-3.5 text-xs shadow-2xs">
              {/* Status Conexão / Rede */}
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground font-medium">Conexão:</span>
                <span
                  className={cn(
                    "flex items-center gap-1.5 font-semibold",
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
                <span className="text-muted-foreground font-medium">GitHub:</span>
                {temRepo ? (
                  <a
                    href={repoUrl || "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 font-mono text-[11px] font-semibold text-foreground hover:text-primary transition-colors truncate max-w-[130px]"
                    title={`${cfg.repoOwner}/${cfg.repoName} (${cfg.branch || "main"})`}
                  >
                    <GitBranch size={12} className="shrink-0 text-primary" />
                    <span className="truncate">{cfg.repoName}</span>
                    <ExternalLink size={10} className="shrink-0 opacity-60" />
                  </a>
                ) : (
                  <Link
                    to="/config"
                    className="text-amber-600 dark:text-amber-400 font-semibold hover:underline text-[11px]"
                  >
                    Não configurado
                  </Link>
                )}
              </div>

              {/* Inteligência Artificial Gemini */}
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground font-medium">IA Gemini:</span>
                <span
                  className={cn(
                    "flex items-center gap-1 font-semibold text-[11px]",
                    temGemini ? "text-purple-600 dark:text-purple-400" : "text-muted-foreground"
                  )}
                >
                  <Sparkles size={12} />
                  <span>{temGemini ? "Ativo" : "Opcional"}</span>
                </span>
              </div>

              {/* Fila Offline / Rascunhos */}
              {qtdRascunhos > 0 && (
                <div className="flex items-center justify-between border-t border-border/40 pt-2 text-amber-600 dark:text-amber-400 font-semibold text-[11px]">
                  <span>Rascunhos pendentes:</span>
                  <span className="rounded-full bg-amber-500/10 px-2 py-0.5 border border-amber-500/20">
                    {qtdRascunhos}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Linha Inferior com Frase Inspiradora, Assinatura, Créditos Open Source e Voltar ao Topo */}
        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-border/60 pt-5 sm:flex-row text-xs text-muted-foreground">
          <p className="italic text-center sm:text-left text-muted-foreground/80">
            "{frase}"
          </p>

          <div className="flex items-center gap-4 flex-wrap justify-center">
            <button
              type="button"
              onClick={() => setModalCreditosAberta(true)}
              className="flex items-center gap-1.5 rounded-lg border border-border/60 bg-background/60 px-2.5 py-1 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer"
            >
              <Code2 size={12} className="text-primary" />
              <span>Créditos Open Source</span>
            </button>

            <span className="flex items-center gap-1 font-medium">
              Feito com <Heart size={12} className="text-rose-500 fill-rose-500" /> para {cfg.nomeUsuario || "Hugo Silva"}
            </span>

            <button
              type="button"
              onClick={rolarParaTopo}
              className="flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground shadow-2xs transition-all hover:bg-primary hover:text-primary-foreground hover:border-primary active:scale-95 cursor-pointer"
              title="Voltar ao topo da página"
              aria-label="Voltar ao topo da página"
            >
              <ArrowUp size={13} />
              <span>Topo</span>
            </button>
          </div>
        </div>
      </footer>

      {/* Modal com catálogo completo de créditos e repositórios Open Source */}
      <ModalCreditosOpenSource
        aberta={modalCreditosAberta}
        aoFechar={() => setModalCreditosAberta(false)}
      />
    </>
  );
}
