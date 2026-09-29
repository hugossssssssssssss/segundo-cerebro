import { describe, it, expect } from "vitest";
import {
  caminhoCompletoDaImagem,
  nomeDeImagem,
  todasAsTags,
  getKlausFullImagePath,
  createKlausImageFilename,
  getAllKlausReferenceTags,
  KLAUS_REFERENCES_DIR,
  KLAUS_IMAGES_DIR,
  type Referencia,
} from "./klausReferences";

describe("klausReferences", () => {
  it("monta o caminho completo da imagem mantendo pasta raiz", () => {
    expect(caminhoCompletoDaImagem("imagens/foto.jpg")).toBe("referencias/imagens/foto.jpg");
    expect(caminhoCompletoDaImagem("./imagens/foto.jpg")).toBe("referencias/imagens/foto.jpg");
    expect(caminhoCompletoDaImagem("referencias/imagens/foto.jpg")).toBe("referencias/imagens/foto.jpg");
  });

  it("gera nome seguro de imagem preservando extensão", () => {
    const nome = nomeDeImagem("banner-design.png");
    expect(nome.endsWith(".png")).toBe(true);
    expect(createKlausImageFilename("foto.jpg").endsWith(".jpg")).toBe(true);
  });

  it("calcula ranking de tags das referências", () => {
    const refs: Referencia[] = [
      { id: "1", caminho: "referencias/1.md", sha: "1", titulo: "R1", tags: ["design", "ui"], imagem: "", porque: "", corpo: "", bruto: {} },
      { id: "2", caminho: "referencias/2.md", sha: "2", titulo: "R2", tags: ["design"], imagem: "", porque: "", corpo: "", bruto: {} },
    ];
    const tags = todasAsTags(refs);
    expect(tags).toEqual(["design", "ui"]);
    expect(getAllKlausReferenceTags(refs)).toEqual(["design", "ui"]);
  });

  it("exporta constantes canônicas", () => {
    expect(KLAUS_REFERENCES_DIR).toBe("referencias");
    expect(KLAUS_IMAGES_DIR).toBe("referencias/imagens");
    expect(getKlausFullImagePath("imagens/teste.png")).toBe("referencias/imagens/teste.png");
  });
});
