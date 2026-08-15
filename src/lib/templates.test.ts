import { describe, it, expect } from "vitest";
import { MODELOS_PADRAO } from "./templates";

describe("templates", () => {
  it("contém modelos padrões estruturados", () => {
    expect(MODELOS_PADRAO.length).toBeGreaterThan(0);
    const briefing = MODELOS_PADRAO.find((m) => m.id === "briefing-design");
    expect(briefing).toBeDefined();
    expect(briefing?.frontmatter.tipo).toBe("nota");
    expect(briefing?.corpoPadrao).toContain("Objetivo do Projeto");
  });
});
