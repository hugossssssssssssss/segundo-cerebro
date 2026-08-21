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
  Bell,
} from "lucide-react";
import { ProvedorFlutuanteGlobal } from "@/components/ItemFlutuanteContext";
import { ProvedorFerramentasFlutuantes } from "@/components/ContextoFerramentasFlutuantes";
import { Busca } from "@/components/Busca";
import { CapturaRapida } from "@/components/CapturaRapida";
import { ToastsContainer } from "@/components/ToastsContainer";
import { NavegacaoLateral } from "@/components/NavegacaoLateral";
import { LimiteDeErro } from "@/components/LimiteDeErro";
import { toast } from "@/lib/toast";
import { GavetaMais } from "@/components/GavetaMais";
import { LogoKlaus } from "@/components/LogoKlaus";
import { Carregando } from "@/components/ui";
import { cn } from "@/lib/utils";
import { lerConfig, configCompleta, precisaOnboarding } from "@/lib/settings";
import { carregarRepo } from "@/lib/repo";
import { carregarEstadoInbox, compilarItensInbox } from "@/lib/inbox";
import { sincronizarFilaOffline as syncOffline } from "@/lib/offlineQueue";
import { gerenciadorCamadas, NIVEIS_CAMADAS } from "@/lib/camadas";
import { ConsoleDesenvolvedor } from "@/components/ConsoleDesenvolvedor";
import { inicializarLogger } from "@/lib/logger";

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
const Processos = lazy(() => import("@/pages/Processos"));
const Contatos = lazy(() => import("@/pages/Contatos"));
const Noticias = lazy(() => import("@/pages/Noticias"));
const Configuracoes = lazy(() => import("@/pages/Configuracoes"));
const BoasVindas = lazy(() => import("@/pages/BoasVindas"));
const PesquisaLivros = lazy(() => import("@/pages/PesquisaLivros"));



const abasMobile = [
  { para: "/home", rotulo: "Início", Icone: HomeIcon },
  { para: "/tarefas", rotulo: "Tarefas", Icone: CheckSquare },
  { para: "/notas", rotulo: "Notas", Icone: FileText },
  { para: "/chat", rotulo: "Conversar", Icone: MessageCircle },
];

