import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { ModalVincularDocumentoAvancado } from "./ModalVincularDocumentoAvancado";
import { type DocumentoVinculavel } from "@/lib/vincularDocumentos";

describe("ModalVincularDocumentoAvancado", () => {
  afterEach(() => {
    cleanup();
  });
  const docsFalsos: DocumentoVinculavel[] = [
    {
      caminho: "tarefas/entregar-briefing.md",
      titulo: "Entregar Briefing",
      categoria: "tarefas",
      categoriaRotulo: "Tarefa",
      subpastaOuStatus: "a_fazer",
      subpastaOuStatusRotulo: "A Fazer",
      tags: ["design", "nitro"],
      snippet: "Revisar briefing com cliente",
    },
    {
      caminho: "notas/Projetos/sistema-design.md",
      titulo: "Sistema de Design",
      categoria: "notas",
      categoriaRotulo: "Nota",
      subpastaOuStatus: "Projetos",
      subpastaOuStatusRotulo: "Projetos",
      tags: ["design"],
      snippet: "Paleta e tipografia",
    },
    {
      caminho: "pdi/metas/estudar-ia.md",
      titulo: "Estudar IA",
      categoria: "pdi",
      categoriaRotulo: "Meta PDI",
      subpastaOuStatus: "metas_ativas",
      subpastaOuStatusRotulo: "Metas Ativas",
      tags: ["estudos"],
      snippet: "Aprofundar em LLMs",
    },
  ];

  it("renderiza lista de documentos quando aberto", () => {
    render(
      <ModalVincularDocumentoAvancado
        aberto={true}
        aoFechar={vi.fn()}
        documentos={docsFalsos}
        aoSelecionar={vi.fn()}
      />
    );

    expect(screen.getByText("@Entregar Briefing")).toBeDefined();
    expect(screen.getByText("@Sistema de Design")).toBeDefined();
    expect(screen.getByText("@Estudar IA")).toBeDefined();
  });

  it("filtra por busca no campo de texto", () => {
    render(
      <ModalVincularDocumentoAvancado
        aberto={true}
        aoFechar={vi.fn()}
        documentos={docsFalsos}
        aoSelecionar={vi.fn()}
      />
    );

    const input = screen.getByPlaceholderText("Buscar documento para vincular...");
    fireEvent.change(input, { target: { value: "briefing" } });

    expect(screen.getByText("@Entregar Briefing")).toBeDefined();
    expect(screen.queryByText("@Sistema de Design")).toBeNull();
  });

  it("chama aoSelecionar quando um documento é clicado", () => {
    const aoSelecionar = vi.fn();
    const aoFechar = vi.fn();

    render(
      <ModalVincularDocumentoAvancado
        aberto={true}
        aoFechar={aoFechar}
        documentos={docsFalsos}
        aoSelecionar={aoSelecionar}
      />
    );

    const docItem = screen.getByText("@Entregar Briefing");
    fireEvent.click(docItem);

    expect(aoSelecionar).toHaveBeenCalledWith(docsFalsos[0]);
    expect(aoFechar).toHaveBeenCalled();
  });
});
