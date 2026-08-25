import { Search, Plus, Minimize2, Sparkles } from "lucide-react";
import { Botao } from "@/components/ui";
import { useWorkspace } from "./WorkspaceContext";

export function WorkspaceVazio() {
  const { setBuscaGlobalAberta, fecharWorkspace, abrirNoWorkspace } = useWorkspace();

  const criarNovaNota = () => {
    abrirNoWorkspace({
      rotuloTipo: "Nota",
      titulo: "Nova nota",
      corpo: "",
      dadosProps: { tipo: "nota", tags: [] },
      camposFixosProps: {
        tipo: { tipo: "select", opcoes: ["nota", "referencia", "rascunho"] },
        tags: { tipo: "multiselect" },
      },
    });
  };

  return (
    <div className="flex flex-1 flex-col items-center justify-center p-6 sm:p-12 text-center animate-in fade-in zoom-in-95 duration-200">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-4 shadow-inner">
        <Sparkles size={28} />
      </div>

      <h2 className="text-xl font-bold text-foreground">Workspace em Tela Cheia</h2>
      <p className="text-sm text-muted-foreground max-w-md mt-1.5 mb-6">
        Todas as abas foram fechadas. Você pode pesquisar qualquer documento ou criar uma nova nota para continuar trabalhando sem sair do modo tela cheia.
      </p>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Botao
          variante="primario"
          onClick={() => setBuscaGlobalAberta(true)}
          className="gap-2 shadow-md"
        >
          <Search size={15} />
          <span>Pesquisar Documentos (⌘K)</span>
        </Botao>

        <Botao
          variante="neutro"
          onClick={criarNovaNota}
          className="gap-2"
        >
          <Plus size={15} />
          <span>Criar Nova Nota</span>
        </Botao>

        <Botao
          variante="fantasma"
          onClick={fecharWorkspace}
          className="gap-2 text-muted-foreground"
        >
          <Minimize2 size={15} />
          <span>Sair da Tela Cheia</span>
        </Botao>
      </div>
    </div>
  );
}