function Estrutura({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  const [buscando, setBuscando] = useState(false);
  const [capturando, setCapturando] = useState(false);
  const [gavetaAberta, setGavetaAberta] = useState(false);
  const [textoCompartilhado, setTextoCompartilhado] = useState("");

  const [colapsada, setColapsada] = useState(() => {
    const salvo = localStorage.getItem("sidebar-colapsada");
    return salvo ? salvo === "true" : false;
  });

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
        setColapsada((v) => !v);
      }
    };
    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
  }, []);

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
   * Agora roda uma vez ao abrir e depois só quando o acervo realmente muda —
   * que é o único momento em que o número pode ter mudado. O `memoria` faz a
   * carga reaproveitar o que `repo.ts` já tem em mãos.
   */
  useEffect(() => {
    let cancelado = false;

    const atualizarTituloBadge = async () => {
      const cfg = lerConfig();
      if (!configCompleta(cfg)) return;
      try {
        const [todos, estadoRes] = await Promise.all([
          carregarRepo(cfg, { memoria: 30_000 }),
          carregarEstadoInbox(cfg),
        ]);
        if (cancelado) return;
        const itens = compilarItensInbox(todos, estadoRes.mapa);
        const naoVistos = itens.filter((i) => !i.visto).length;
        document.title =
          naoVistos > 0
            ? `(${naoVistos}) Klaus - Caixa de Entrada`
            : "Klaus - Segundo Cérebro";
      } catch {
        // um badge que falha não pode atrapalhar o resto do app
      }
    };

    atualizarTituloBadge();
    window.addEventListener("acervo-atualizado", atualizarTituloBadge);
    return () => {
      cancelado = true;
      window.removeEventListener("acervo-atualizado", atualizarTituloBadge);
    };
  }, []);

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
    <div className="min-h-dvh flex bg-background text-foreground">
      {/* Navegação Lateral (Desktop) */}
      <NavegacaoLateral
        colapsada={colapsada}
        setColapsada={setColapsada}
        className="hidden sm:flex sticky top-0 h-dvh"
      />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Cabeçalho Principal (Topbar Limpa) */}
        <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 sm:px-6 h-14">
            {/* Lado Esquerdo: Logo no Mobile */}
            <div className="flex items-center gap-2">
              <NavLink to="/home" className="flex sm:hidden items-center gap-2 font-bold tracking-tight text-sm hover:opacity-90 transition-opacity">
                <LogoKlaus tamanho={24} />
                <span>Klaus</span>
              </NavLink>
            </div>

            {/* Lado Direito: Captura Rápida, Inbox e Busca */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCapturando(true)}
                className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                title="Captura rápida (⌘J)"
                aria-label="Captura rápida"
              >
                <Plus size={18} />
              </button>

              <NavLink
                to="/inbox"
                className={({ isActive }) =>
                  cn(
                    "rounded-lg p-2 transition-colors relative",
                    isActive
                      ? "bg-primary/10 text-primary font-semibold"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground",
                  )
                }
                title="Caixa de Entrada"
                aria-label="Caixa de Entrada"
              >
                <Bell size={18} />
              </NavLink>

              <button
                onClick={() => setBuscando(true)}
                className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                title="Buscar (⌘K)"
                aria-label="Buscar"
              >
                <Search size={18} />
              </button>
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
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 sm:px-6 py-8 pb-28 sm:pb-8">
          <LimiteDeErro chave={pathname}>{children}</LimiteDeErro>
        </main>
      </div>

      {/* Navegação inferior no celular */}
      <nav className="fixed bottom-0 inset-x-0 z-40 flex border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden">
        {abasMobile.map(({ para, rotulo, Icone }) => (
          <NavLink
            key={para}
            to={para}
            className={({ isActive }) =>
              cn(
                "flex flex-1 flex-col items-center justify-center gap-1 py-2 text-[10px] font-medium transition-colors min-w-0 truncate px-0.5",
                isActive ? "text-primary font-semibold" : "text-muted-foreground",
              )
            }
          >
            <Icone size={18} className="shrink-0" />
            <span className="truncate max-w-full">{rotulo}</span>
          </NavLink>
        ))}

        {/* Botão Mais no celular */}
        <button
          onClick={() => setGavetaAberta(true)}
          className="flex flex-1 flex-col items-center justify-center gap-1 py-2 text-[10px] font-medium text-muted-foreground transition-colors min-w-0 truncate px-0.5"
          aria-label="Mais opções"
        >
          <MoreHorizontal size={18} className="shrink-0" />
          <span className="truncate max-w-full">Mais</span>
        </button>
      </nav>

      {/* Botão flutuante de captura no celular */}
      {!pathname.startsWith("/chat") && (
        <button
          onClick={() => setCapturando(true)}
          className="fixed bottom-20 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform active:scale-95 sm:hidden"
          aria-label="Captura rápida"
        >
          <Plus size={24} />
        </button>
      )}

      {/* Modais, Toasts e Gavetas */}
      <ToastsContainer />
      <GavetaMais aberta={gavetaAberta} aoFechar={() => setGavetaAberta(false)} />
      <Busca aberta={buscando} aoFechar={() => setBuscando(false)} />
      <CapturaRapida
        aberta={capturando}
        textoInicial={textoCompartilhado}
        aoFechar={() => {
          setCapturando(false);
          setTextoCompartilhado("");
        }}
      />
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
          <Route path="/processos" element={<Processos />} />
          <Route path="/contatos" element={<Contatos />} />
          <Route path="/noticias" element={<Noticias />} />
          <Route path="/config" element={<Configuracoes />} />
          <Route path="*" element={<Navigate to="/home" replace />} />
        </Routes>
      </Suspense>
    </Estrutura>
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
      <ConsoleDesenvolvedor />
      </LimiteDeErro>
    </HashRouter>
  );
}

