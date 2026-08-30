import {
  HashRouter,
  Routes,
  Route,
  NavLink,
  Navigate,
  useLocation,
} from "react-router-dom";
import { Suspense, lazy, useEffect, useState } from "react";
import {
  CheckSquare,
  FileText,
  MessageCircle,
  Search,
  Home as HomeIcon,
  Plus,
  MoreHorizontal,
  Headphones,
  Music,
  Play,
  Pause,
  VolumeX,
  Minimize2,
  Globe,
} from "lucide-react";
import { ProvedorFlutuanteGlobal } from "@/components/ItemFlutuanteContext";
import { ProvedorFerramentasFlutuantes } from "@/components/ContextoFerramentasFlutuantes";
import { WorkspaceProvider, useWorkspace } from "@/components/workspace/WorkspaceContext";
import { WorkspaceTelaCheia } from "@/components/workspace/WorkspaceTelaCheia";
import { WorkspaceBarraAbas } from "@/components/workspace/WorkspaceBarraAbas";
import { Busca } from "@/components/Busca";
import { ModalBuscaWeb } from "@/components/ModalBuscaWeb";
import { CapturaRapida } from "@/components/CapturaRapida";
import { ToastsContainer } from "@/components/ToastsContainer";
import { NavegacaoLateral } from "@/components/NavegacaoLateral";
import { LimiteDeErro } from "@/components/LimiteDeErro";
import { toast } from "@/lib/toast";
import { GavetaMais } from "@/components/GavetaMais";
import { LogoKlaus } from "@/components/LogoKlaus";
import { Carregando } from "@/components/ui";
import { PainelNotificacoesHeader } from "@/components/PainelNotificacoesHeader";
import { BarraFavoritos } from "@/components/BarraFavoritos";
import { Rodape } from "@/components/Rodape";
import { cn, formatarAtalho } from "@/lib/utils";
import { lerConfig, configCompleta, precisaOnboarding } from "@/lib/settings";
import { carregarRepo } from "@/lib/repo";
import { carregarEstadoInbox, compilarItensInbox } from "@/lib/inbox";
import { sincronizarFilaOffline as syncOffline } from "@/lib/offlineQueue";
import { gerenciadorCamadas, NIVEIS_CAMADAS } from "@/lib/camadas";
import { ConsoleDesenvolvedor } from "@/components/ConsoleDesenvolvedor";
import { inicializarLogger } from "@/lib/logger";
import { CronometroProvider, useCronometro, LISTA_SONS_AMBIENTE } from "@/components/ContextoCronometro";
import { Pomodoro } from "@/components/Pomodoro";
import { obterRotuloRota, EVENTO_MENU_ATUALIZADO, sincronizarMenuComGithub } from "@/lib/menuPersonalizado";

inicializarLogger();

/**
 * HashRouter (URLs com #) em vez de BrowserRouter: o GitHub Pages não sabe
 * reescrever rotas para o index.html, então sem hash um F5 em /notas dá 404.
 */
const Home = lazy(() => import("@/pages/Home"));
const Inbox = lazy(() => import("@/pages/Inbox"));
const Tarefas = lazy(() => import("@/pages/Tarefas"));
const Notas = lazy(() => import("@/pages/Notas"));
const Referencias = lazy(() => import("@/pages/Referencias"));
const Lousas = lazy(() => import("@/pages/Lousas"));
const PDI = lazy(() => import("@/pages/PDI"));
const Chat = lazy(() => import("@/pages/Chat"));
const FerramentasPDF = lazy(() => import("@/pages/FerramentasPDF"));
const Conversor = lazy(() => import("@/pages/Conversor"));
const Transcritor = lazy(() => import("@/pages/Transcritor"));
const GrafoNeural = lazy(() => import("@/pages/GrafoNeural"));
const Contatos = lazy(() => import("@/pages/Contatos"));
const Noticias = lazy(() => import("@/pages/Noticias"));
const Configuracoes = lazy(() => import("@/pages/Configuracoes"));
const BoasVindas = lazy(() => import("@/pages/BoasVindas"));
const PesquisaLivros = lazy(() => import("@/pages/PesquisaLivros"));
const TestadorHardware = lazy(() => import("@/pages/TestadorHardware"));
const Sons = lazy(() => import("@/pages/Sons"));
const Jogos = lazy(() => import("@/pages/Jogos"));
const Lixeira = lazy(() => import("@/pages/Lixeira"));



