import type { Contato } from "./tipos";
import { removerAcentos } from "./utils";

export interface NoContato {
  contato: Contato;
  filhos: NoContato[];
  nivel: number;
}

/**
 * Converte um nome em slug seguro para nome de arquivo no GitHub.
 * Ex: "Marcelo Silva (CEO)" -> "marcelo-silva-ceo"
 */
export function slugifyNomeContato(nome: string): string {
  const limpo = removerAcentos(nome.trim().toLowerCase())
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return limpo || "contato-sem-nome";
}

/**
 * Organiza uma lista plana de contatos em uma estrutura hierárquica em árvore.
 * Suporta N níveis de profundidade (Chefe -> Gerente -> Subordinado).
 * Se houver ciclos ou referências inexistentes, coloca como nós raiz para segurança.
 */
export function construirArvoreContatos(contatos: Contato[]): NoContato[] {
  const mapa = new Map<string, Contato>();
  for (const c of contatos) {
    mapa.set(c.id, c);
  }

  // Mapeia os filhos por paiId
  const filhosPorPai = new Map<string, Contato[]>();
  const raizes: Contato[] = [];

  for (const c of contatos) {
    if (c.paiId && mapa.has(c.paiId) && c.paiId !== c.id) {
      const lista = filhosPorPai.get(c.paiId) || [];
      lista.push(c);
      filhosPorPai.set(c.paiId, lista);
    } else {
      raizes.push(c);
    }
  }

  // Constrói递归amente
  function montarNo(contato: Contato, visitados: Set<string>, nivel: number): NoContato {
    const novosVisitados = new Set(visitados);
    novosVisitados.add(contato.id);

    const filhosDiretos = filhosPorPai.get(contato.id) || [];
    const filhosNos: NoContato[] = [];

    for (const filho of filhosDiretos) {
      if (!novosVisitados.has(filho.id)) {
        filhosNos.push(montarNo(filho, novosVisitados, nivel + 1));
      }
    }

    // Ordenar filhos por título
    filhosNos.sort((a, b) => a.contato.titulo.localeCompare(b.contato.titulo));

    return {
      contato,
      filhos: filhosNos,
      nivel,
    };
  }

  // Ordena raízes por título
  raizes.sort((a, b) => a.titulo.localeCompare(b.titulo));

  return raizes.map((r) => montarNo(r, new Set(), 0));
}

/**
 * Filtra contatos por texto de busca, empresa e tag.
 */
export function filtrarContatos(
  contatos: Contato[],
  termo: string,
  empresaFiltro?: string,
  tagFiltro?: string,
): Contato[] {
  const tNorm = removerAcentos(termo.trim().toLowerCase());

  return contatos.filter((c) => {
    if (empresaFiltro && empresaFiltro !== "todas") {
      if ((c.empresa || "").toLowerCase() !== empresaFiltro.toLowerCase()) {
        return false;
      }
    }

    if (tagFiltro && tagFiltro !== "todas") {
      if (!c.tags.some((t) => t.toLowerCase() === tagFiltro.toLowerCase())) {
        return false;
      }
    }

    if (!tNorm) return true;

    const titNorm = removerAcentos(c.titulo.toLowerCase());
    const cargoNorm = removerAcentos((c.cargo || "").toLowerCase());
    const empNorm = removerAcentos((c.empresa || "").toLowerCase());
    const emailNorm = removerAcentos((c.email || "").toLowerCase());
    const telNorm = removerAcentos((c.telefone || "").toLowerCase());
    const corpoNorm = removerAcentos(c.corpo.toLowerCase());
    const tagsNorm = c.tags.map((t) => removerAcentos(t.toLowerCase())).join(" ");
    const propsNorm = Object.entries(c.propriedades)
      .map(([k, v]) => `${removerAcentos(k.toLowerCase())}: ${removerAcentos(v.toLowerCase())}`)
      .join(" ");

    return (
      titNorm.includes(tNorm) ||
      cargoNorm.includes(tNorm) ||
      empNorm.includes(tNorm) ||
      emailNorm.includes(tNorm) ||
      telNorm.includes(tNorm) ||
      corpoNorm.includes(tNorm) ||
      tagsNorm.includes(tNorm) ||
      propsNorm.includes(tNorm)
    );
  });
}

export interface ContatoImportadoCSV {
  titulo: string;
  cargo?: string;
  empresa?: string;
  email?: string;
  telefone?: string;
  paiId?: string;
  tags: string[];
  propriedades: Record<string, string>;
  corpo: string;
}

/**
 * Analisa o cabeçalho e as linhas de um CSV e devolve uma lista de contatos parciais.
 * Tolerante a delimitadores (vírgula ou ponto e vírgula) e sinonímias de colunas.
 */
