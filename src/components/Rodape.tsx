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
        className="mt-24 w-full border-t border-border/50 pt-10 pb-16 text-muted-foreground select-none transition-colors"
      >
        {/* Crédito Open Source Contextual (sem caixas pesadas, formato limpo e elegante) */}
        {temCreditoEspecifico && creditosDaRota.length > 0 && (
          <div className="mb-10 pb-6 border-b border-border/40 space-y-3">
            {creditosDaRota.map((c) => (
              <div
                key={c.id}
                data-testid="credito-opensource-banner"
                className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-center gap-2.5 flex-wrap">
                  <Code2 size={15} className="text-primary shrink-0" />
                  <span className="font-semibold text-foreground">Motor Open Source:</span>
                  <span className="font-bold text-foreground">{c.nome}</span>
                  <span className="text-muted-foreground">por {c.autor}</span>
                  <span className="text-[11px] text-muted-foreground/80 font-mono">({c.licenca})</span>
                  <span className="hidden md:inline text-border">•</span>
                  <span className="hidden md:inline text-muted-foreground/80">{c.descricao}</span>
                </div>
                <a
                  href={c.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 font-medium text-primary hover:underline transition-colors shrink-0"
                >
                  <GitBranch size={13} />
                  <span>Acessar repositório no GitHub</span>
                  <ExternalLink size={11} className="opacity-70" />
                </a>
              </div>
            ))}
          </div>
        )}

        {/* Grade de Informações (Tipografia limpa e espaçada, sem caixas envolventes) */}
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {/* Coluna 1: Identidade e Privacidade */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <LogoKlaus tamanho={24} />
              <span className="text-base font-bold tracking-tight text-foreground">Klaus</span>
              <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-mono font-medium text-foreground/80">
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
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground">
              Navegação
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link
                  to="/notas"
                  className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <FileText size={14} className="text-amber-500 shrink-0" />
                  <span>Notas & Conhecimento</span>
                </Link>
              </li>
              <li>
                <Link
                  to="/tarefas"
                  className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <CheckSquare size={14} className="text-blue-500 shrink-0" />
                  <span>Tarefas & Projetos</span>
                </Link>
              </li>
              <li>
                <Link
                  to="/referencias"
                  className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ImageIcon size={14} className="text-pink-500 shrink-0" />
                  <span>Referências Visuais</span>
                </Link>
              </li>
              <li>
                <Link
                  to="/pdi"
                  className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Target size={14} className="text-teal-500 shrink-0" />
                  <span>Plano de Carreira (PDI)</span>
                </Link>
              </li>
              <li>
                <Link
                  to="/grafo"
                  className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Network size={14} className="text-indigo-500 shrink-0" />
                  <span>Grafo Neural 3D</span>
                </Link>
              </li>
              <li>
                <Link
                  to="/sons"
                  className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Headphones size={14} className="text-purple-500 shrink-0" />
                  <span>Sons & Foco</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Coluna 3: Atalhos de Teclado */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground">
              Atalhos de Teclado
            </h4>
            <ul className="space-y-2 text-xs">
              <li className="flex items-center justify-between text-muted-foreground">
                <span>Busca Global:</span>
                <span className="font-mono font-medium text-foreground">{formatarAtalho("⌘K")}</span>
              </li>
              <li className="flex items-center justify-between text-muted-foreground">
                <span>Captura Rápida:</span>
                <span className="font-mono font-medium text-foreground">{formatarAtalho("⌘J")}</span>
              </li>
              <li className="flex items-center justify-between text-muted-foreground">
                <span>Barra Lateral:</span>
                <span className="font-mono font-medium text-foreground">{formatarAtalho("⌘B")}</span>
              </li>
            </ul>
            <div className="flex items-center gap-3 pt-2 text-xs font-medium">
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
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground">
              Status do Sistema
            </h4>
            <ul className="space-y-2 text-xs">
              <li className="flex items-center justify-between">
                <span className="text-muted-foreground">Conexão:</span>
                <span
                  className={cn(
                    "flex items-center gap-1.5 font-medium",
                    online ? "text-emerald-600 dark:text-emerald-400" : "text-amber-500"
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
                <span className="text-muted-foreground">GitHub:</span>
                {temRepo ? (
                  <a
                    href={repoUrl || "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 font-mono text-[11px] font-medium text-foreground hover:text-primary transition-colors truncate max-w-[140px]"
                    title={`${cfg.repoOwner}/${cfg.repoName} (${cfg.branch || "main"})`}
                  >
                    <GitBranch size={12} className="shrink-0 text-primary" />
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
              </li>

              <li className="flex items-center justify-between">
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
              </li>

              {qtdRascunhos > 0 && (
                <li className="flex items-center justify-between text-amber-600 dark:text-amber-400 font-medium text-[11px] pt-1">
                  <span>Rascunhos offline:</span>
                  <span className="rounded-full bg-amber-500/10 px-2 py-0.5 border border-amber-500/20">
                    {qtdRascunhos}
                  </span>
                </li>
              )}
            </ul>
          </div>
        </div>

        {/* Linha Inferior com Frase Inspiradora, Assinatura e Voltar ao Topo */}
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-border/40 pt-6 sm:flex-row text-xs text-muted-foreground">
          <p className="italic text-center sm:text-left text-muted-foreground/80">
            "{frase}"
          </p>

          <div className="flex items-center gap-4 flex-wrap justify-center">
            <button
              type="button"
              onClick={() => setModalCreditosAberta(true)}
              className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors cursor-pointer text-xs"
            >
              <Code2 size={13} />
              <span>Créditos Open Source</span>
            </button>

            <span className="text-border">•</span>

            <span className="flex items-center gap-1">
              Feito com <Heart size={12} className="text-rose-500 fill-rose-500" /> para {cfg.nomeUsuario || "Hugo Silva"}
            </span>

            <span className="text-border">•</span>

            <button
              type="button"
              onClick={rolarParaTopo}
              className="flex items-center gap-1 text-foreground hover:text-primary font-medium transition-colors cursor-pointer"
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
