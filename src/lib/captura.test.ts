import { describe, it, expect } from "vitest";
import { adivinharDestino } from "@/components/CapturaRapida";

describe("adivinharDestino", () => {
  it("link vira referência", () => {
    expect(adivinharDestino("https://exemplo.com/artigo")).toBe("referencias");
    expect(adivinharDestino("http://site.com")).toBe("referencias");
  });

  it("frase que começa com verbo de ação vira tarefa", () => {
    expect(adivinharDestino("ligar pro dentista")).toBe("tarefas");
    expect(adivinharDestino("Revisar a proposta do cliente")).toBe("tarefas");
    expect(adivinharDestino("comprar café")).toBe("tarefas");
    expect(adivinharDestino("falar com a Ana sobre o briefing")).toBe("tarefas");
  });

  it("frase curta com prazo vira tarefa", () => {
    expect(adivinharDestino("proposta até sexta")).toBe("tarefas");
    expect(adivinharDestino("reunião amanhã")).toBe("tarefas");
  });

  it("texto solto vira nota", () => {
    expect(adivinharDestino("a grade da revista funciona porque respira")).toBe(
      "notas",
    );
    expect(adivinharDestino("ideia: usar serifada no título")).toBe("notas");
  });

  it("texto longo com data ainda é nota, não tarefa", () => {
    const longo =
      "na reunião de sexta discutimos a direção da campanha e ficou claro que o cliente prefere algo mais sóbrio, então vamos revisar a paleta inteira antes de apresentar de novo para o time de marketing deles";
    expect(adivinharDestino(longo)).toBe("notas");
  });

  it("texto vazio não quebra", () => {
    expect(adivinharDestino("")).toBe("notas");
    expect(adivinharDestino("   ")).toBe("notas");
  });
});
