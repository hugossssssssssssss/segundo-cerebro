import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { SeletorMembrosPropriedade } from "./SeletorMembrosPropriedade";

vi.mock("@/lib/equipe", () => ({
  carregarEquipe: vi.fn().mockResolvedValue({
    config: {
      membros: [
        { login: "hugosilva", nome: "Hugo Silva", papel: "dono", ativo: true },
        { login: "mariadesign", nome: "Maria Designer", papel: "membro", ativo: true },
      ],
    },
  }),
}));

vi.mock("@/lib/settings", () => ({
  lerConfig: vi.fn().mockReturnValue({ repoOwner: "hugosilva" }),
  nomeExibido: vi.fn().mockReturnValue("Hugo Silva"),
}));

vi.mock("@/lib/usuario", () => ({
  lerPerfilLocal: vi.fn().mockReturnValue({ login: "hugosilva", nome: "Hugo Silva" }),
}));

describe("SeletorMembrosPropriedade", () => {
  afterEach(() => {
    cleanup();
  });

  it("renderiza chips dos responsáveis já atribuídos", () => {
    const aoMudar = vi.fn();
    render(<SeletorMembrosPropriedade valor={["hugosilva", "mariadesign"]} onChange={aoMudar} />);

    expect(screen.getByText(/hugosilva/i)).toBeTruthy();
    expect(screen.getByText(/mariadesign/i)).toBeTruthy();
  });

  it("permite remover um responsável atribuído", () => {
    const aoMudar = vi.fn();
    render(<SeletorMembrosPropriedade valor={["hugosilva", "mariadesign"]} onChange={aoMudar} />);

    const botoesRemover = screen.getAllByTitle(/Remover/i);
    fireEvent.click(botoesRemover[0]);

    expect(aoMudar).toHaveBeenCalledWith(["mariadesign"]);
  });

  it("exibe botão de atribuir responsável quando vazio", () => {
    const aoMudar = vi.fn();
    render(<SeletorMembrosPropriedade valor={[]} onChange={aoMudar} />);

    expect(screen.getByText("Atribuir responsável")).toBeTruthy();
  });
});
