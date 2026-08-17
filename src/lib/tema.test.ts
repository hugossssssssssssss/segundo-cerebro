import { describe, it, expect, beforeEach } from "vitest";
import { lerTemaSalvo, aplicarTema, alternarTema } from "./tema";

describe("tema", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove("dark");
  });

  it("lerTemaSalvo devolve tema salvo ou claro por padrão", () => {
    expect(lerTemaSalvo()).toBe("claro");
    localStorage.setItem("tema", "escuro");
    expect(lerTemaSalvo()).toBe("escuro");
  });

  it("aplicarTema altera a classe do documentElement e o localStorage", () => {
    aplicarTema("escuro");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(localStorage.getItem("tema")).toBe("escuro");

    aplicarTema("claro");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(localStorage.getItem("tema")).toBe("claro");
  });

  it("alternarTema inverte de claro para escuro e vice-versa", () => {
    aplicarTema("claro");
    const novo1 = alternarTema();
    expect(novo1).toBe("escuro");
    expect(document.documentElement.classList.contains("dark")).toBe(true);

    const novo2 = alternarTema();
    expect(novo2).toBe("claro");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });
});
