import { describe, it, expect } from "vitest";
import { encontrarMencaoNoPonto } from "./EditorNotion";
import type { Alvo } from "@/lib/links";

describe("encontrarMencaoNoPonto", () => {
  const alvosMock: Alvo[] = [
    { titulo: "Briefing Acme", caminho: "notas/briefing-acme.md", tipo: "nota" },
    { titulo: "Briefing", caminho: "notas/briefing.md", tipo: "nota" },
    { titulo: "Design System", caminho: "tarefas/design-system.md", tipo: "tarefa" },
  ];

  it("identifica corretamente uma menção @ quando o cursor está no intervalo", () => {
    const container = document.createElement("div");
    const p = document.createElement("p");
    p.textContent = "Consulte o @Briefing Acme para detalhes.";
    container.appendChild(p);
    document.body.appendChild(container);

    const noTexto = p.firstChild as Text;
    expect(noTexto).toBeTruthy();

    // Mock caretRangeFromPoint para simular clique no offset 15 (dentro de "Briefing Acme")
    document.caretRangeFromPoint = () => {
      const r = document.createRange();
      r.setStart(noTexto, 15);
      r.setEnd(noTexto, 15);
      return r;
    };

    const achado = encontrarMencaoNoPonto(100, 100, container, alvosMock);
    expect(achado).not.toBeNull();
    expect(achado?.titulo).toBe("Briefing Acme");
    expect(achado?.caminho).toBe("notas/briefing-acme.md");

    document.body.removeChild(container);
  });

  it("retorna null se o clique foi fora de uma menção", () => {
    const container = document.createElement("div");
    const p = document.createElement("p");
    p.textContent = "Consulte o @Briefing Acme para detalhes.";
    container.appendChild(p);
    document.body.appendChild(container);

    const noTexto = p.firstChild as Text;

    // Offset 2 (na palavra "Consulte")
    document.caretRangeFromPoint = () => {
      const r = document.createRange();
      r.setStart(noTexto, 2);
      r.setEnd(noTexto, 2);
      return r;
    };

    const achado = encontrarMencaoNoPonto(100, 100, container, alvosMock);
    expect(achado).toBeNull();

    document.body.removeChild(container);
  });

  it("reconhece também formato [[alvo]] antigo", () => {
    const container = document.createElement("div");
    const p = document.createElement("p");
    p.textContent = "Revisar [[Design System]] hoje.";
    container.appendChild(p);
    document.body.appendChild(container);

    const noTexto = p.firstChild as Text;

    document.caretRangeFromPoint = () => {
      const r = document.createRange();
      r.setStart(noTexto, 12);
      r.setEnd(noTexto, 12);
      return r;
    };

    const achado = encontrarMencaoNoPonto(100, 100, container, alvosMock);
    expect(achado).not.toBeNull();
    expect(achado?.titulo).toBe("Design System");
    expect(achado?.caminho).toBe("tarefas/design-system.md");

    document.body.removeChild(container);
  });
});

describe("formatarTextoAoColar", () => {
  it("converte URLs de navegação SPA com ?abrir= em menção @", async () => {
    const { formatarTextoAoColar } = await import("./EditorNotion");
    const res = formatarTextoAoColar("https://meuapp.com/#/notas?abrir=notas%2F2026-09-03-briefing.md");
    expect(res).toBe("@briefing");
  });

  it("converte sintaxe wikilinks [[alvo]] em @alvo", async () => {
    const { formatarTextoAoColar } = await import("./EditorNotion");
    expect(formatarTextoAoColar("[[Design System]]")).toBe("@Design System");
    expect(formatarTextoAoColar("[[notas/briefing.md|Briefing]]")).toBe("@Briefing");
  });

  it("retorna null para textos comuns sem padrão de atalho", async () => {
    const { formatarTextoAoColar } = await import("./EditorNotion");
    expect(formatarTextoAoColar("https://google.com")).toBeNull();
    expect(formatarTextoAoColar("Apenas texto puro")).toBeNull();
  });
});

