/**
 * Extrator e simulador de física 3D para o Grafo Neural de Relacionamentos.
 *
 * Mapeia todas as entidades do repositório (Notas, Tarefas, Metas, Entregas,
 * Referências e Lousas), extrai os relacionamentos cruzados (@menções, tags e links)
 * e gera um grafo tridimensional com simulação de forças físicas.
 */

import { type ItemRepo, ehArquivoInternoOuSistema } from "./repo";
import { tituloProvavel } from "./markdown";
import { montarIndice, extrairLinks } from "./links";

export type TipoNoGrafo =
  | "nota"
  | "tarefa"
  | "meta"
  | "entrega"
  | "referencia"
  | "lousa"
  | "contato"
  | "tag";

export type NoGrafo3D = {
  id: string;
  caminho: string;
  titulo: string;
  tipo: TipoNoGrafo;
  tags: string[];
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  raio: number;
  cor: string;
  conexoesCount: number;
};

export type ArestaGrafo3D = {
  id: string;
  origem: string;
  destino: string;
  forca: number;
  rotulo?: string;
};

export type DadosGrafo3D = {
  nos: NoGrafo3D[];
  arestas: ArestaGrafo3D[];
};

export const CORES_TIPOS_GRAFO: Record<TipoNoGrafo, string> = {
  nota: "#89b4fa",       // Azul Pastel (Sky/Blue)
  tarefa: "#a6e3a1",     // Verde Pastel (Green)
  meta: "#fab387",       // Pêssego Pastel (Peach/Orange)
  entrega: "#f5c2e7",    // Rosa Pastel (Pink)
  referencia: "#cba6f7", // Lilás Pastel (Mauve/Purple)
  lousa: "#89dceb",      // Ciano Pastel (Sky)
  contato: "#f9e2af",    // Amarelo Pastel (Yellow)
  tag: "#cdd6f4",        // Lavanda Claro (Lavender/Text)
};