export function parsearCSVContatos(csvText: string): ContatoImportadoCSV[] {
  const linhas = csvText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (linhas.length < 2) return [];

  // Detecta se o separador é ';' ou ','
  const primeiraLinha = linhas[0];
  const separador = primeiraLinha.includes(";") ? ";" : ",";

  const splitLinha = (linha: string): string[] => {
    // Regex simples para lidar com aspas no CSV
    const resultado: string[] = [];
    let dentroAspas = false;
    let atual = "";

    for (let i = 0; i < linha.length; i++) {
      const char = linha[i];
      if (char === '"') {
        dentroAspas = !dentroAspas;
      } else if (char === separador && !dentroAspas) {
        resultado.push(atual.trim().replace(/^"|"$/g, ""));
        atual = "";
      } else {
        atual += char;
      }
    }
    resultado.push(atual.trim().replace(/^"|"$/g, ""));
    return resultado;
  };

  const cabecalhos = splitLinha(linhas[0]).map((h) => h.toLowerCase());

  // Encontrar índices das colunas padrão
  const idxNome = cabecalhos.findIndex((h) =>
    ["nome", "name", "titulo", "title", "contato"].includes(h),
  );
  const idxCargo = cabecalhos.findIndex((h) =>
    ["cargo", "role", "title_job", "função", "funcao", "posição", "posicao"].includes(h),
  );
  const idxEmpresa = cabecalhos.findIndex((h) =>
    ["empresa", "company", "organization", "organização", "organizacao"].includes(h),
  );
  const idxEmail = cabecalhos.findIndex((h) => ["email", "e-mail", "mail"].includes(h));
  const idxTelefone = cabecalhos.findIndex((h) =>
    ["telefone", "phone", "celular", "mobile", "tel"].includes(h),
  );
  const idxPai = cabecalhos.findIndex((h) =>
    ["pai", "parent", "chefe", "boss", "gestor", "pai_id"].includes(h),
  );
  const idxTags = cabecalhos.findIndex((h) => ["tags", "tag", "categorias"].includes(h));
  const idxNotas = cabecalhos.findIndex((h) =>
    ["notas", "notes", "corpo", "observacoes", "observações", "descrição", "descricao"].includes(h),
  );

  const contatos: ContatoImportadoCSV[] = [];

  for (let i = 1; i < linhas.length; i++) {
    const vals = splitLinha(linhas[i]);
    const nome = idxNome >= 0 ? vals[idxNome] : vals[0];
    if (!nome) continue;

    const cargo = idxCargo >= 0 ? vals[idxCargo] : undefined;
    const empresa = idxEmpresa >= 0 ? vals[idxEmpresa] : undefined;
    const email = idxEmail >= 0 ? vals[idxEmail] : undefined;
    const telefone = idxTelefone >= 0 ? vals[idxTelefone] : undefined;
    const paiVal = idxPai >= 0 ? vals[idxPai] : undefined;
    const tagsVal = idxTags >= 0 ? vals[idxTags] : undefined;
    const corpo = idxNotas >= 0 ? vals[idxNotas] : "";

    const tags = tagsVal
      ? tagsVal
          .split(/[,|;]/)
          .map((t) => t.trim())
          .filter(Boolean)
      : [];

    // Quaisquer outras colunas não padrão viram propriedades personalizadas
    const propriedades: Record<string, string> = {};
    cabecalhos.forEach((col, idx) => {
      if (
        idx !== idxNome &&
        idx !== idxCargo &&
        idx !== idxEmpresa &&
        idx !== idxEmail &&
        idx !== idxTelefone &&
        idx !== idxPai &&
        idx !== idxTags &&
        idx !== idxNotas &&
        vals[idx]
      ) {
        propriedades[col] = vals[idx];
      }
    });

    contatos.push({
      titulo: nome,
      cargo: cargo || undefined,
      empresa: empresa || undefined,
      email: email || undefined,
      telefone: telefone || undefined,
      paiId: paiVal ? slugifyNomeContato(paiVal) : undefined,
      tags,
      propriedades,
      corpo: corpo || "",
    });
  }

  return contatos;
}

/**
 * Exporta os contatos formatados para CSV.
 */
export function exportarCSVContatos(contatos: Contato[]): string {
  const colunasBase = ["Nome", "Cargo", "Empresa", "Email", "Telefone", "Pai_ID", "Tags", "Notas"];

  // Coleta todas as chaves de propriedades personalizadas únicas
  const chavesExtrasSet = new Set<string>();
  for (const c of contatos) {
    for (const k of Object.keys(c.propriedades)) {
      chavesExtrasSet.add(k);
    }
  }
  const chavesExtras = Array.from(chavesExtrasSet);

  const cabecalhos = [...colunasBase, ...chavesExtras];

  const escaparCSV = (val: string) => {
    if (!val) return "";
    if (val.includes(",") || val.includes(";") || val.includes('"') || val.includes("\n")) {
      return `"${val.replace(/"/g, '""')}"`;
    }
    return val;
  };

  const linhas = [cabecalhos.join(",")];

  for (const c of contatos) {
    const valoresBase = [
      escaparCSV(c.titulo),
      escaparCSV(c.cargo || ""),
      escaparCSV(c.empresa || ""),
      escaparCSV(c.email || ""),
      escaparCSV(c.telefone || ""),
      escaparCSV(c.paiId || ""),
      escaparCSV(c.tags.join(";")),
      escaparCSV(c.corpo.replace(/\r?\n/g, " ")),
    ];

    const valoresExtras = chavesExtras.map((k) => escaparCSV(c.propriedades[k] || ""));

    linhas.push([...valoresBase, ...valoresExtras].join(","));
  }

  return linhas.join("\n");
}
