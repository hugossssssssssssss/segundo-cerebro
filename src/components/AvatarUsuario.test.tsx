import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { AvatarUsuario } from "./AvatarUsuario";

describe("AvatarUsuario", () => {
  afterEach(() => {
    cleanup();
  });

  it("renderiza a inicial ou imagem do usuário com base no login", () => {
    render(<AvatarUsuario login="hugosilva" nome="Hugo Silva" />);
    const img = screen.getByRole("img");
    expect(img).toBeTruthy();
    expect(img.getAttribute("src")).toBe("https://github.com/hugosilva.png?size=64");
  });

  it("remove o prefixo @ do login do usuário se presente", () => {
    render(<AvatarUsuario login="@mariadesign" />);
    const img = screen.getByRole("img");
    expect(img).toBeTruthy();
    expect(img.getAttribute("src")).toBe("https://github.com/mariadesign.png?size=64");
  });

  it("não renderiza nada se o login for vazio", () => {
    const { container } = render(<AvatarUsuario login="" />);
    expect(container.firstChild).toBeNull();
  });
});
