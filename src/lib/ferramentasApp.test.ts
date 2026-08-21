import { describe, it, expect } from "vitest";
import { LISTA_FERRAMENTAS_APP } from "./ferramentasApp";

const ROTAS_VALIDAS_APP = new Set([
  "/",
  "/notas",
  "/tarefas",
  "/contatos",
  "/processos",
  "/pdi",
  "/referencias",
  "/lousas",
  "/inbox",
  "/chat",
  "/config",
  "/conversor",
  "/livros",
  "/pdf",
  "/historico-diff",
  "/noticias",
  "/paleta",
  "/grafo",
  "/transcritor",
  "/converter-midia",
  "/camadas-imagens",
  "/ocr",
  "/testador",
]);

const ACOES_TRATADAS_BUSCA = new Set([
  "acao:alternar_tema",
  "acao:iniciar_pomodoro",
]);

describe("ferramentasApp", () => {
  it("todas as ferramentas possuem id, titulo, categoria e palavras-chave", () => {
    for (const f of LISTA_FERRAMENTAS_APP) {
      expect(f.id).toBeTruthy();
      expect(f.titulo).toBeTruthy();
      expect(f.descricao).toBeTruthy();
      expect(f.categoria).toBeTruthy();
      expect(f.palavrasChave.length).toBeGreaterThan(0);
    }
  });

  it("toda rota declarada aponta para uma rota real do app ou para uma acao tratada na busca", () => {
    for (const f of LISTA_FERRAMENTAS_APP) {
      if (f.rota.startsWith("acao:")) {
        expect(ACOES_TRATADAS_BUSCA.has(f.rota)).toBe(true);
      } else {
        const caminhoBase = f.rota.split("?")[0];
        expect(ROTAS_VALIDAS_APP.has(caminhoBase)).toBe(true);
      }
    }
  });
});
