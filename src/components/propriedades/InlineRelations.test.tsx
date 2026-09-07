import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CelulaPropriedadeInline } from "./CelulaPropriedadeInline";
import { SeletorRelacaoNotion, type ItemRelacionavel } from "./SeletorRelacaoNotion";
import { ResumoRelacaoRollup, type ItemVinculadoDetalhe, type MencaoBacklink } from "./ResumoRelacaoRollup";

describe("CelulaPropriedadeInline", () => {
  it("renderiza célula de texto e permite edição inline", () => {
    const aoSalvar = vi.fn();
    render(
      <CelulaPropriedadeInline
        chave="titulo"
        tipo="texto"
        valor="Design System"
        aoSalvar={aoSalvar}
      />
    );

    const el = screen.getByText("Design System");
    expect(el).toBeDefined();

    fireEvent.click(el);
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "Design System V2" } });
    fireEvent.blur(input);

    expect(aoSalvar).toHaveBeenCalledWith("Design System V2");
  });

  it("renderiza célula de checkbox e dispara alternância", () => {
    const aoSalvar = vi.fn();
    render(
      <CelulaPropriedadeInline
        chave="feito"
        tipo="checkbox"
        valor={false}
        aoSalvar={aoSalvar}
      />
    );

    const checkbox = screen.getByRole("checkbox");
    expect((checkbox as HTMLInputElement).checked).toBe(false);

    fireEvent.click(checkbox);
    expect(aoSalvar).toHaveBeenCalledWith(true);
  });

  it("renderiza célula de data com trigger de popover", () => {
    const aoSalvar = vi.fn();
    render(
      <CelulaPropriedadeInline
        chave="prazo"
        tipo="data"
        valor="2026-09-07"
        aoSalvar={aoSalvar}
      />
    );

    const trigger = screen.getByTestId("trigger-celula-data");
    expect(trigger).toBeDefined();
    expect(trigger.textContent).toContain("07 de set, 2026");
  });
});

describe("SeletorRelacaoNotion", () => {
  const opcoesExemplo: ItemRelacionavel[] = [
    { caminho: "notas/briefing.md", titulo: "Briefing Projeto", tipo: "nota" },
    { caminho: "tarefas/layout.md", titulo: "Criar Layout Figma", tipo: "tarefa" },
    { caminho: "pdi/metas/lideranca.md", titulo: "Meta Liderança", tipo: "meta" },
  ];

  it("renderiza itens relacionados e permite alternar/desvincular", () => {
    const aoAlternar = vi.fn();
    const aoMudarAberto = vi.fn();

    render(
      <SeletorRelacaoNotion
        relacionamentos={["Briefing Projeto"]}
        opcoesDisponiveis={opcoesExemplo}
        aoAlternarRelacao={aoAlternar}
        aberto={false}
        aoMudarAberto={aoMudarAberto}
      />
    );

    expect(screen.getByText("Briefing Projeto")).toBeDefined();

    // Desvincular item clicando no X
    const botaoDesvincular = screen.getByTitle("Desvincular Briefing Projeto");
    fireEvent.click(botaoDesvincular);
    expect(aoAlternar).toHaveBeenCalledWith("Briefing Projeto");
  });

  it("filtra itens por busca e exibe botão de criação rápida", () => {
    const aoCriarNovoItem = vi.fn();
    const aoAlternar = vi.fn();

    render(
      <SeletorRelacaoNotion
        relacionamentos={[]}
        opcoesDisponiveis={opcoesExemplo}
        aoAlternarRelacao={aoAlternar}
        aoCriarNovoItem={aoCriarNovoItem}
        aberto={true}
        aoMudarAberto={vi.fn()}
      />
    );

    const inputBusca = screen.getByPlaceholderText("Buscar nota, tarefa, meta...");
    fireEvent.change(inputBusca, { target: { value: "Nova Tarefa Inexistente" } });

    expect(screen.getByText(/Criar novo item vinculado/i)).toBeDefined();
    const botaoCriarTarefa = screen.getByText(/\+ Tarefa: "Nova Tarefa Inexistente"/i);
    expect(botaoCriarTarefa).toBeDefined();

    fireEvent.click(botaoCriarTarefa);
    expect(aoCriarNovoItem).toHaveBeenCalledWith("Nova Tarefa Inexistente", "tarefa");
  });
});

describe("ResumoRelacaoRollup", () => {
  it("calcula taxa de progresso para tarefas vinculadas e renderiza backlinks", () => {
    const vinculados: ItemVinculadoDetalhe[] = [
      { caminho: "tarefas/1.md", titulo: "Tarefa 1", tipo: "tarefa", status: "feito", concluido: true },
      { caminho: "tarefas/2.md", titulo: "Tarefa 2", tipo: "tarefa", status: "a-fazer", concluido: false },
    ];
    const backlinks: MencaoBacklink[] = [
      { caminho: "notas/reuniao.md", titulo: "Ata de Reunião", tipo: "nota" },
    ];

    render(
      <ResumoRelacaoRollup
        itensVinculados={vinculados}
        mencoesBacklinks={backlinks}
      />
    );

    expect(screen.getByText("Progresso das Tarefas Vinculadas")).toBeDefined();
    expect(screen.getByText("1/2 (50%)")).toBeDefined();
    expect(screen.getByText("Mencionado em (1)")).toBeDefined();
    expect(screen.getByText("Ata de Reunião")).toBeDefined();
  });

  it("não renderiza nada se não houver vínculos ou backlinks", () => {
    const { container } = render(
      <ResumoRelacaoRollup
        itensVinculados={[]}
        mencoesBacklinks={[]}
      />
    );

    expect(container.firstChild).toBeNull();
  });
});
