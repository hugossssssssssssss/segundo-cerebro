import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { BarraFavoritos } from "./BarraFavoritos";
import {
  salvarFavoritosLocal,
  CHAVE_STORAGE_FAVORITOS,
  cancelarPersistenciaPendente,
  type FavoritoItem,
} from "@/lib/favoritos";

describe("BarraFavoritos", () => {
  beforeEach(() => {
    localStorage.clear();
    cancelarPersistenciaPendente();
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("renderiza o botão de adicionar link aos favoritos", () => {
    render(<BarraFavoritos />);
    const botaoAdicionar = screen.getByRole("button", { name: /adicionar favorito/i });
    expect(botaoAdicionar).toBeDefined();
  });

  it("exibe favoritos salvos no localStorage", async () => {
    const itens: FavoritoItem[] = [
      { id: "fav-1", url: "https://github.com", nome: "GitHub" },
      { id: "fav-2", url: "https://figma.com", nome: "Figma" },
    ];
    salvarFavoritosLocal(itens);

    render(<BarraFavoritos />);

    expect(await screen.findByText("GitHub")).toBeDefined();
    expect(await screen.findByText("Figma")).toBeDefined();
  });

  it("abre modal ao clicar em adicionar e permite cadastrar novo favorito", async () => {
    render(<BarraFavoritos />);

    const botaoAdicionar = screen.getByRole("button", { name: /adicionar favorito/i });
    fireEvent.click(botaoAdicionar);

    // Modal aberto
    expect(screen.getByRole("heading", { name: /adicionar favorito/i })).toBeDefined();

    const inputUrl = screen.getByLabelText(/url do site/i);
    const inputNome = screen.getByLabelText(/nome de exibição/i);

    fireEvent.change(inputUrl, { target: { value: "dribbble.com" } });
    fireEvent.change(inputNome, { target: { value: "Dribbble" } });

    const botaoSalvar = screen.getByRole("button", { name: /^adicionar$/i });
    fireEvent.click(botaoSalvar);

    await waitFor(() => {
      expect(screen.getByText("Dribbble")).toBeDefined();
    });

    const salvo = JSON.parse(localStorage.getItem(CHAVE_STORAGE_FAVORITOS) || "[]");
    expect(salvo.length).toBe(1);
    expect(salvo[0].url).toBe("https://dribbble.com");
    expect(salvo[0].nome).toBe("Dribbble");
  });

  it("abre menu de contexto ao clicar com botão direito e permite excluir", async () => {
    const itens: FavoritoItem[] = [
      { id: "fav-del", url: "https://youtube.com", nome: "YouTube" },
    ];
    salvarFavoritosLocal(itens);

    render(<BarraFavoritos />);

    const itemYt = await screen.findByText("YouTube");
    fireEvent.contextMenu(itemYt);

    // Opções do menu de contexto
    expect(screen.getByText("Abrir em nova guia")).toBeDefined();
    expect(screen.getByText("Abrir em nova janela")).toBeDefined();
    expect(screen.getByText("Editar")).toBeDefined();

    const botaoExcluir = screen.getByText("Excluir");
    fireEvent.click(botaoExcluir);

    await waitFor(() => {
      expect(screen.queryByText("YouTube")).toBeNull();
    });

    const salvo = JSON.parse(localStorage.getItem(CHAVE_STORAGE_FAVORITOS) || "[]");
    expect(salvo.length).toBe(0);
  });

  it("abre menu de contexto, clica em alterar ícone e seleciona ícone oficial", async () => {
    const itens: FavoritoItem[] = [
      { id: "fav-icon", url: "https://minhaempresa.com", nome: "Minha Empresa" },
    ];
    salvarFavoritosLocal(itens);

    render(<BarraFavoritos />);

    const item = await screen.findByText("Minha Empresa");
    fireEvent.contextMenu(item);

    const botaoAlterarIcone = screen.getByText("Alterar ícone");
    expect(botaoAlterarIcone).toBeDefined();
    fireEvent.click(botaoAlterarIcone);

    // Modal de ícones aberto
    expect(screen.getByText("Alterar Ícone do Favorito")).toBeDefined();

    // Clica no ícone do WhatsApp na grade
    const iconeWhatsApp = screen.getByTitle("WhatsApp");
    fireEvent.click(iconeWhatsApp);

    await waitFor(() => {
      const salvo = JSON.parse(localStorage.getItem(CHAVE_STORAGE_FAVORITOS) || "[]");
      expect(salvo[0].iconeCustomizado).toBe("si:whatsapp");
    });
  });
});