export function construirGrafo3D(
  itens: ItemRepo[],
  { incluirTags = true }: { incluirTags?: boolean } = {}
): DadosGrafo3D {
  const nosMap = new Map<string, NoGrafo3D>();
  const arestas: ArestaGrafo3D[] = [];
  const arestaSet = new Set<string>();

  // Helper para determinar o tipo da entidade pelo caminho ou frontmatter
  const determinarTipo = (item: ItemRepo): TipoNoGrafo => {
    const t = String(item.doc.dados.tipo || "").toLowerCase();
    if (t === "tarefa" || item.caminho.startsWith("tarefas/")) return "tarefa";
    if (t === "meta" || item.caminho.startsWith("pdi/metas/")) return "meta";
    if (t === "entrega" || item.caminho.startsWith("pdi/entregas/")) return "entrega";
    if (t === "referencia" || item.caminho.startsWith("referencias/")) return "referencia";
    if (t === "lousa" || item.caminho.startsWith("lousas/")) return "lousa";
    if (t === "contato" || item.caminho.startsWith("contatos/")) return "contato";
    return "nota";
  };

  // 1. Cria nós para cada documento no repositório
  for (const item of itens) {
    if (
      ehArquivoInternoOuSistema(item.caminho) ||
      item.caminho.startsWith(".lixeira/") ||
      item.caminho.startsWith(".klaus/") ||
      item.caminho.includes("/.klaus/") ||
      item.caminho.includes("templates/") ||
      item.caminho.startsWith("referencias/imagens/")
    ) {
      continue;
    }

    const tipo = determinarTipo(item);
    const titulo = String(item.doc.dados.titulo || tituloProvavel(item.doc, item.nome));
    const tags = Array.isArray(item.doc.dados.tags) ? item.doc.dados.tags : [];

    // Posição inicial tridimensional em esfera aleatória
    const r = 250 * Math.cbrt(Math.random());
    const theta = Math.random() * 2 * Math.PI;
    const phi = Math.acos(2 * Math.random() - 1);

    nosMap.set(item.caminho, {
      id: item.caminho,
      caminho: item.caminho,
      titulo,
      tipo,
      tags,
      x: r * Math.sin(phi) * Math.cos(theta),
      y: r * Math.sin(phi) * Math.sin(theta),
      z: r * Math.cos(phi),
      vx: 0,
      vy: 0,
      vz: 0,
      raio: tipo === "meta" || tipo === "lousa" ? 14 : 10,
      cor: CORES_TIPOS_GRAFO[tipo] || "#89b4fa",
      conexoesCount: 0,
    });
  }

  // 2. Extrai relacionamentos por menções (@título e [[título]]) e campo relacionamentos
  const indiceAlvos = montarIndice(itens);

  const adicionarAresta = (caminhoOrigem: string, caminhoDestino: string, rotulo: string, forca = 1) => {
    if (caminhoOrigem === caminhoDestino) return;
    const arestaKey = [caminhoOrigem, caminhoDestino].sort().join("<->");
    if (!arestaSet.has(arestaKey)) {
      arestaSet.add(arestaKey);
      arestas.push({
        id: arestaKey,
        origem: caminhoOrigem,
        destino: caminhoDestino,
        forca,
        rotulo,
      });

      const noOrigem = nosMap.get(caminhoOrigem);
      if (noOrigem) noOrigem.conexoesCount++;

      const noDestino = nosMap.get(caminhoDestino);
      if (noDestino) noDestino.conexoesCount++;
    }
  };

  for (const [caminho, no] of nosMap.entries()) {
    const item = itens.find((i) => i.caminho === caminho);
    if (!item) continue;

    // Conexões semânticas do corpo (@menções e [[links]])
    const links = extrairLinks(item.texto, indiceAlvos);
    for (const link of links) {
      if (link.alvo && link.alvo.caminho !== caminho) {
        adicionarAresta(caminho, link.alvo.caminho, "menciona", 1);
      }
    }

    // Conexões pelo campo `relacionamentos` do frontmatter
    const relsFrontmatter = Array.isArray(item.doc.dados.relacionamentos)
      ? item.doc.dados.relacionamentos
      : [];

    for (const rel of relsFrontmatter) {
      if (typeof rel === "string" && rel.trim()) {
        const relNorm = rel.toLowerCase().trim();
        const alvoResolvido = indiceAlvos.get(relNorm);
        if (alvoResolvido && alvoResolvido.caminho !== caminho) {
          adicionarAresta(caminho, alvoResolvido.caminho, "menciona", 1);
        }
      }
    }

    // Conexões estruturais: Entrega -> Metas
    const metasVinculadas = Array.isArray(item.doc.dados.metas) ? item.doc.dados.metas : [];
    for (const metaSlug of metasVinculadas) {
      if (typeof metaSlug === "string" && metaSlug.trim()) {
        const alvoMeta = indiceAlvos.get(metaSlug.toLowerCase().trim()) ||
                         itens.find((i) => i.caminho === `pdi/metas/${metaSlug}.md` || i.caminho.endsWith(`/${metaSlug}.md`));
        if (alvoMeta) {
          adicionarAresta(caminho, "caminho" in alvoMeta ? alvoMeta.caminho : (alvoMeta as any).caminho, "alimenta", 1.2);
        }
      }
    }

    // Conexões estruturais: Contato -> Contato Pai
    const paiId = typeof item.doc.dados.pai_id === "string" ? item.doc.dados.pai_id : typeof item.doc.dados.pai === "string" ? item.doc.dados.pai : undefined;
    if (paiId && paiId.trim()) {
      const alvoPai = indiceAlvos.get(paiId.toLowerCase().trim()) ||
                      itens.find((i) => i.caminho === `contatos/${paiId}.md` || i.caminho.endsWith(`/${paiId}.md`));
      if (alvoPai) {
        adicionarAresta(caminho, "caminho" in alvoPai ? alvoPai.caminho : (alvoPai as any).caminho, "lider", 1.2);
      }
    }

    // 3. Conexões por Tags Compartilhadas
    if (incluirTags && no.tags.length > 0) {
      const configGlob = typeof window !== "undefined" ? JSON.parse(localStorage.getItem("klaus-propriedades-globais") || "{}") : {};
      const coresTagsGlobais: Record<string, string> = configGlob.coresTags || {};

      for (const tag of no.tags) {
        if (!tag || typeof tag !== "string") continue;
        const tagNomeLimpo = tag.trim().replace(/^#+/, "");
        if (!tagNomeLimpo) continue;

        const tagId = `tag_${tagNomeLimpo.toLowerCase()}`;
        if (!nosMap.has(tagId)) {
          const r = 300 * Math.cbrt(Math.random());
          const theta = Math.random() * 2 * Math.PI;
          const phi = Math.acos(2 * Math.random() - 1);
          const corTag = coresTagsGlobais[tagNomeLimpo] || CORES_TIPOS_GRAFO.tag;

          nosMap.set(tagId, {
            id: tagId,
            caminho: tagId,
            titulo: `#${tagNomeLimpo}`,
            tipo: "tag",
            tags: [tagNomeLimpo],
            x: r * Math.sin(phi) * Math.cos(theta),
            y: r * Math.sin(phi) * Math.sin(theta),
            z: r * Math.cos(phi),
            vx: 0,
            vy: 0,
            vz: 0,
            raio: 8,
            cor: corTag,
            conexoesCount: 0,
          });
        }

        adicionarAresta(caminho, tagId, "tag", 0.8);
      }
    }
  }

  // Ajusta o raio do nó dinamicamente de acordo com o número de conexões (hub de conhecimento)
  for (const no of nosMap.values()) {
    no.raio = Math.min(28, no.raio + Math.min(no.conexoesCount * 1.5, 14));
  }

  return {
    nos: Array.from(nosMap.values()),
    arestas,
  };
}

/** Executa uma iteração da simulação de forças físicas 3D (Repulsão + Mola de Atração + Gravidade Central) */
export function simularPassoFisica3D(dados: DadosGrafo3D, amortecimento = 0.85) {
  const { nos, arestas } = dados;
  const mapaNos = new Map(nos.map((n) => [n.id, n]));

  // 1. Força de repulsão eletrostática entre todos os nós (Coulomb)
  const FORCA_REPULSAO = 1200;
  for (let i = 0; i < nos.length; i++) {
    for (let j = i + 1; j < nos.length; j++) {
      const n1 = nos[i];
      const n2 = nos[j];

      let dx = n2.x - n1.x;
      let dy = n2.y - n1.y;
      let dz = n2.z - n1.z;
      let distSq = dx * dx + dy * dy + dz * dz + 1;
      let dist = Math.sqrt(distSq);

      if (dist < 1) {
        dx = (Math.random() - 0.5) * 2;
        dy = (Math.random() - 0.5) * 2;
        dz = (Math.random() - 0.5) * 2;
        dist = 1;
      }

      const f = FORCA_REPULSAO / (distSq * dist);
      const fx = dx * f;
      const fy = dy * f;
      const fz = dz * f;

      n1.vx -= fx;
      n1.vy -= fy;
      n1.vz -= fz;

      n2.vx += fx;
      n2.vy += fy;
      n2.vz += fz;
    }
  }

  // 2. Força de atração em mola pelas arestas (Hooke)
  const COMPRIMENTO_MOLA = 120;
  const K_MOLA = 0.04;
  for (const a of arestas) {
    const n1 = mapaNos.get(a.origem);
    const n2 = mapaNos.get(a.destino);
    if (!n1 || !n2) continue;

    const dx = n2.x - n1.x;
    const dy = n2.y - n1.y;
    const dz = n2.z - n1.z;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;

    const delta = dist - COMPRIMENTO_MOLA;
    const f = delta * K_MOLA * a.forca;

    const fx = (dx / dist) * f;
    const fy = (dy / dist) * f;
    const fz = (dz / dist) * f;

    n1.vx += fx;
    n1.vy += fy;
    n1.vz += fz;

    n2.vx -= fx;
    n2.vy -= fy;
    n2.vz -= fz;
  }

  // 3. Gravidade central e atualização de posição com amortecimento
  const K_CENTRO = 0.005;
  for (const n of nos) {
    n.vx -= n.x * K_CENTRO;
    n.vy -= n.y * K_CENTRO;
    n.vz -= n.z * K_CENTRO;

    n.vx *= amortecimento;
    n.vy *= amortecimento;
    n.vz *= amortecimento;

    n.x += n.vx;
    n.y += n.vy;
    n.z += n.vz;
  }
}
