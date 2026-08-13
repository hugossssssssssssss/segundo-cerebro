import { HashRouter, Routes, Route, NavLink, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  FileText,
  CheckSquare,
  Target,
  MessageCircle,
  Settings,
  Moon,
  Sun,
} from "lucide-react";
import Notas from "@/pages/Notas";
import Tarefas from "@/pages/Tarefas";
import PDI from "@/pages/PDI";
import Chat from "@/pages/Chat";
import Configuracoes from "@/pages/Configuracoes";
import { cn } from "@/lib/utils";

/**
 * HashRouter (URLs com #) em vez de BrowserRouter: o GitHub Pages não sabe
 * reescrever rotas para o index.html, então sem hash um F5 em /notas dá 404.
 */

const abas = [
  { para: "/tarefas", rotulo: "Tarefas", Icone: CheckSquare },
  { para: "/notas", rotulo: "Notas", Icone: FileText },
  { para: "/pdi", rotulo: "Carreira", Icone: Target },
  { para: "/chat", rotulo: "Conversar", Icone: MessageCircle },
  { para: "/config", rotulo: "Ajustes", Icone: Settings },
];

function BotaoTema() {
  const [escuro, setEscuro] = useState(
    () => localStorage.getItem("tema") === "escuro",
  );

  useEffect(() => {
    document.documentElement.classList.toggle("dark", escuro);
    localStorage.setItem("tema", escuro ? "escuro" : "claro");
  }, [escuro]);

  return (
    <button
      onClick={() => setEscuro((v) => !v)}
      className="rounded-lg p-2 hover:bg-accent transition-colors"
      title={escuro ? "Modo claro" : "Modo escuro"}
    >
      {escuro ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}

function Estrutura({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh flex flex-col">
      <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 h-14">
          <span className="font-semibold tracking-tight">Segundo Cérebro</span>
          <div className="flex items-center gap-1">
            {/* Navegação no topo (desktop) */}
            <nav className="hidden sm:flex items-center gap-1 mr-2">
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
            <BotaoTema />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 pb-24 sm:pb-6">
        {children}
      </main>

      {/* Navegação inferior (celular) — polegar alcança */}
      <nav className="fixed bottom-0 inset-x-0 z-40 flex border-t border-border bg-background/95 backdrop-blur sm:hidden">
        {abas.map(({ para, rotulo, Icone }) => (
          <NavLink
            key={para}
            to={para}
            className={({ isActive }) =>
              cn(
                "flex flex-1 flex-col items-center gap-1 py-3 text-xs font-medium transition-colors",
                isActive ? "text-primary" : "text-muted-foreground",
              )
            }
          >
            <Icone size={20} />
            {rotulo}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

export default function App() {
  return (
    <HashRouter>
      <Estrutura>
        <Routes>
          <Route path="/" element={<Navigate to="/tarefas" replace />} />
          <Route path="/tarefas" element={<Tarefas />} />
          <Route path="/notas" element={<Notas />} />
          <Route path="/pdi" element={<PDI />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/config" element={<Configuracoes />} />
          <Route path="*" element={<Navigate to="/tarefas" replace />} />
        </Routes>
      </Estrutura>
    </HashRouter>
  );
}
