import { HashRouter, Routes, Route, NavLink, Navigate } from "react-router-dom";
import { Suspense, lazy, useEffect, useState } from "react";
import {
  CheckSquare,
  FileText,
  Image,
  Target,
  MessageCircle,
  Settings,
  Search,
  Moon,
  Sun,
  Home as HomeIcon,
  Plus,
} from "lucide-react";
import { Busca } from "@/components/Busca";
import { CapturaRapida } from "@/components/CapturaRapida";
import { Carregando } from "@/components/ui";
import { cn } from "@/lib/utils";

/**
 * HashRouter (URLs com #) em vez de BrowserRouter: o GitHub Pages não sabe
 * reescrever rotas para o index.html, então sem hash um F5 em /notas dá 404.
 *
 * As telas são carregadas sob demanda: antes, o app mandava 1,4 MB de
 * JavaScript no primeiro acesso — incluindo o editor de Markdown, que só é
 * usado ao abrir uma nota. No 4G isso era a diferença entre abrir e desistir.
 */
const Home = lazy(() => import("@/pages/Home"));
const Tarefas = lazy(() => import("@/pages/Tarefas"));
const Notas = lazy(() => import("@/pages/Notas"));
const Referencias = lazy(() => import("@/pages/Referencias"));
const PDI = lazy(() => import("@/pages/PDI"));
const Chat = lazy(() => import("@/pages/Chat"));
const Configuracoes = lazy(() => import("@/pages/Configuracoes"));

// As cinco de uso diário ficam no rodapé do celular. Ajustes não entra:
// é tela de configurar uma vez, não destino do dia a dia.
const abas = [
  { para: "/home", rotulo: "Início", Icone: HomeIcon },
  { para: "/tarefas", rotulo: "Tarefas", Icone: CheckSquare },
  { para: "/notas", rotulo: "Notas", Icone: FileText },
  { para: "/referencias", rotulo: "Refs", Icone: Image },
  { para: "/pdi", rotulo: "Carreira", Icone: Target },
  { para: "/chat", rotulo: "Conversar", Icone: MessageCircle },
];

function BotaoTema() {
  const [escuro, setEscuro] = useState(() => {
    const salvo = localStorage.getItem("tema");
    if (salvo) return salvo === "escuro";
    // sem preferência salva, segue o sistema em vez de forçar claro
    return matchMedia("(prefers-color-scheme: dark)").matches;
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", escuro);
    localStorage.setItem("tema", escuro ? "escuro" : "claro");
  }, [escuro]);

  return (
    <button
      onClick={() => setEscuro((v) => !v)}
      className="rounded-lg p-2 hover:bg-accent transition-colors"
      title={escuro ? "Modo claro" : "Modo escuro"}
      aria-label={escuro ? "Mudar para modo claro" : "Mudar para modo escuro"}
    >
      {escuro ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}

function Estrutura({ children }: { children: React.ReactNode }) {
  const [buscando, setBuscando] = useState(false);
  const [capturando, setCapturando] = useState(false);
  const [textoCompartilhado, setTextoCompartilhado] = useState("");

  // ⌘K busca, ⌘J captura — convenções que todo mundo já conhece
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
      }
    };
    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
  }, []);

  /**
   * Compartilhar de outro app do Android cai aqui.
   *
   * O manifest declara share_target apontando para #/?compartilhado=...,
   * então o texto chega pela URL e abre a captura já preenchida.
   */
  useEffect(() => {
    // O manifest usa action "./" com method GET, entao o Android entrega os
    // dados na QUERY STRING, nao no hash. Lia so o hash, e por isso o
    // compartilhamento nunca disparou. Agora aceita os dois.
    const params = new URLSearchParams(
      location.search.slice(1) || location.hash.split("?")[1] || "",
    );
    const vindo = [params.get("titulo"), params.get("texto"), params.get("url")]
      .filter(Boolean)
      .join("\n");
    if (vindo) {
      setTextoCompartilhado(vindo);
      setCapturando(true);
      // limpa a URL sem brigar com o HashRouter
      history.replaceState(null, "", location.pathname + "#/tarefas");
    }
  }, []);

  return (
    <div className="min-h-dvh flex flex-col">
      <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 h-14">
          <NavLink to="/tarefas" className="font-semibold tracking-tight">
            Segundo Cérebro
          </NavLink>

          <div className="flex items-center gap-1">
            <nav className="hidden sm:flex items-center gap-1 mr-1">
              {abas.map(({ para, rotulo, Icone }) => (
                <NavLink
                  key={para}
                  to={para}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground",
                    )
                  }
                >
                  <Icone size={16} />
                  {rotulo}
                </NavLink>
              ))}
            </nav>

            <button
              onClick={() => setCapturando(true)}
              className="hidden rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground sm:block"
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
                  "rounded-lg p-2 transition-colors",
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
            <BotaoTema />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 pb-24 sm:pb-6">
        {children}
      </main>

      {/* Navegação inferior no celular — onde o polegar alcança */}
      <nav className="fixed bottom-0 inset-x-0 z-40 flex border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden">
        {abas.map(({ para, rotulo, Icone }) => (
          <NavLink
            key={para}
            to={para}
            className={({ isActive }) =>
              cn(
                "flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors",
                isActive ? "text-primary" : "text-muted-foreground",
              )
            }
          >
            <Icone size={19} />
            {rotulo}
          </NavLink>
        ))}
      </nav>

      {/* Botão flutuante de captura no celular, acima da barra de abas */}
      <button
        onClick={() => setCapturando(true)}
        className="fixed bottom-32 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform active:scale-95 sm:hidden"
        aria-label="Captura rápida"
      >
        <Plus size={24} />
      </button>

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
      <Estrutura>
        <Suspense fallback={<Carregando />}>
          <Routes>
            <Route path="/" element={<Navigate to="/home" replace />} />
            <Route path="/home" element={<Home />} />
            <Route path="/tarefas" element={<Tarefas />} />
            <Route path="/notas" element={<Notas />} />
            <Route path="/referencias" element={<Referencias />} />
            <Route path="/pdi" element={<PDI />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/config" element={<Configuracoes />} />
            <Route path="*" element={<Navigate to="/home" replace />} />
          </Routes>
        </Suspense>
      </Estrutura>
    </HashRouter>
  );
}
