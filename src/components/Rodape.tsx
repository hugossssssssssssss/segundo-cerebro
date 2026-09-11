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
  ShieldCheck,
  Heart,
  ExternalLink,
  Code2,
} from "lucide-react";
import { LogoKlaus } from "./LogoKlaus";
import { versao } from "@/lib/versao";
import { lerConfig, type Settings } from "@/lib/settings";
import { obterRascunhosLocais } from "@/lib/offlineQueue";
import { cn, formatarAtalho } from "@/lib/utils";
import { ModalCreditosOpenSource } from "./ModalCreditosOpenSource";
import { Tooltip } from "@/components/ui/tooltip";

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
  const [modalCreditosAberta, setModalCreditosAberta] = useState(false);
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
        className="mt-32 sm:mt-40 w-[calc(100%+1.75rem)] sm:w-[calc(100%+3rem)] lg:w-[calc(100%+4rem)] -mx-3.5 sm:-mx-6 lg:-mx-8 -mb-24 sm:-mb-8 bg-card/45 dark:bg-card/25 border-t border-border/30 pt-10 pb-14 text-foreground select-none backdrop-blur-md"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-8">
          {/* Grade de Informações */}
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {/* Coluna 1: Identidade e Privacidade */}
            <div className="space-y-2.5">
              <div className="flex items-center gap-2">
                <LogoKlaus tamanho={22} />
                <span className="text-sm font-semibold tracking-tight text-foreground">Klaus</span>
                <span className="rounded-md bg-muted/60 px-1.5 py-0.5 text-[10px] font-mono font-medium text-muted-foreground border border-border/35">
                  v{versao}
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Segundo cérebro digital e repositório de conhecimento. Notas, tarefas, referências visuais e metas pessoais
                salvas em Markdown direto no GitHub.
              </p>
              <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                <ShieldCheck size={14} className="shrink-0" />
                <span>100% sob seu controle e privado</span>
              </div>
            </div>

            {/* Coluna 2: Navegação Rápida */}
            <div className="space-y-2.5">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground">
                Navegação
              </h4>
              <ul className="space-y-1.5 text-xs">
                <li>
                  <Link
                    to="/notas"
                    className="flex items-center gap-2 text-muted-foreground hover:text-foreground font-medium transition-colors"
                  >
                    <FileText size={14} className="text-amber-500 shrink-0" />
                    <span>Notas & Conhecimento</span>
                  </Link>
                </li>
                <li>
                  <Link
                    to="/tarefas"
                    className="flex items-center gap-2 text-muted-foreground hover:text-foreground font-medium transition-colors"
                  >
                    <CheckSquare size={14} className="text-blue-500 shrink-0" />
                    <span>Tarefas & Projetos</span>
                  </Link>
                </li>
                <li>
                  <Link
                    to="/referencias"
                    className="flex items-center gap-2 text-muted-foreground hover:text-foreground font-medium transition-colors"
                  >
                    <ImageIcon size={14} className="text-pink-500 shrink-0" />
                    <span>Referências Visuais</span>
                  </Link>
                </li>
                <li>
                  <Link
                    to="/pdi"
                    className="flex items-center gap-2 text-muted-foreground hover:text-foreground font-medium transition-colors"
                  >
                    <Target size={14} className="text-teal-500 shrink-0" />
                    <span>Plano de Carreira (PDI)</span>
                  </Link>
                </li>
                <li>
                  <Link
                    to="/grafo"
                    className="flex items-center gap-2 text-muted-foreground hover:text-foreground font-medium transition-colors"
                  >
                    <Network size={14} className="text-indigo-500 shrink-0" />
                    <span>Grafo Neural 3D</span>
                  </Link>
                </li>
                <li>
                  <Link
                    to="/sons"
                    className="flex items-center gap-2 text-muted-foreground hover:text-foreground font-medium transition-colors"
                  >
                    <Headphones size={14} className="text-purple-500 shrink-0" />
                    <span>Sons & Foco</span>
                  </Link>
                </li>
              </ul>
            </div>

            {/* Coluna 3: Atalhos de Teclado */}
            <div className="space-y-2.5">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground">
                Atalhos de Teclado
              </h4>
              <ul className="space-y-1.5 text-xs">
                <li className="flex items-center justify-between text-muted-foreground">
                  <span className="font-normal">Busca Global:</span>
                  <span className="font-mono font-medium text-foreground bg-muted/60 px-1 py-0.5 rounded text-[11px]">{formatarAtalho("⌘K")}</span>
                </li>
                <li className="flex items-center justify-between text-muted-foreground">
                  <span className="font-normal">Captura Rápida:</span>
                  <span className="font-mono font-medium text-foreground bg-muted/60 px-1 py-0.5 rounded text-[11px]">{formatarAtalho("⌘J")}</span>
                </li>
                <li className="flex items-center justify-between text-muted-foreground">
                  <span className="font-normal">Barra Lateral:</span>
                  <span className="font-mono font-medium text-foreground bg-muted/60 px-1 py-0.5 rounded text-[11px]">{formatarAtalho("⌘B")}</span>
                </li>
              </ul>
              <div className="flex items-center gap-2.5 pt-1 text-xs font-medium">
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

            {/* Coluna 4: Status em Tempo Real */}
            <div className="space-y-2.5">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground">
                Status do Sistema
              </h4>
              <ul className="space-y-1.5 text-xs">
                <li className="flex items-center justify-between">
                  <span className="text-muted-foreground font-normal">Conexão:</span>
                  <span
                    className={cn(
                      "flex items-center gap-1.5 font-medium",
                      online ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"
                    )}
                  >
                    {online ? (
                      <>
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <Wifi size={12} />
                        <span>Online</span>
                      </>
                    ) : (
                      <>
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                        <WifiOff size={12} />
                        <span>Offline</span>
                      </>
                    )}
                  </span>
                </li>

                <li className="flex items-center justify-between">
                  <span className="text-muted-foreground font-normal">GitHub:</span>
                  {temRepo ? (
                    <Tooltip conteudo={`Repositório: ${cfg.repoOwner}/${cfg.repoName} (${cfg.branch || "main"})`}>
                      <a
                        href={repoUrl || "#"}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 font-mono text-[11px] font-medium text-foreground hover:text-primary transition-colors truncate max-w-[140px]"
                      >
                        <GitBranch size={12} className="shrink-0 text-muted-foreground" />
                        <span className="truncate">{cfg.repoName}</span>
                        <ExternalLink size={10} className="shrink-0 opacity-70" />
                      </a>
                    </Tooltip>
                  ) : (
                    <Link
                      to="/config"
                      className="text-amber-600 dark:text-amber-400 font-medium hover:underline text-[11px]"
                    >
                      Não configurado
                    </Link>
                  )}
                </li>

                <li className="flex items-center justify-between">
                  <span className="text-muted-foreground font-normal">IA Gemini:</span>
                  <span
                    className={cn(
                      "flex items-center gap-1 font-medium text-[11px]",
                      temGemini ? "text-purple-600 dark:text-purple-400" : "text-muted-foreground"
                    )}
                  >
                    <Sparkles size={12} />
                    <span>{temGemini ? "Ativo" : "Opcional"}</span>
                  </span>
                </li>

                {qtdRascunhos > 0 && (
                  <li className="flex items-center justify-between text-amber-600 dark:text-amber-400 font-medium text-[11px] pt-1">
                    <span>Rascunhos offline:</span>
                    <span className="rounded-full bg-amber-500/15 px-2 py-0.5 border border-amber-500/30">
                      {qtdRascunhos}
                    </span>
                  </li>
                )}
              </ul>
            </div>
          </div>

          {/* Linha Inferior */}
          <div className="mt-8 flex flex-col items-center justify-between gap-3 border-t border-border/30 pt-5 sm:flex-row text-xs text-muted-foreground">
            <p className="italic text-center sm:text-left font-normal text-muted-foreground/80">
              "{frase}"
            </p>

            <div className="flex items-center gap-3 flex-wrap justify-center font-normal">
              <button
                type="button"
                onClick={() => setModalCreditosAberta(true)}
                className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors cursor-pointer text-xs font-medium"
              >
                <Code2 size={13} />
                <span>Créditos Open Source</span>
              </button>

              <span className="text-border">•</span>

              <span className="flex items-center gap-1">
                Feito com <Heart size={12} className="text-rose-500 fill-rose-500" /> para {cfg.nomeUsuario || "Hugo Silva"}
              </span>

              <span className="text-border">•</span>

              <Tooltip conteudo="Voltar ao topo da página" posicao="top">
                <button
                  type="button"
                  onClick={rolarParaTopo}
                  className="flex items-center gap-1 text-foreground hover:text-primary font-semibold transition-colors cursor-pointer"
                  aria-label="Voltar ao topo da página"
                >
                  <ArrowUp size={13} />
                  <span>Topo</span>
                </button>
              </Tooltip>
            </div>
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
