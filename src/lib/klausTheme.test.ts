import { describe, it, expect, beforeEach } from "vitest";
import {
  lerTemaSalvo,
  aplicarTema,
  alternarTema,
  loadKlausTheme,
  applyKlausTheme,
  toggleKlausTheme,
  aplicarVariacaoEscuro,
  lerVariacaoEscuroSalva,
  aplicarPaletaAcento,
  lerPaletaAcentoSalva,
} from "./klausTheme";

describe("klausTheme", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove("dark");
  });

  it("lerTemaSalvo e loadKlausTheme devolvem tema salvo ou claro por padrão", () => {
    expect(lerTemaSalvo()).toBe("claro");
    expect(loadKlausTheme()).toBe("claro");
    localStorage.setItem("klaus:ui:theme", "escuro");
    expect(lerTemaSalvo()).toBe("escuro");
    expect(loadKlausTheme()).toBe("escuro");
  });

  it("aplicarTema altera a classe do documentElement e o localStorage", () => {
    aplicarTema("escuro");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(localStorage.getItem("klaus:ui:theme")).toBe("escuro");

    applyKlausTheme("claro");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(localStorage.getItem("klaus:ui:theme")).toBe("claro");
  });

  it("alternarTema e toggleKlausTheme invertem de claro para escuro e vice-versa", () => {
    applyKlausTheme("claro");
    const novo1 = toggleKlausTheme();
    expect(novo1).toBe("escuro");
    expect(document.documentElement.classList.contains("dark")).toBe(true);

    const novo2 = alternarTema();
    expect(novo2).toBe("claro");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("gerencia variações escuras e paletas de acento", () => {
    aplicarVariacaoEscuro("oled");
    expect(lerVariacaoEscuroSalva()).toBe("oled");

    aplicarPaletaAcento("azul");
    expect(lerPaletaAcentoSalva()).toBe("azul");
  });
});
