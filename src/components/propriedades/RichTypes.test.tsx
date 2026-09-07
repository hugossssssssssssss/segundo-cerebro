import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  FormatadorNumero,
  formatarValorNumerico,
} from "./FormatadorNumero";
import { SeletorDataAvancada } from "./SeletorDataAvancada";
import {
  EditorStatusNotion,
  SeletorBadgeStatus,
  STATUS_NOTION_PADRAO,
  type ItemStatusNotion,
} from "./GerenciadorStatusNotion";

describe("FormatadorNumero", () => {
  it("formata valores para moedas, porcentagens e unidades", () => {
    expect(formatarValorNumerico(1250.5, { formato: "moeda_brl" })).toContain("1.250,50");
    expect(formatarValorNumerico(99.9, { formato: "moeda_usd" })).toContain("99.90");
    expect(formatarValorNumerico(75, { formato: "porcentagem" })).toBe("75%");
    expect(formatarValorNumerico(42, { formato: "unidade", unidade: "kg" })).toBe("42 kg");
    expect(formatarValorNumerico(null as any)).toBe("");
  });

  it("renderiza modo número e permite edição", () => {
    const aoMudar = vi.fn();
    render(<FormatadorNumero valor={100} config={{ formato: "moeda_brl" }} aoMudar={aoMudar} />);

    const botao = screen.getByRole("button");
    expect(botao.textContent).toContain("100,00");

    fireEvent.click(botao);
    const input = screen.getByRole("spinbutton");
    fireEvent.change(input, { target: { value: "250" } });
    fireEvent.blur(input);

    expect(aoMudar).toHaveBeenCalledWith(250);
  });

  it("renderiza visualização de barra de progresso", () => {
    const aoMudar = vi.fn();
    const { container } = render(
      <FormatadorNumero
        valor={50}
        config={{ visualizacao: "barra", maximo: 100, corBarra: "azul" }}
        aoMudar={aoMudar}
      />
    );

    expect(screen.getByText("50")).toBeDefined();
    const barra = container.querySelector(".bg-blue-500");
    expect(barra).not.toBeNull();
  });

  it("renderiza visualização de anel circular", () => {
    const aoMudar = vi.fn();
    const { container } = render(
      <FormatadorNumero
        valor={75}
        config={{ visualizacao: "anel", maximo: 100, corBarra: "verde" }}
        aoMudar={aoMudar}
      />
    );

    expect(screen.getByText("75")).toBeDefined();
    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();
  });
});

describe("SeletorDataAvancada", () => {
  it("renderiza trigger e abre painel de data com intervalo e horário", () => {
    const aoSalvar = vi.fn();
    const aoMudarAberto = vi.fn();
    render(
      <SeletorDataAvancada
        dados={{
          dataInicio: "2026-09-07",
          dataFim: "2026-09-10",
          horario: "14:30",
          lembrete: "1-hora",
        }}
        aoSalvar={aoSalvar}
        aberto={true}
        aoMudarAberto={aoMudarAberto}
      >
        <button data-testid="trigger-data-avancada">07/09/2026 → 10/09/2026</button>
      </SeletorDataAvancada>
    );

    expect(screen.getByTestId("trigger-data-avancada")).toBeDefined();
    expect(screen.getByText("Incluir data final (intervalo)")).toBeDefined();
    expect(screen.getByText("Incluir horário")).toBeDefined();
    expect(screen.getByText("Lembrete")).toBeDefined();
  });
});

describe("GerenciadorStatusNotion & SeletorBadgeStatus", () => {
  it("renderiza badge com a cor do status selecionado", () => {
    const aoSelecionar = vi.fn();
    const aoMudarAberto = vi.fn();
    render(
      <SeletorBadgeStatus
        valorAtual="fazendo"
        aoSelecionar={aoSelecionar}
        aberto={false}
        aoMudarAberto={aoMudarAberto}
      />
    );

    const badges = screen.getAllByText("Em andamento");
    expect(badges.length).toBeGreaterThan(0);
  });

  it("permite adicionar e editar status agrupados", () => {
    const aoSalvarLista = vi.fn();
    const statusLista: ItemStatusNotion[] = [...STATUS_NOTION_PADRAO];

    render(
      <EditorStatusNotion
        statusLista={statusLista}
        aoSalvarLista={aoSalvarLista}
      />
    );

    expect(screen.getAllByText("Não Iniciado").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Em Progresso").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Concluído").length).toBeGreaterThan(0);

    // Adicionar novo status
    const input = screen.getByPlaceholderText("Nome do status...");
    fireEvent.change(input, { target: { value: "Aguardando aprovação" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(aoSalvarLista).toHaveBeenCalled();
    const chamada = aoSalvarLista.mock.calls[0][0];
    expect(chamada.some((s: ItemStatusNotion) => s.rotulo === "Aguardando aprovação")).toBe(true);
  });
});
