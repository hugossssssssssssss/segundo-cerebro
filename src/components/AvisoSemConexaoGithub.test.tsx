import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { AvisoSemConexaoGithub } from "./AvisoSemConexaoGithub";

describe("AvisoSemConexaoGithub", () => {
  it("renderiza a mensagem padrão e o botão de conectar", () => {
    render(
      <BrowserRouter>
        <AvisoSemConexaoGithub />
      </BrowserRouter>
    );

    expect(screen.getByText(/Repositório GitHub não conectado/i)).toBeTruthy();
    expect(screen.getByText(/Conectar/i)).toBeTruthy();
  });

  it("renderiza mensagem customizada quando informada", () => {
    render(
      <BrowserRouter>
        <AvisoSemConexaoGithub mensagem="Mensagem personalizada de teste" />
      </BrowserRouter>
    );

    expect(screen.getByText("Mensagem personalizada de teste")).toBeTruthy();
  });
});
