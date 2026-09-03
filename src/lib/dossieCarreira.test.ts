import { describe, it, expect } from "vitest";
import {
  filtrarEntregasPorPeriodo,
  consolidarDossie,
  gerarMarkdownDossie,
} from "./dossieCarreira";
import type { Meta, Entrega, Contato } from "./tipos";

describe("dossieCarreira", () => {
  const metaExemplo: Meta = {
    caminho: "pdi/metas/design-system.md",
    sha: "123",
    id: "design-system",
    titulo: "Evoluir Design System",
    status: "em-andamento",
    indicador: "Documentar 100% dos componentes base",
    prazo: "2026-12-31",
    tags: ["design-tokens", "react"],
    corpo: "Meta de evolução do design system",
    bruto: {},
  };

  const entregasExemplo: Entrega[] = [
    {
      caminho: "pdi/entregas/2026-02-10-tokens.md",
      sha: "e1",
      id: "tokens",
      titulo: "Arquitetura de Design Tokens",
      data: "2026-02-10",
      metas: ["design-system"],
      iaSugeriu: false,
      impacto: "Reduziu o tempo de entrega de telas em 40%",
      elogio: "A velocidade do time dobrou após a padronização!",
      autorElogio: "marcelo-silva",
      colaboracao: ["Design", "Engenharia"],
      tags: ["design-tokens", "css"],
      corpo: "Estruturação completa das variáveis de cor e espaçamento.",
      bruto: {},
    },
    {
      caminho: "pdi/entregas/2025-11-05-legado.md",
      sha: "e2",
      id: "legado",
      titulo: "Auditoria de Telas Antigas",
      data: "2025-11-05",
      metas: ["design-system"],
      iaSugeriu: false,
      corpo: "",
      bruto: {},
    },
  ];

  const contatosExemplo: Contato[] = [
    {
      caminho: "contatos/marcelo-silva.md",
      sha: "c1",
      id: "marcelo-silva",
      titulo: "Marcelo Silva",
      cargo: "Head de Produto",
      empresa: "Klaus Studio",
      tags: [],
      propriedades: {},
      corpo: "",
      bruto: {},
    },
  ];

  it("filtra entregas por intervalo de datas", () => {
    const filtradas = filtrarEntregasPorPeriodo(entregasExemplo, "2026-01-01", "2026-12-31");
    expect(filtradas).toHaveLength(1);
    expect(filtradas[0].id).toBe("tokens");
  });

  it("consolida dados de metas, entregas e mapeia elogios ao contato correspondente", () => {
    const dados = consolidarDossie([metaExemplo], entregasExemplo, contatosExemplo);
    expect(dados.entregas).toHaveLength(2);
    expect(dados.entregasComImpacto).toHaveLength(1);
    expect(dados.elogios).toHaveLength(1);
    expect(dados.elogios[0].autorNome).toBe("Marcelo Silva");
    expect(dados.elogios[0].contato?.cargo).toBe("Head de Produto");
    expect(dados.colaboracoes["Design"]).toHaveLength(1);
    expect(dados.colaboracoes["Engenharia"]).toHaveLength(1);
    expect(dados.todasTags).toContain("design-tokens");
    expect(dados.todasTags).toContain("css");
  });

  it("gera Markdown formatado do Dossiê corretamente", () => {
    const dados = consolidarDossie([metaExemplo], entregasExemplo, contatosExemplo);
    const md = gerarMarkdownDossie(dados, {
      nomeUsuario: "Hugo Silva",
      periodoRotulo: "Ano de 2026",
    });

    expect(md).toContain("# Dossiê de Carreira & Conquistas (Brag Document)");
    expect(md).toContain("**Profissional:** Hugo Silva");
    expect(md).toContain("Evoluir Design System");
    expect(md).toContain("Reduziu o tempo de entrega de telas em 40%");
    expect(md).toContain("Marcelo Silva");
    expect(md).toContain("Head de Produto");
  });
});
