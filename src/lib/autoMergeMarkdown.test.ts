import { describe, it, expect } from "vitest";
import {
  mesclarFrontmatterSemantico,
  mesclarCorpoMarkdown,
  autoMergeDocumentoMarkdown,
} from "./autoMergeMarkdown";

describe("autoMergeMarkdown - 3-Way Merge Semântico", () => {
  describe("mesclarFrontmatterSemantico", () => {
    it("mescla campos independentes modificados em aparelhos diferentes", () => {
      const base = { titulo: "Layout", status: "a-fazer", tags: ["design"] };
      const local = { titulo: "Layout", status: "feito", tags: ["design"] }; // celular concluiu
      const remoto = { titulo: "Layout", status: "a-fazer", tags: ["design", "urgente"] }; // Mac pôs tag

      const res = mesclarFrontmatterSemantico(base, local, remoto);
      expect(res.dados.status).toBe("feito");
      expect(res.dados.tags).toEqual(["design", "urgente"]);
      expect(res.conflito).toBe(false);
    });

    it("faz união de listas sem duplicar itens", () => {
      const base = { tags: ["a"] };
      const local = { tags: ["a", "b"] };
      const remoto = { tags: ["a", "c"] };

      const res = mesclarFrontmatterSemantico(base, local, remoto);
      expect(res.dados.tags).toEqual(["a", "b", "c"]);
      expect(res.conflito).toBe(false);
    });
  });

  describe("mesclarCorpoMarkdown", () => {
    it("mescla checklists preservando itens marcados como concluídos", () => {
      const base = "- [ ] Comprar papel\n- [ ] Ligar pro cliente";
      const local = "- [x] Comprar papel\n- [ ] Ligar pro cliente"; // celular marcou
      const remoto = "- [ ] Comprar papel\n- [x] Ligar pro cliente"; // Mac marcou

      const res = mesclarCorpoMarkdown(base, local, remoto);
      expect(res.corpo).toContain("- [x] Comprar papel");
      expect(res.corpo).toContain("- [x] Ligar pro cliente");
      expect(res.conflito).toBe(false);
    });

    it("adiciona novos blocos de parágrafo criados independentemente", () => {
      const base = "Introdução do projeto.";
      const local = "Introdução do projeto.\n\nNota do celular.";
      const remoto = "Introdução do projeto.\n\nNota do computador.";

      const res = mesclarCorpoMarkdown(base, local, remoto);
      expect(res.corpo).toContain("Nota do celular.");
      expect(res.corpo).toContain("Nota do computador.");
      expect(res.conflito).toBe(false);
    });
  });

  describe("autoMergeDocumentoMarkdown", () => {
    it("combina frontmatter e corpo em um único documento válido", () => {
      const base = "---\ntitulo: Briefing\nstatus: a-fazer\n---\nCorpo original.";
      const local = "---\ntitulo: Briefing\nstatus: feito\n---\nCorpo original.\n\nAdendo do celular.";
      const remoto = "---\ntitulo: Briefing\nstatus: a-fazer\ntags: [mobile]\n---\nCorpo original.";

      const res = autoMergeDocumentoMarkdown(base, local, remoto);
      expect(res.sucesso).toBe(true);
      expect(res.textoMesclado).toContain("status: feito");
      expect(res.textoMesclado).toContain("tags:");
      expect(res.textoMesclado).toContain("Adendo do celular.");
    });
  });
});
