import { describe, it, expect } from "vitest";
import {
  comoProcesso,
  processoParaFrontmatter,
  comoCardProcesso,
  cardProcessoParaFrontmatter,
  extrairComentariosDoCorpo,
} from "./processos";
import { lerMarkdown, escreverMarkdown } from "./markdown";

describe("Resiliência do Módulo de Processos e Cartões", () => {
  it("deve lidar graciosamente com etapas malformadas sem estourar exceção", () => {
    const docMalformado = {
      dados: {
        id: "funil-teste",
        tipo: "processo",
        titulo: "Funil Teste",
        etapas: "não é um array", // dado corrompido
        regras: null,
      },
      corpo: "Corpo do processo",
    };

    const processo = comoProcesso(docMalformado as any, "processos/funil-teste.md", "sha123");
    expect(processo.id).toBe("funil-teste");
    expect(processo.titulo).toBe("Funil Teste");
    expect(processo.etapas).toEqual([]);
    expect(processo.regras).toEqual([]);

    const fm = processoParaFrontmatter(processo);
    expect(fm.id).toBe("funil-teste");
  });

  it("deve sanitizar itens corrompidos dentro do array de etapas", () => {
    const doc = {
      dados: {
        id: "funil-2",
        tipo: "processo",
        titulo: "Funil 2",
        etapas: [
          null,
          "etapa string inválida",
          { id: "e1", nome: "Triagem", cor: "invalida_cor", checklistsPadrao: ["string legado"] },
          { id: "e2", nome: "Conclusão", cor: "emerald" },
        ],
      },
      corpo: "",
    };

    const processo = comoProcesso(doc as any, "processos/funil-2.md", "sha123");
    expect(processo.etapas.length).toBe(2);
    expect(processo.etapas[0].id).toBe("e1");
    expect(processo.etapas[0].cor).toBe("blue"); // fallback seguro
    expect(processo.etapas[0].checklistsPadrao[0].texto).toBe("string legado");
    expect(processo.etapas[1].cor).toBe("emerald");
  });

  it("deve extrair comentários híbridos do corpo Markdown", () => {
    const corpo = `
# Cartão Acme
Detalhes do projeto...

## Comentários
- **2026-08-28 10:00 (Hugo)**: Primeira reunião realizada com o cliente
> **Ana** (2026-08-28 11:30): Proposta comercial enviada
`;

    const comentarios = extrairComentariosDoCorpo(corpo);
    expect(comentarios.length).toBe(2);
    expect(comentarios[0].autor).toBe("Hugo");
    expect(comentarios[0].texto).toBe("Primeira reunião realizada com o cliente");
    expect(comentarios[1].autor).toBe("Ana");
    expect(comentarios[1].texto).toBe("Proposta comercial enviada");
  });

  it("deve unificar comentários do frontmatter com comentários do corpo Markdown sem duplicatas", () => {
    const textoMd = `---
id: card-1
processo_id: funil-1
etapa_id: etapa-1
titulo: Cartão Teste
comentarios:
  - id: c1
    data: "2026-08-28 09:00"
    autor: Hugo
    texto: Comentário do frontmatter
---
# Descrição
- **2026-08-28 10:00 (Hugo)**: Comentário do corpo
- **2026-08-28 09:00 (Hugo)**: Comentário do frontmatter
`;

    const doc = lerMarkdown(textoMd);
    const card = comoCardProcesso(doc, "processos/cards/card-1.md", "sha123");

    expect(card.comentarios.length).toBe(2);
    expect(card.comentarios.some((c) => c.texto === "Comentário do frontmatter")).toBe(true);
    expect(card.comentarios.some((c) => c.texto === "Comentário do corpo")).toBe(true);
  });

  it("deve salvar e carregar preservando propriedades extras customizadas", () => {
    const cardOriginal = {
      bruto: {
        id: "card-custom",
        tipo: "card_processo",
        processo_id: "funil-1",
        etapa_id: "e1",
        titulo: "Card Custom",
        propriedade_do_usuario: "valor customizado",
        tags_extras: ["a", "b"],
      },
      caminho: "processos/cards/card-custom.md",
      sha: "sha1",
      id: "card-custom",
      tipo: "card_processo" as const,
      processoId: "funil-1",
      etapaId: "e1",
      titulo: "Card Custom",
      corpo: "Texto livre",
      checklists: { chk1: true },
      checklistsExtras: [],
      comentarios: [],
      tags: ["design"],
      urgente: false,
    };

    const docPronto = cardProcessoParaFrontmatter(cardOriginal);
    const textoGerado = escreverMarkdown({ dados: docPronto, corpo: cardOriginal.corpo });

    const docLido = lerMarkdown(textoGerado);
    expect(docLido.dados.propriedade_do_usuario).toBe("valor customizado");
    expect(docLido.dados.tags_extras).toEqual(["a", "b"]);
    expect(docLido.dados.processo_id).toBe("funil-1");
  });
});
