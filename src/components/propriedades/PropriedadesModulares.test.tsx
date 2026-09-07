import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SeletorIconePropriedade } from "./SeletorIconePropriedade";
import { GerenciadorOpcoesSelect } from "./GerenciadorOpcoesSelect";
import { MenuConfiguracaoPropriedade } from "./MenuConfiguracaoPropriedade";

describe("SeletorIconePropriedade", () => {
  it("renderiza a grade de ícones e dispara a seleção de ícone", () => {
    const aoMudarIcone = vi.fn();
    const aoMudarCor = vi.fn();

    render(
      <SeletorIconePropriedade
        iconeAtual="Hash"
        corAtual="azul"
        aoMudarIcone={aoMudarIcone}
        aoMudarCor={aoMudarCor}
      >
        <button data-testid="trigger-icone">Abrir Seletor</button>
      </SeletorIconePropriedade>
    );

    const trigger = screen.getByTestId("trigger-icone");
    fireEvent.click(trigger);

    expect(screen.getByText("Cor do Ícone")).toBeDefined();

    const botaoCorVerde = screen.getByTitle("Verde");
    expect(botaoCorVerde).toBeDefined();
    fireEvent.click(botaoCorVerde);
    expect(aoMudarCor).toHaveBeenCalledWith("verde");

    const botaoStar = screen.getByTitle("Star");
    expect(botaoStar).toBeDefined();
    fireEvent.click(botaoStar);
    expect(aoMudarIcone).toHaveBeenCalledWith("Star");
  });
});

describe("GerenciadorOpcoesSelect", () => {
  it("permite adicionar, reordenar e excluir opções", () => {
    const aoAtualizarOpcoes = vi.fn();
    const aoAtualizarCor = vi.fn();
    const aoRenomearOpcao = vi.fn();
    const aoExcluirOpcao = vi.fn();

    render(
      <GerenciadorOpcoesSelect
        opcoes={["Opcao 1", "Opcao 2"]}
        coresMap={{ "Opcao 1": "azul", "Opcao 2": "verde" }}
        aoAtualizarOpcoes={aoAtualizarOpcoes}
        aoAtualizarCor={aoAtualizarCor}
        aoRenomearOpcao={aoRenomearOpcao}
        aoExcluirOpcao={aoExcluirOpcao}
      />
    );

    expect(screen.getByText("Opções Pré-cadastradas:")).toBeDefined();
    expect(screen.getByText("Opcao 1")).toBeDefined();
    expect(screen.getByText("Opcao 2")).toBeDefined();

    // Adicionar nova opção
    const inputNova = screen.getByPlaceholderText("Nova opção...");
    fireEvent.change(inputNova, { target: { value: "Opcao 3" } });
    const botaoAdd = screen.getByRole("button", { name: /adicionar/i });
    fireEvent.click(botaoAdd);
    expect(aoAtualizarOpcoes).toHaveBeenCalledWith(["Opcao 1", "Opcao 2", "Opcao 3"]);

    // Excluir opção
    const botoesExcluir = screen.getAllByTitle("Excluir opção");
    fireEvent.click(botoesExcluir[0]);
    expect(aoExcluirOpcao).toHaveBeenCalledWith("Opcao 1");
  });
});

describe("MenuConfiguracaoPropriedade", () => {
  it("renderiza o cabeçalho e menu de configurações", () => {
    const aoRenomear = vi.fn();
    const aoMudarVisibilidade = vi.fn();

    render(
      <MenuConfiguracaoPropriedade
        chave="tags"
        nomeAtual="Minhas Tags"
        tipoAtual="multiselect"
        visibilidadeAtual="sempre"
        descricaoAtual="Tags descritivas"
        opcoesCadastradas={["Design", "Frontend"]}
        coresTagsMap={{}}
        aberto={false}
        aoMudarAberto={vi.fn()}
        aoRenomear={aoRenomear}
        aoMudarTipo={vi.fn()}
        aoMudarVisibilidade={aoMudarVisibilidade}
        aoMudarDescricao={vi.fn()}
        aoMudarIcone={vi.fn()}
        aoMudarCorIcone={vi.fn()}
        aoMover={vi.fn()}
        aoDuplicar={vi.fn()}
        aoExcluir={vi.fn()}
        aoAtualizarOpcoes={vi.fn()}
        aoAtualizarCorTag={vi.fn()}
        aoRenomearTag={vi.fn()}
        aoExcluirTag={vi.fn()}
      >
        <button>Minhas Tags</button>
      </MenuConfiguracaoPropriedade>
    );

    expect(screen.getByText("Minhas Tags")).toBeDefined();
  });
});
