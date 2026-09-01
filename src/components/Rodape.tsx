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
        className="mt-60 sm:mt-80 lg:mt-96 w-[calc(100%+1.75rem)] sm:w-[calc(100%+3rem)] lg:w-[calc(100%+4rem)] -mx-3.5 sm:-mx-6 lg:-mx-8 -mb-24 sm:-mb-8 bg-[#f5f5f7] dark:bg-[#18181b] border-t border-zinc-200 dark:border-zinc-800 pt-14 pb-18 text-zinc-900 dark:text-zinc-100 select-none shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)]"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-8">
          {/* Grade de Informações (Bloco sólido, tipografia limpa em preto de alto contraste) */}
          <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
            {/* Coluna 1: Identidade e Privacidade */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <LogoKlaus tamanho={24} />
                <span className="text-base font-black tracking-tight text-black dark:text-white">Klaus</span>
                <span className="rounded-md bg-zinc-200/90 dark:bg-zinc-800 px-1.5 py-0.5 text-[10px] font-mono font-bold text-black dark:text-zinc-200 border border-zinc-300/40">
                  v{versao}
                </span>
              </div>
              <p className="text-xs text-zinc-800 dark:text-zinc-300 leading-relaxed font-medium">
                Segundo cérebro digital e repositório de conhecimento. Notas, tarefas, referências visuais e metas pessoais
                salvas em Markdown direto no GitHub.
              </p>
              <div className="flex items-center gap-1.5 text-xs text-emerald-800 dark:text-emerald-400 font-bold">
                <ShieldCheck size={14} className="shrink-0" />
                <span>100% sob seu controle e privado</span>
              </div>
            </div>

            {/* Coluna 2: Navegação Rápida */}
            <div className="space-y-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-black dark:text-white">
                Navegação
              </h4>
              <ul className="space-y-2 text-xs">
                <li>
                  <Link
                    to="/notas"
                    className="flex items-center gap-2 text-zinc-800 hover:text-black dark:text-zinc-200 dark:hover:text-white font-semibold transition-colors"
                  >
                    <FileText size={14} className="text-amber-600 dark:text-amber-500 shrink-0" />
                    <span>Notas & Conhecimento</span>
                  </Link>
                </li>
                <li>
                  <Link
                    to="/tarefas"
                    className="flex items-center gap-2 text-zinc-800 hover:text-black dark:text-zinc-200 dark:hover:text-white font-semibold transition-colors"
                  >
                    <CheckSquare size={14} className="text-blue-600 dark:text-blue-500 shrink-0" />
                    <span>Tarefas & Projetos</span>
                  </Link>
                </li>
                <li>
                  <Link
                    to="/referencias"
                    className="flex items-center gap-2 text-zinc-800 hover:text-black dark:text-zinc-200 dark:hover:text-white font-semibold transition-colors"
                  >
                    <ImageIcon size={14} className="text-pink-600 dark:text-pink-500 shrink-0" />
                    <span>Referências Visuais</span>
                  </Link>
                </li>
                <li>
                  <Link
                    to="/pdi"
                    className="flex items-center gap-2 text-zinc-800 hover:text-black dark:text-zinc-200 dark:hover:text-white font-semibold transition-colors"
                  >
                    <Target size={14} className="text-teal-600 dark:text-teal-500 shrink-0" />
                    <span>Plano de Carreira (PDI)</span>
                  </Link>
                </li>
                <li>
                  <Link
                    to="/grafo"
                    className="flex items-center gap-2 text-zinc-800 hover:text-black dark:text-zinc-200 dark:hover:text-white font-semibold transition-colors"
                  >
                    <Network size={14} className="text-indigo-600 dark:text-indigo-500 shrink-0" />
                    <span>Grafo Neural 3D</span>
                  </Link>
                </li>
                <li>
                  <Link
                    to="/sons"
                    className="flex items-center gap-2 text-zinc-800 hover:text-black dark:text-zinc-200 dark:hover:text-white font-semibold transition-colors"
                  >
                    <Headphones size={14} className="text-purple-600 dark:text-purple-500 shrink-0" />
                    <span>Sons & Foco</span>
                  </Link>
                </li>
              </ul>
            </div>

            {/* Coluna 3: Atalhos de Teclado */}
            <div className="space-y-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-black dark:text-white">
                Atalhos de Teclado
              </h4>
              <ul className="space-y-2 text-xs">
                <li className="flex items-center justify-between text-zinc-700 dark:text-zinc-300">
                  <span className="font-medium">Busca Global:</span>
                  <span className="font-mono font-bold text-black dark:text-white">{formatarAtalho("⌘K")}</span>
                </li>
                <li className="flex items-center justify-between text-zinc-700 dark:text-zinc-300">
                  <span className="font-medium">Captura Rápida:</span>
                  <span className="font-mono font-bold text-black dark:text-white">{formatarAtalho("⌘J")}</span>
                </li>
                <li className="flex items-center justify-between text-zinc-700 dark:text-zinc-300">
                  <span className="font-medium">Barra Lateral:</span>
                  <span className="font-mono font-bold text-black dark:text-white">{formatarAtalho("⌘B")}</span>
                </li>
              </ul>
              <div className="flex items-center gap-3 pt-2 text-xs font-bold">
                <Link
                  to="/inbox"
                  className="flex items-center gap-1.5 text-zinc-800 hover:text-black dark:text-zinc-200 dark:hover:text-white transition-colors"
                >
                  <Inbox size={13} />
                  <span>Inbox</span>
                </Link>
                <span className="text-zinc-400">•</span>
                <Link
                  to="/config"
                  className="flex items-center gap-1.5 text-zinc-800 hover:text-black dark:text-zinc-200 dark:hover:text-white transition-colors"
                >
                  <SettingsIcon size={13} />
                  <span>Ajustes</span>
                </Link>
              </div>
            </div>

            {/* Coluna 4: Status em Tempo Real */}
            <div className="space-y-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-black dark:text-white">
                Status do Sistema
              </h4>
              <ul className="space-y-2 text-xs">
                <li className="flex items-center justify-between">
                  <span className="text-zinc-700 dark:text-zinc-300 font-medium">Conexão:</span>
                  <span
                    className={cn(
                      "flex items-center gap-1.5 font-bold",
                      online ? "text-emerald-700 dark:text-emerald-400" : "text-amber-700 dark:text-amber-400"
                    )}
                  >
                    {online ? (
                      <>
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse" />
                        <Wifi size={12} />
                        <span>Online</span>
                      </>
                    ) : (
                      <>
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-600" />
                        <WifiOff size={12} />
                        <span>Offline</span>
                      </>
                    )}
                  </span>
                </li>

                <li className="flex items-center justify-between">
                  <span className="text-zinc-700 dark:text-zinc-300 font-medium">GitHub:</span>
                  {temRepo ? (
                    <Tooltip conteudo={`Repositório: ${cfg.repoOwner}/${cfg.repoName} (${cfg.branch || "main"})`}>
                      <a
                        href={repoUrl || "#"}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 font-mono text-[11px] font-bold text-black dark:text-white hover:text-primary transition-colors truncate max-w-[140px]"
                      >
                        <GitBranch size={12} className="shrink-0 text-primary" />
                        <span className="truncate">{cfg.repoName}</span>
                        <ExternalLink size={10} className="shrink-0 opacity-70" />
                      </a>
                    </Tooltip>
                  ) : (
                    <Link
                      to="/config"
                      className="text-amber-700 dark:text-amber-400 font-bold hover:underline text-[11px]"
                    >
                      Não configurado
                    </Link>
                  )}
                </li>

                <li className="flex items-center justify-between">
                  <span className="text-zinc-700 dark:text-zinc-300 font-medium">IA Gemini:</span>
                  <span
                    className={cn(
                      "flex items-center gap-1 font-bold text-[11px]",
                      temGemini ? "text-purple-700 dark:text-purple-400" : "text-zinc-600 dark:text-zinc-400"
                    )}
                  >
                    <Sparkles size={12} />
                    <span>{temGemini ? "Ativo" : "Opcional"}</span>
                  </span>
                </li>

                {qtdRascunhos > 0 && (
                  <li className="flex items-center justify-between text-amber-800 dark:text-amber-400 font-bold text-[11px] pt-1">
                    <span>Rascunhos offline:</span>
                    <span className="rounded-full bg-amber-500/20 px-2 py-0.5 border border-amber-600/30">
                      {qtdRascunhos}
                    </span>
                  </li>
                )}
              </ul>
            </div>
          </div>

          {/* Linha Inferior com Frase Inspiradora, Assinatura e Voltar ao Topo */}
          <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-zinc-200 dark:border-zinc-800 pt-6 sm:flex-row text-xs text-zinc-700 dark:text-zinc-300">
            <p className="italic text-center sm:text-left font-medium">
              "{frase}"
            </p>

            <div className="flex items-center gap-4 flex-wrap justify-center font-medium">
              <button
                type="button"
                onClick={() => setModalCreditosAberta(true)}
                className="flex items-center gap-1 text-zinc-800 hover:text-black dark:text-zinc-200 dark:hover:text-white transition-colors cursor-pointer text-xs font-semibold"
              >
                <Code2 size={13} />
                <span>Créditos Open Source</span>
              </button>

              <span className="text-zinc-400">•</span>

              <span className="flex items-center gap-1">
                Feito com <Heart size={12} className="text-rose-600 fill-rose-600" /> para {cfg.nomeUsuario || "Hugo Silva"}
              </span>

              <span className="text-zinc-400">•</span>

              <Tooltip conteudo="Voltar ao topo da página" posicao="top">
                <button
                  type="button"
                  onClick={rolarParaTopo}
                  className="flex items-center gap-1 text-black dark:text-white hover:text-primary font-black transition-colors cursor-pointer"
                  aria-label="Voltar ao topo da página"
                >
                  <ArrowUp size={13} strokeWidth={3} />
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