const abasMobile = [
  { para: "/home", rotulo: "Início", Icone: HomeIcon },
  { para: "/tarefas", rotulo: "Tarefas", Icone: CheckSquare },
  { para: "/notas", rotulo: "Notas", Icone: FileText },
  { para: "/chat", rotulo: "Conversar", Icone: MessageCircle },
];

function Estrutura({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  const { workspaceAberto, abaAtiva, fecharWorkspace, buscaGlobalAberta, setBuscaGlobalAberta } = useWorkspace();
  const [buscando, setBuscando] = useState(false);
  const [buscandoWeb, setBuscandoWeb] = useState(false);
  const [capturando, setCapturando] = useState(false);
  const [gavetaAberta, setGavetaAberta] = useState(false);
  const [textoCompartilhado, setTextoCompartilhado] = useState("");
  const [colapsada, setColapsada] = useState(() => {
    const salvo = localStorage.getItem("sidebar-colapsada");
    return salvo ? salvo === "true" : false;
  });

  const {
    somAmbiente,
    setSomAmbiente,
    somAmbienteTocando,
    setSomAmbienteTocando,
    volumeSomAmbiente,
    setVolumeSomAmbiente,
  } = useCronometro();
  const [somMenuAberto, setSomMenuAberto] = useState(false);

  useEffect(() => {
    localStorage.setItem("sidebar-colapsada", String(colapsada));
  }, [colapsada]);

  // ⌘K busca, ⌘J captura, ⌘B toggle da barra lateral (Com exclusividade mútua)
  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return;
      const tecla = e.key.toLowerCase();
      if (tecla === "k") {
        e.preventDefault();
        setCapturando(false);
        setBuscando(true);
      } else if (tecla === "j") {
        e.preventDefault();
        setBuscando(false);
        setCapturando(true);
      } else if (tecla === "b") {
        e.preventDefault();
        if (!workspaceAberto) {
          setColapsada((v) => !v);
        }
      }
    };
    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
  }, [workspaceAberto]);

  // Registro das camadas no gerenciador do Klaus
  useEffect(() => {
    if (!buscando) return;
    const limpar = gerenciadorCamadas.registrar({
      id: "busca-global",
      nivel: NIVEIS_CAMADAS.MODAIS_GLOBAIS,
      temBackdrop: true,
      aoFechar: () => setBuscando(false),
    });
    return () => limpar();
  }, [buscando]);

  useEffect(() => {
    if (!buscandoWeb) return;
    const limpar = gerenciadorCamadas.registrar({
      id: "busca-web-modal",
      nivel: NIVEIS_CAMADAS.MODAIS_GLOBAIS,
      temBackdrop: true,
      aoFechar: () => setBuscandoWeb(false),
    });
    return () => limpar();
  }, [buscandoWeb]);

  useEffect(() => {
    if (!capturando) return;
    const limpar = gerenciadorCamadas.registrar({
      id: "captura-rapida",
      nivel: NIVEIS_CAMADAS.MODAIS_GLOBAIS,
      temBackdrop: true,
      aoFechar: () => setCapturando(false),
    });
    return () => limpar();
  }, [capturando]);

  useEffect(() => {
    if (!gavetaAberta) return;
    const limpar = gerenciadorCamadas.registrar({
      id: "gaveta-mobile",
      nivel: NIVEIS_CAMADAS.GAVETA_MOBILE,
      temBackdrop: true,
      aoFechar: () => setGavetaAberta(false),
    });
    return () => limpar();
  }, [gavetaAberta]);



  // Sincronização automática de rascunhos offline ao reconectar à internet
  useEffect(() => {
    const aoVoltarOnline = async () => {
      const cfg = lerConfig();
      if (configCompleta(cfg)) {
        const res = await syncOffline(cfg);
        if (res.concluidos > 0) {
          toast(`${res.concluidos} rascunho(s) offline sincronizado(s) com o GitHub!`, { tipo: "sucesso" });
        }
        if (res.falhas > 0) {
          toast(`${res.falhas} rascunho(s) pendente(s) por falha ou conflito: clique para ver`, {
            tipo: "erro",
            detalhes: "Um ou mais rascunhos offline falharam ao tentar sincronizar com o GitHub (conflito 409 ou erro de rede).\n\nAcesse a Caixa de Entrada > Rascunhos Offline para aceitar a versão local ou descartar.",
          });
        }
        sincronizarMenuComGithub(cfg).catch(() => {});
      }
    };
    window.addEventListener("online", aoVoltarOnline);
    aoVoltarOnline();
    return () => window.removeEventListener("online", aoVoltarOnline);
  }, []);

  /**
   * Badge de pendências no título da aba.
   *
   * Antes isto dependia de `pathname`, então CADA troca de tela recarregava o
   * repositório inteiro só para calcular um número — e ainda por cima em
   * paralelo com a carga que a própria tela nova estava disparando. Eram ~3
   * requisições ao GitHub por clique na navegação, com o teto de 5.000/hora
   * bem à vista num dia de uso intenso.
   *
  /**
   * Mantém o título da aba do navegador sincronizado com a tela ou documento aberto,
   * respeitando os nomes personalizados no menu e sem o prefixo "Klaus".
   */
  useEffect(() => {
    let cancelado = false;

    const atualizarTituloAba = async () => {
      // 1. Se houver um documento ativo aberto no workspace / tela cheia
      if (workspaceAberto && abaAtiva?.titulo) {
        document.title = abaAtiva.titulo;
        return;
      }

      // 2. Rótulo da rota atual baseado no menu personalizado
      const rotuloRota = obterRotuloRota(pathname);

      // 3. Se for a tela de Inbox/Caixa de Entrada, atualiza com contagem de não lidos se houver
      if (pathname === "/inbox" || pathname === "inbox") {
        const cfg = lerConfig();
        if (configCompleta(cfg)) {
          try {
            const todos = await carregarRepo(cfg, { memoria: 30_000 });
            if (cancelado) return;
            const estadoRes = await carregarEstadoInbox(cfg, todos);
            if (cancelado) return;
            const itens = compilarItensInbox(todos, estadoRes.mapa);
            const naoVistos = itens.filter((i) => !i.visto).length;
            document.title = naoVistos > 0 ? `(${naoVistos}) ${rotuloRota}` : rotuloRota;
            return;
          } catch {
            // falha não interrompe
          }
        }
      }

      document.title = rotuloRota;
    };

    atualizarTituloAba();
    window.addEventListener(EVENTO_MENU_ATUALIZADO, atualizarTituloAba);
    window.addEventListener("acervo-atualizado", atualizarTituloAba);

    return () => {
      cancelado = true;
      window.removeEventListener(EVENTO_MENU_ATUALIZADO, atualizarTituloAba);
      window.removeEventListener("acervo-atualizado", atualizarTituloAba);
    };
  }, [pathname, workspaceAberto, abaAtiva?.titulo]);

  /**
   * Compartilhar de outro app do Android cai aqui.
   */
  useEffect(() => {
    const params = new URLSearchParams(
      location.search.slice(1) || location.hash.split("?")[1] || "",
    );
    const vindo = [params.get("titulo"), params.get("texto"), params.get("url")]
      .filter(Boolean)
      .join("\n");
    if (vindo) {
      setTextoCompartilhado(vindo);
      setCapturando(true);
      history.replaceState(null, "", location.pathname + "#/tarefas");
    }
  }, []);

  return (
    <div className="min-h-dvh flex bg-background text-foreground overflow-hidden h-dvh">
      {/* Navegação Lateral (Desktop) */}
      <NavegacaoLateral
        colapsada={workspaceAberto ? true : colapsada}
        setColapsada={setColapsada}
        className="hidden sm:flex sticky top-0 h-dvh shrink-0"
      />

      <div className="flex-1 flex flex-col min-w-0 h-dvh overflow-hidden">
        {/* Cabeçalho Principal (Topbar Limpa / Integrada com Abas no Workspace) */}
        <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur shrink-0">
          <div
            className={cn(
              "flex items-center justify-between transition-all",
              workspaceAberto
                ? "w-full px-2 sm:px-3 h-12"
                : "w-full px-3.5 sm:px-6 h-14"
            )}
          >
            {/* Lado Esquerdo: Logo no Mobile + Barra de Favoritos */}
            <div className={cn("flex items-center gap-2 min-w-0 mr-2", workspaceAberto ? "flex-initial max-w-xs sm:max-w-sm" : "flex-1")}>
              <NavLink
                to="/home"
                onClick={() => {
                  if (workspaceAberto) fecharWorkspace();
                }}
                className="flex sm:hidden items-center gap-2 font-bold tracking-tight text-sm hover:opacity-90 transition-opacity shrink-0"
              >
                <LogoKlaus tamanho={24} />
                <span>Klaus</span>
              </NavLink>

              <BarraFavoritos className="flex-1 min-w-0" />
            </div>

            {/* Centro: Abas do Workspace integradas diretamente no Header */}
            {workspaceAberto && (
              <div className="flex-1 min-w-0 mx-1 sm:mx-2 h-full flex items-end overflow-hidden">
                <WorkspaceBarraAbas />
              </div>
            )}

            {/* Lado Direito: Captura Rápida, Caixa de Som, Inbox, Busca e Sair da Tela Cheia */}
            <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
              <button
                onClick={() => setCapturando(true)}
                className="rounded-lg p-1.5 sm:p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground cursor-pointer"
                title={`Captura rápida (${formatarAtalho("⌘J")})`}
                aria-label="Captura rápida"
              >
                <Plus size={18} />
              </button>

              {/* Botão de Som Ambiente no Header */}
              {somAmbiente && (
                <div className="relative">
                  <button
                    onClick={() => setSomMenuAberto(!somMenuAberto)}
                    className={cn(
                      "rounded-lg p-1.5 sm:p-2 transition-colors relative flex items-center justify-center cursor-pointer",
                      somAmbienteTocando 
                        ? "bg-primary/10 text-primary" 
                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    )}
                    title="Configurações de som ambiente"
                    aria-label="Controle de áudio"
                  >
                    <Headphones size={18} className={somAmbienteTocando ? "animate-pulse" : ""} />
                    {somAmbienteTocando && (
                      <span className="absolute bottom-1 right-1 flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                      </span>
                    )}
                  </button>

                  {/* Menu suspenso de áudio */}
                  {somMenuAberto && (
                    <div className="absolute right-0 mt-2 w-64 rounded-xl border border-border bg-card/95 p-4 shadow-xl backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-200 z-50">
                      <div className="flex items-center justify-between border-b border-border/40 pb-2 mb-3">
                        <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                          <Music size={13} className="text-primary" />
                          Som de Fundo
                        </span>
                        <button
                          onClick={() => setSomMenuAberto(false)}
                          className="text-[10px] text-muted-foreground hover:text-foreground hover:underline cursor-pointer"
                        >
                          Fechar
                        </button>
                      </div>

                      <div className="space-y-3">
                        {/* Seletor rápido de sons */}
                        <div className="grid grid-cols-2 gap-1">
                          {LISTA_SONS_AMBIENTE.map((s) => (
                            <button
                              key={s.id}
                              onClick={() => {
                                setSomAmbiente(s.id);
                              }}
                              className={cn(
                                "text-[11px] px-2 py-1 rounded-md text-left truncate transition-colors cursor-pointer",
                                somAmbiente === s.id
                                  ? "bg-primary/15 text-primary font-semibold"
                                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
                              )}
                              title={s.nome}
                            >
                              {s.nome}
                            </button>
                          ))}
                        </div>

                        {/* Controles de Play/Pause/Volume */}
                        <div className="flex items-center justify-between border-t border-border/40 pt-2.5 mt-1 gap-2">
                          <button
                            onClick={() => setSomAmbienteTocando(!somAmbienteTocando)}
                            className="p-1.5 rounded-lg bg-secondary text-foreground hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer"
                            title={somAmbienteTocando ? "Pausar som" : "Tocar som"}
                          >
                            {somAmbienteTocando ? <Pause size={14} /> : <Play size={14} />}
                          </button>
                          
                          {/* Slider de volume */}
                          <div className="flex-1 flex items-center gap-1.5">
                            <input
                              type="range"
                              min="0"
                              max="1"
                              step="0.1"
                              value={volumeSomAmbiente}
                              onChange={(e) => setVolumeSomAmbiente(Number(e.target.value))}
                              className="w-full accent-primary h-1 rounded bg-secondary appearance-none cursor-pointer"
                              title="Volume"
                            />
                            <span className="text-[10px] font-mono text-muted-foreground w-6 text-right select-none">
                              {Math.round(volumeSomAmbiente * 100)}%
                            </span>
                          </div>

                          <button
                            onClick={() => {
                              setSomAmbiente(null);
                              setSomMenuAberto(false);
                            }}
                            className="p-1.5 rounded-lg text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                            title="Desligar e fechar"
                          >
                            <VolumeX size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Painel de Notificações Popover (Estilo Central de Notificações) */}
              <PainelNotificacoesHeader />

              {/* Busca Web Externa */}
              <button
                type="button"
                onClick={() => setBuscandoWeb(true)}
                className="rounded-lg p-1.5 sm:p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground cursor-pointer"
                title="Busca Web Externa"
                aria-label="Busca Web"
              >
                <Globe size={18} />
              </button>

              <button
                onClick={() => setBuscando(true)}
                className="rounded-lg p-1.5 sm:p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground cursor-pointer"
                title={`Buscar (${formatarAtalho("⌘K")})`}
                aria-label="Buscar"
              >
                <Search size={18} />
              </button>

              {/* Botão de Sair do modo Workspace / Tela Cheia */}
              {workspaceAberto && (
                <button
                  onClick={fecharWorkspace}
                  className="rounded-lg p-1.5 sm:p-2 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors ml-0.5 sm:ml-1 cursor-pointer"
                  title="Sair do modo tela cheia"
                  aria-label="Sair do modo tela cheia"
                >
                  <Minimize2 size={18} />
                </button>
              )}
            </div>
          </div>
        </header>

        {/*
          Conteúdo da Tela.

          O boundary fica AQUI DENTRO e não em volta da Estrutura: assim um erro
          numa tela não leva junto a barra lateral e o cabeçalho, e você
          consegue navegar para outro lugar sem recarregar a página. A `chave`
          é o caminho da rota — trocar de tela zera o erro automaticamente.
        */}
        {workspaceAberto ? (
          <WorkspaceTelaCheia />
        ) : (
          <main className="mx-auto w-full flex-1 py-4 sm:py-6 pb-24 sm:pb-8 px-3.5 sm:px-6 lg:px-8 overflow-y-auto max-w-none flex flex-col justify-between">
            <div className="flex-1 w-full">
              <LimiteDeErro chave={pathname}>{children}</LimiteDeErro>
            </div>
            {!pathname.startsWith("/jogos") && <Rodape />}
          </main>
        )}
      </div>

      {/* Navegação inferior no celular com visual dock moderno e frosted glass */}
      {!workspaceAberto && (
        <nav className="fixed bottom-0 inset-x-0 z-40 flex border-t border-border/80 bg-card/90 pb-[max(env(safe-area-inset-bottom),8px)] pt-1.5 backdrop-blur-xl sm:hidden shadow-lg">
          {abasMobile.map(({ para, rotulo, Icone }) => (
            <NavLink
              key={para}
              to={para}
              className={({ isActive }) =>
                cn(
                  "flex flex-1 flex-col items-center justify-center gap-1 py-1.5 text-[10px] font-medium transition-all min-w-0 truncate px-1 rounded-xl mx-0.5 relative group active:scale-95",
                  isActive
                    ? "text-primary font-bold bg-primary/10"
                    : "text-muted-foreground hover:text-foreground",
                )
              }
            >
              <Icone size={19} className="shrink-0 transition-transform group-active:scale-90" />
              <span className="truncate max-w-full tracking-tight">{rotulo}</span>
            </NavLink>
          ))}

          {/* Botão Mais no celular */}
          <button
            onClick={() => setGavetaAberta(true)}
            className="flex flex-1 flex-col items-center justify-center gap-1 py-1.5 text-[10px] font-medium text-muted-foreground transition-all min-w-0 truncate px-1 rounded-xl mx-0.5 hover:text-foreground active:scale-95 cursor-pointer"
            aria-label="Mais opções"
          >
            <MoreHorizontal size={19} className="shrink-0" />
            <span className="truncate max-w-full tracking-tight">Mais</span>
          </button>
        </nav>
      )}

      {/* Botão flutuante de captura no celular com sombra suave e efeito tátil */}
      {!workspaceAberto && !pathname.startsWith("/chat") && (
        <button
          onClick={() => setCapturando(true)}
          className="fixed bottom-[calc(env(safe-area-inset-bottom,0px)+68px)] right-4 z-30 flex h-13 w-13 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xl shadow-primary/25 transition-transform active:scale-90 sm:hidden cursor-pointer hover:shadow-2xl"
          aria-label="Captura rápida"
        >
          <Plus size={22} className="stroke-[2.5]" />
        </button>
      )}

      {/* Modais, Toasts e Gavetas */}
      <GavetaMais aberta={gavetaAberta} aoFechar={() => setGavetaAberta(false)} />
      <CapturaRapida
        aberta={capturando}
        textoInicial={textoCompartilhado}
        aoFechar={() => {
          setCapturando(false);
          setTextoCompartilhado("");
        }}
      />
      <Busca
        aberta={buscando || buscaGlobalAberta}
        aoFechar={() => {
          setBuscando(false);
          setBuscaGlobalAberta(false);
        }}
      />
      <ModalBuscaWeb
        aberta={buscandoWeb}
        aoFechar={() => setBuscandoWeb(false)}
      />
      <Pomodoro />
      <ToastsContainer />
    </div>
  );
}



/**
 * O app propriamente dito: barra lateral, rotas, o resto.
 *
 * Separado de `App` porque o passo a passo de boas-vindas roda fora daqui —
 * ele precisa da tela inteira, e nenhum item do menu funciona antes de
 * existir uma conexão com o GitHub.
 */
function AppInterno() {
  // Lido uma vez na montagem, e é o suficiente: este componente só monta
  // depois que o passo a passo saiu de cena, e ao sair ele já gravou.
  const [cfg] = useState(lerConfig);

  if (precisaOnboarding(cfg)) {
    return <Navigate to="/boas-vindas" replace />;
  }

  return (
    <CronometroProvider>
      <Estrutura>
        <Suspense fallback={<Carregando />}>
          <Routes>
            <Route path="/" element={<Navigate to="/home" replace />} />
            <Route path="/home" element={<Home />} />
            <Route path="/inbox" element={<Inbox />} />
            <Route path="/tarefas" element={<Tarefas />} />
            <Route path="/notas" element={<Notas />} />
            <Route path="/referencias" element={<Referencias />} />
            <Route path="/lousas" element={<Lousas />} />
            <Route path="/grafo" element={<GrafoNeural />} />
            <Route path="/pdi" element={<PDI />} />
            <Route path="/chat" element={<Chat />} />
             <Route path="/pdf" element={<FerramentasPDF />} />
            <Route path="/conversor" element={<Conversor />} />
            <Route path="/livros" element={<PesquisaLivros />} />
            <Route path="/transcritor" element={<Transcritor />} />
            <Route path="/testador" element={<TestadorHardware />} />
            <Route path="/contatos" element={<Contatos />} />
            <Route path="/noticias" element={<Noticias />} />
            <Route path="/config" element={<Configuracoes />} />
            <Route path="/sons" element={<Sons />} />
            <Route path="/jogos" element={<Jogos />} />
            <Route path="/lixeira" element={<Lixeira />} />
            <Route path="*" element={<Navigate to="/home" replace />} />
          </Routes>
        </Suspense>
      </Estrutura>
    </CronometroProvider>
  );
}

export default function App() {
  return (
    <HashRouter>
      {/*
        Boundary da raiz: a última rede antes da tela branca. Pega o que
        quebrar fora das rotas — os provedores, a barra lateral, os modais
        globais. O de dentro da <main> pega o resto.
      */}
      <LimiteDeErro>
        <WorkspaceProvider>
          <ProvedorFlutuanteGlobal>
            <ProvedorFerramentasFlutuantes>
              <Suspense fallback={<Carregando />}>
                <Routes>
                  <Route path="/boas-vindas" element={<BoasVindas />} />
                  <Route path="*" element={<AppInterno />} />
                </Routes>
              </Suspense>
            </ProvedorFerramentasFlutuantes>
          </ProvedorFlutuanteGlobal>
        </WorkspaceProvider>
        <ConsoleDesenvolvedor />
      </LimiteDeErro>
    </HashRouter>
  );
}

