import { describe, it, expect } from "vitest";
import { comoContato, contatoParaArquivo } from "./entidades";
import {
  slugifyNomeContato,
  construirArvoreContatos,
  filtrarContatos,
  parsearCSVContatos,
  exportarCSVContatos,
} from "./contatos";
import type { Contato } from "./tipos";
import type { Documento } from "./markdown";

describe("lib/contatos", () => {
  it("slugifyNomeContato gera slugs limpos", () => {
    expect(slugifyNomeContato("Marcelo Silva (CEO)")).toBe("marcelo-silva-ceo");
    expect(slugifyNomeContato("  Ana Maria  ")).toBe("ana-maria");
    expect(slugifyNomeContato("")).toBe("contato-sem-nome");
  });

  it("comoContato e contatoParaArquivo realizam ida e volta sem perder dados", () => {
    const doc: Documento = {
      dados: {
        titulo: "Hugo Silva",
        tipo: "contato",
        cargo: "Design Lead",
        empresa: "Studio Klaus",
        email: "hugo@exemplo.com",
        telefone: "+55 11 99999-9999",
        pai_id: "chefe-executivo",
        tags: ["Trabalho", "Design"],
        propriedades: {
          LinkedIn: "https://linkedin.com/in/hugo",
          Aniversario: "15/08",
        },
        campo_desconhecido: "preservar",
      },
      corpo: "Notas sobre a parceria.",
    };

    const contato = comoContato(doc, "contatos/hugo-silva.md", "sha123", "Hugo");

    expect(contato.id).toBe("hugo-silva");
    expect(contato.titulo).toBe("Hugo Silva");
    expect(contato.cargo).toBe("Design Lead");
    expect(contato.empresa).toBe("Studio Klaus");
    expect(contato.email).toBe("hugo@exemplo.com");
    expect(contato.telefone).toBe("+55 11 99999-9999");
    expect(contato.paiId).toBe("chefe-executivo");
    expect(contato.tags).toEqual(["Trabalho", "Design"]);
    expect(contato.propriedades).toEqual({
      LinkedIn: "https://linkedin.com/in/hugo",
      Aniversario: "15/08",
      campo_desconhecido: "preservar",
    });

    const arquivo = contatoParaArquivo(contato);

    expect(arquivo.dados.titulo).toBe("Hugo Silva");
    expect(arquivo.dados.tipo).toBe("contato");
    expect(arquivo.dados.cargo).toBe("Design Lead");
    expect(arquivo.dados.empresa).toBe("Studio Klaus");
    expect(arquivo.dados.pai_id).toBe("chefe-executivo");
    expect(arquivo.dados.campo_desconhecido).toBe("preservar");
    expect(arquivo.dados.propriedades).toEqual({
      LinkedIn: "https://linkedin.com/in/hugo",
      Aniversario: "15/08",
    });
    expect(arquivo.corpo).toBe("Notas sobre a parceria.");
  });

  it("construirArvoreContatos organiza hierarquia pai-filho corretamente", () => {
    const contatos: Contato[] = [
      {
        caminho: "contatos/chefe.md",
        sha: "1",
        id: "chefe",
        bruto: {},
        titulo: "Carlos (Chefe)",
        cargo: "CEO",
        tags: [],
        propriedades: {},
        corpo: "",
      },
      {
        caminho: "contatos/gerente-a.md",
        sha: "2",
        id: "gerente-a",
        paiId: "chefe",
        bruto: {},
        titulo: "Ana (Gerente)",
        cargo: "Gerente",
        tags: [],
        propriedades: {},
        corpo: "",
      },
      {
        caminho: "contatos/dev-1.md",
        sha: "3",
        id: "dev-1",
        paiId: "gerente-a",
        bruto: {},
        titulo: "Bruno (Dev)",
        cargo: "Dev",
        tags: [],
        propriedades: {},
        corpo: "",
      },
      {
        caminho: "contatos/independente.md",
        sha: "4",
        id: "independente",
        bruto: {},
        titulo: "Zelia (Consultora)",
        cargo: "Consultora",
        tags: [],
        propriedades: {},
        corpo: "",
      },
    ];

    const arvore = construirArvoreContatos(contatos);

    expect(arvore).toHaveLength(2); // Chefe e Zelia (raízes)
    expect(arvore[0].contato.id).toBe("chefe");
    expect(arvore[0].filhos).toHaveLength(1);
    expect(arvore[0].filhos[0].contato.id).toBe("gerente-a");
    expect(arvore[0].filhos[0].filhos).toHaveLength(1);
    expect(arvore[0].filhos[0].filhos[0].contato.id).toBe("dev-1");

    expect(arvore[1].contato.id).toBe("independente");
    expect(arvore[1].filhos).toHaveLength(0);
  });

  it("filtrarContatos filtra por termo, empresa e tag", () => {
    const contatos: Contato[] = [
      {
        caminho: "contatos/c1.md",
        sha: "1",
        id: "c1",
        bruto: {},
        titulo: "Alice Rocha",
        cargo: "Designer",
        empresa: "Klaus Studio",
        email: "alice@klaus.com",
        tags: ["VIP", "Design"],
        propriedades: { Cidade: "São Paulo" },
        corpo: "",
      },
      {
        caminho: "contatos/c2.md",
        sha: "2",
        id: "c2",
        bruto: {},
        titulo: "Bernardo Costa",
        cargo: "Desenvolvedor",
        empresa: "Tech Corp",
        email: "bernardo@tech.com",
        tags: ["Dev"],
        propriedades: { Cidade: "Curitiba" },
        corpo: "",
      },
    ];

    expect(filtrarContatos(contatos, "alice")).toHaveLength(1);
    expect(filtrarContatos(contatos, "Designer")).toHaveLength(1);
    expect(filtrarContatos(contatos, "São Paulo")).toHaveLength(1);
    expect(filtrarContatos(contatos, "", "Tech Corp")).toHaveLength(1);
    expect(filtrarContatos(contatos, "", undefined, "VIP")).toHaveLength(1);
    expect(filtrarContatos(contatos, "inexistente")).toHaveLength(0);
  });

  it("parsearCSVContatos converte string CSV em contatos parciais", () => {
    const csv = `Nome;Cargo;Empresa;Email;Telefone;Pai;Tags;Departamento
Roberto Mendes;Diretor;Acme;roberto@acme.com;11999;chefe;VIP,Executivo;Vendas
Beatriz Lima;Gerente;Acme;beatriz@acme.com;11888;roberto-mendes;Equipe;Vendas`;

    const parsed = parsearCSVContatos(csv);

    expect(parsed).toHaveLength(2);
    expect(parsed[0].titulo).toBe("Roberto Mendes");
    expect(parsed[0].cargo).toBe("Diretor");
    expect(parsed[0].empresa).toBe("Acme");
    expect(parsed[0].email).toBe("roberto@acme.com");
    expect(parsed[0].tags).toEqual(["VIP", "Executivo"]);
    expect(parsed[0].propriedades).toEqual({ departamento: "Vendas" });

    expect(parsed[1].paiId).toBe("roberto-mendes");
  });

  it("exportarCSVContatos gera um CSV válido", () => {
    const contatos: Contato[] = [
      {
        caminho: "contatos/c1.md",
        sha: "1",
        id: "c1",
        bruto: {},
        titulo: "Carlos",
        cargo: "CEO",
        empresa: "Acme",
        email: "carlos@acme.com",
        telefone: "123",
        paiId: "",
        tags: ["Liderança"],
        propriedades: { Cidade: "Rio" },
        corpo: "Nota simples",
      },
    ];

    const csvOutput = exportarCSVContatos(contatos);
    expect(csvOutput).toContain("Nome,Cargo,Empresa,Email,Telefone,Pai_ID,Tags,Notas,Cidade");
    expect(csvOutput).toContain("Carlos,CEO,Acme,carlos@acme.com,123,,Liderança,Nota simples,Rio");
  });
});
