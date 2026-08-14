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
  Settings,
  Search,
  Moon,
  Sun,
  Home as HomeIcon,
  Plus,
  PanelLeft,
  MoreHorizontal,
} from "lucide-react";
import { ProvedorFlutuanteGlobal } from "@/components/ItemFlutuanteContext";
import { Busca } from "@/components/Busca";
import { CapturaRapida } from "@/components/CapturaRapida";
import { NavegacaoLateral } from "@/components/NavegacaoLateral";
import { GavetaMais } from "@/components/GavetaMais";
import { Carregando } from "@/components/ui";
import { cn } from "@/lib/utils";

/**
 * HashRouter (URLs com #) em vez de BrowserRouter: o GitHub Pages não sabe
 * reescrever rotas para o index.html, então sem hash um F5 em /notas dá 404.
 */
const Home = lazy(() => import("@/pages/Home"));
const Tarefas = lazy(() => import("@/pages/Tarefas"));
const Notas = lazy(() => import("@/pages/Notas"));
const Referencias = lazy(() => import("@/pages/Referencias"));
const Lousas = lazy(() => import("@/pages/Lousas"));
const PDI = lazy(() => import("@/pages/PDI"));
const Chat = lazy(() => import("@/pages/Chat"));
const FerramentasPDF = lazy(() => import("@/pages/FerramentasPDF"));
const Conversor = lazy(() => import("@/pages/Conversor"));
const Transcritor = lazy(() => import("@/pages/Transcritor"));
const Configuracoes = lazy(() => import("@/pages/Configuracoes"));



const abasMobile = [
  { para: "/home", rotulo: "Início", Icone: HomeIcon },
  { para: "/tarefas", rotulo: "Tarefas", Icone: CheckSquare },
  { para: "/notas", rotulo: "Notas", Icone: FileText },
  { para: "/chat", rotulo: "Conversar", Icone: MessageCircle },
];

function BotaoTema() {
  const [escuro, setEscuro] = useState(() => {
    const salvo = localStorage.getItem("tema");
    if (salvo) return salvo === "escuro";
    return matchMedia("(prefers-color-scheme: dark)").matches;
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", escuro);
    localStorage.setItem("tema", escuro ? "escuro" : "claro");
  }, [escuro]);

  return (
    <button
      onClick={() => setEscuro((v) => !v)}
      className="rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
      title={escuro ? "Modo claro" : "Modo escuro"}
      aria-label={escuro ? "Mudar para modo claro" : "Mudar para modo escuro"}
    >
      {escuro ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}

function Estrutura({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  const [buscando, setBuscando] = useState(false);
  const [capturando, setCapturando] = useState(false);
  const [gavetaAberta, setGavetaAberta] = useState(false);
  const [textoCompartilhado, setTextoCompartilhado] = useState("");

  const [colapsada, setColapsada] = useState(() => {
    const salvo = localStorage.getItem("sidebar-colapsada");
    return salvo ? salvo === "true" : true;
  });

  useEffect(() => {
    localStorage.setItem("sidebar-colapsada", String(colapsada));
  }, [colapsada]);

  // ⌘K busca, ⌘J captura, ⌘B toggle da barra lateral
  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return;
      const tecla = e.key.toLowerCase();
      if (tecla === "k") {
        e.preventDefault();
        setBuscando(true);
      } else if (tecla === "j") {
        e.preventDefault();
        setCapturando(true);
      } else if (tecla === "b") {
        e.preventDefault();
        setColapsada((v) => !v);
      }
    };
    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
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
            {/* Lado Esquerdo: Toggle e Logo */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (window.innerWidth < 640) {
                    setGavetaAberta(true);
                  } else {
                    setColapsada((v) => !v);
                  }
                }}
                className="rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                title="Alternar navegação (⌘B)"
                aria-label="Alternar barra lateral"
              >
                <PanelLeft size={18} />
              </button>

              <NavLink to="/home" className="font-semibold tracking-tight text-sm sm:text-base">
                Segundo Cérebro
              </NavLink>
            </div>



            {/* Lado Direito: Ações Rápida e Configurações */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCapturando(true)}
                className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                title="Captura rápida (⌘J)"
                aria-label="Captura rápida"
              >
                <Plus size={18} />
              </button>

              <button
                onClick={() => setBuscando(true)}
                className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                title="Buscar (⌘K)"
                aria-label="Buscar"
              >
                <Search size={18} />
              </button>

              <NavLink
                to="/config"
                className={({ isActive }) =>
                  cn(
                    "rounded-lg p-2 transition-colors hidden sm:block",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground",
                  )
                }
                title="Ajustes"
                aria-label="Ajustes"
              >
                <Settings size={18} />
              </NavLink>

              <div className="hidden sm:block">
                <BotaoTema />
              </div>
            </div>
          </div>
        </header>

        {/* Conteúdo da Tela */}
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 sm:px-6 py-8 pb-28 sm:pb-8">
          {children}
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

      {/* Modais e Gavetas */}
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



export default function App() {
  return (
    <HashRouter>
      <ProvedorFlutuanteGlobal>
        <Estrutura>
          <Suspense fallback={<Carregando />}>
            <Routes>
              <Route path="/" element={<Navigate to="/home" replace />} />
              <Route path="/home" element={<Home />} />
              <Route path="/tarefas" element={<Tarefas />} />
              <Route path="/notas" element={<Notas />} />
              <Route path="/referencias" element={<Referencias />} />
              <Route path="/lousas" element={<Lousas />} />
              <Route path="/pdi" element={<PDI />} />
              <Route path="/chat" element={<Chat />} />
              <Route path="/pdf" element={<FerramentasPDF />} />
              <Route path="/conversor" element={<Conversor />} />
              <Route path="/transcritor" element={<Transcritor />} />
              <Route path="/config" element={<Configuracoes />} />
              <Route path="*" element={<Navigate to="/home" replace />} />
            </Routes>
          </Suspense>
        </Estrutura>
      </ProvedorFlutuanteGlobal>
    </HashRouter>
  );
}

