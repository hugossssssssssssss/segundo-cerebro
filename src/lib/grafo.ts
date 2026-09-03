/**
 * Extrator e simulador de física 3D para o Grafo Neural de Relacionamentos.
 *
 * Mapeia todas as entidades do repositório (Notas, Tarefas, Metas, Entregas,
 * Referências e Lousas), extrai os relacionamentos cruzados (@menções, tags e links)
 * e gera um grafo tridimensional com simulação de forças físicas estabilizada.
 */

import { type ItemRepo, ehArquivoInternoOuSistema } from "./repo";
import { tituloProvavel } from "./markdown";
import { montarIndice, extrairLinks, chave, type Alvo } from "./links";
import { tipoDoItem } from "./busca";

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

/**
 * Calcula posição polar determinística baseada no hash do ID/caminho,
 * evitando posições aleatórias saltitantes ao reconstruir o grafo.
 */
function hashStringParaPosicao(str: string): { x: number; y: number; z: number } {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  const u = Math.abs(hash % 1000) / 1000;
  const v = Math.abs((hash >> 3) % 1000) / 1000;
  const w = Math.abs((hash >> 7) % 1000) / 1000;

  const r = 160 + u * 140;
  const theta = v * 2 * Math.PI;
  const phi = Math.acos(2 * w - 1);

  return {
    x: r * Math.sin(phi) * Math.cos(theta),
    y: r * Math.sin(phi) * Math.sin(theta),
    z: r * Math.cos(phi),
  };
}

/**
 * Resolve um identificador, menção ou caminho para um item do acervo.
 * Tolera acentos, minúsculas/maiúsculas, prefixo '@' e caminhos relativos.
 */
function resolverAlvoItem(
  termoOuCaminho: string,
  indice: Map<string, Alvo>,
  itens: ItemRepo[]
): Alvo | null {
  if (!termoOuCaminho || typeof termoOuCaminho !== "string") return null;
  const limpo = termoOuCaminho.replace(/^@+/, "").trim();
  if (!limpo) return null;

  // 1. Busca direta no índice canônico (por título, nome ou caminho)
  const porChave = indice.get(chave(limpo));
  if (porChave) return porChave;

  // 2. Busca por caminho direto ou relativo no acervo
  const porCaminho = itens.find(
    (i) => i.caminho === limpo || i.caminho.endsWith(`/${limpo}`) || i.caminho.endsWith(`/${limpo}.md`)
  );
  if (porCaminho) {
    return {
      caminho: porCaminho.caminho,
      titulo: String(porCaminho.doc.dados.titulo || tituloProvavel(porCaminho.doc, porCaminho.nome)),
      tipo: tipoDoItem(porCaminho),
    };
  }

  // 3. Busca aproximada por título
  const limpoChave = chave(limpo);
  for (const item of itens) {
    const tit = String(item.doc.dados.titulo || tituloProvavel(item.doc, item.nome));
    if (chave(tit) === limpoChave) {
      return {
        caminho: item.caminho,
        titulo: tit,
        tipo: tipoDoItem(item),
      };
    }
  }

  return null;
}

export function construirGrafo3D(
  itens: ItemRepo[],
  {
    incluirTags = true,
    grafoAnterior,
  }: { incluirTags?: boolean; grafoAnterior?: DadosGrafo3D } = {}
): DadosGrafo3D {
  const nosMap = new Map<string, NoGrafo3D>();
  const arestas: ArestaGrafo3D[] = [];
  const arestaSet = new Set<string>();

  // Mapa de posições anteriores para preservar estabilidade espacial
  const mapaAnterior = new Map(grafoAnterior?.nos.map((n) => [n.id, n]) || []);

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

  // 1. Cria nós para cada documento legítimo do usuário no repositório
  for (const item of itens) {
    if (
      ehArquivoInternoOuSistema(item.caminho) ||
      item.caminho.startsWith(".lixeira/") ||
      item.caminho.startsWith(".klaus/") ||
      item.caminho.includes("/.klaus/") ||
      item.caminho.includes("templates/") ||
      item.caminho.startsWith("jogos/") ||
      item.caminho.includes("/jogos/") ||
      item.caminho.startsWith("referencias/imagens/")
    ) {
      continue;
    }

    const titulo = String(item.doc.dados.titulo || tituloProvavel(item.doc, item.nome)).trim();
    // Filtra arquivos técnicos de estado corrompido ou sem título (como '{' vindo de JSON)
    if (!titulo || titulo === "{" || titulo === "}" || titulo === "null" || titulo === "undefined") {
      continue;
    }

    const tipo = determinarTipo(item);
    const tags = Array.isArray(item.doc.dados.tags) ? item.doc.dados.tags : [];

    const anterior = mapaAnterior.get(item.caminho);
    let x: number, y: number, z: number, vx: number, vy: number, vz: number;

    if (anterior) {
      x = anterior.x;
      y = anterior.y;
      z = anterior.z;
      vx = anterior.vx;
      vy = anterior.vy;
      vz = anterior.vz;
    } else {
      const pos = hashStringParaPosicao(item.caminho);
      x = pos.x;
      y = pos.y;
      z = pos.z;
      vx = 0;
      vy = 0;
      vz = 0;
    }

    nosMap.set(item.caminho, {
      id: item.caminho,
      caminho: item.caminho,
      titulo,
      tipo,
      tags,
      x,
      y,
      z,
      vx,
      vy,
      vz,
      raio: tipo === "meta" || tipo === "lousa" ? 14 : 10,
      cor: CORES_TIPOS_GRAFO[tipo] || "#89b4fa",
      conexoesCount: 0,
    });
  }

  // 2. Extrai relacionamentos cruzados
  const indiceAlvos = montarIndice(itens);

  const adicionarAresta = (caminhoOrigem: string, caminhoDestino: string, rotulo: string, forca = 1) => {
    if (!caminhoOrigem || !caminhoDestino || caminhoOrigem === caminhoDestino) return;
    if (!nosMap.has(caminhoOrigem) || !nosMap.has(caminhoDestino)) return;

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

    const textoCompleto = `${item.texto || ""}\n${item.doc.corpo || ""}`;

    // A. Conexões semânticas do corpo (@menções e [[links]])
    const links = extrairLinks(textoCompleto, indiceAlvos);
    for (const link of links) {
      if (link.alvo && link.alvo.caminho !== caminho) {
        adicionarAresta(caminho, link.alvo.caminho, "menciona", 1.2);
      }
    }

    // B. Conexões por links Markdown [texto](link)
    const matchesMdLinks = textoCompleto.matchAll(/\[([^\]]+)\]\(([^)]+)\)/g);
    for (const m of matchesMdLinks) {
      const alvoUrl = m[2]?.trim();
      if (alvoUrl && !alvoUrl.startsWith("http://") && !alvoUrl.startsWith("https://")) {
        const resolvido = resolverAlvoItem(alvoUrl, indiceAlvos, itens) || resolverAlvoItem(m[1], indiceAlvos, itens);
        if (resolvido && resolvido.caminho !== caminho) {
          adicionarAresta(caminho, resolvido.caminho, "link", 1.0);
        }
      }
    }

    // C. Conexões pelo campo `relacionamentos` do frontmatter
    const relsFrontmatter = Array.isArray(item.doc.dados.relacionamentos)
      ? item.doc.dados.relacionamentos
      : typeof item.doc.dados.relacionamentos === "string"
      ? [item.doc.dados.relacionamentos]
      : [];

    for (const rel of relsFrontmatter) {
      if (typeof rel === "string" && rel.trim()) {
        const alvoResolvido = resolverAlvoItem(rel, indiceAlvos, itens);
        if (alvoResolvido && alvoResolvido.caminho !== caminho) {
          adicionarAresta(caminho, alvoResolvido.caminho, "relacionado", 1.2);
        }
      }
    }

    // D. Conexões por campos contextuais: projeto, contatos, notas vinculadas
    if (typeof item.doc.dados.projeto === "string" && item.doc.dados.projeto.trim()) {
      const alvoProjeto = resolverAlvoItem(item.doc.dados.projeto, indiceAlvos, itens);
      if (alvoProjeto && alvoProjeto.caminho !== caminho) {
        adicionarAresta(caminho, alvoProjeto.caminho, "projeto", 1.2);
      }
    }

    const contatos = Array.isArray(item.doc.dados.contatos)
      ? item.doc.dados.contatos
      : typeof item.doc.dados.contato === "string"
      ? [item.doc.dados.contato]
      : [];
    for (const c of contatos) {
      if (typeof c === "string" && c.trim()) {
        const alvoContato = resolverAlvoItem(c, indiceAlvos, itens);
        if (alvoContato && alvoContato.caminho !== caminho) {
          adicionarAresta(caminho, alvoContato.caminho, "contato", 1.0);
        }
      }
    }

    // E. Conexões estruturais: Entrega -> Metas
    const metasVinculadas = Array.isArray(item.doc.dados.metas)
      ? item.doc.dados.metas
      : typeof item.doc.dados.meta === "string"
      ? [item.doc.dados.meta]
      : [];
    for (const metaSlug of metasVinculadas) {
      if (typeof metaSlug === "string" && metaSlug.trim()) {
        const alvoMeta = resolverAlvoItem(metaSlug, indiceAlvos, itens) ||
                         itens.find((i) => i.caminho === `pdi/metas/${metaSlug}.md` || i.caminho.endsWith(`/${metaSlug}.md`));
        if (alvoMeta) {
          const caminhoMeta = "caminho" in alvoMeta ? alvoMeta.caminho : (alvoMeta as any).caminho;
          adicionarAresta(caminho, caminhoMeta, "alimenta", 1.3);
        }
      }
    }

    // F. Conexões estruturais: Contato -> Contato Pai
    const paiId = typeof item.doc.dados.pai_id === "string" ? item.doc.dados.pai_id : typeof item.doc.dados.pai === "string" ? item.doc.dados.pai : undefined;
    if (paiId && paiId.trim()) {
      const alvoPai = resolverAlvoItem(paiId, indiceAlvos, itens) ||
                      itens.find((i) => i.caminho === `contatos/${paiId}.md` || i.caminho.endsWith(`/${paiId}.md`));
      if (alvoPai) {
        const caminhoPai = "caminho" in alvoPai ? alvoPai.caminho : (alvoPai as any).caminho;
        adicionarAresta(caminho, caminhoPai, "lider", 1.2);
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
          const anteriorTag = mapaAnterior.get(tagId);
          let tx: number, ty: number, tz: number;

          if (anteriorTag) {
            tx = anteriorTag.x;
            ty = anteriorTag.y;
            tz = anteriorTag.z;
          } else {
            const pos = hashStringParaPosicao(tagId);
            tx = pos.x;
            ty = pos.y;
            tz = pos.z;
          }

          const corTag = coresTagsGlobais[tagNomeLimpo] || CORES_TIPOS_GRAFO.tag;

          nosMap.set(tagId, {
            id: tagId,
            caminho: tagId,
            titulo: `#${tagNomeLimpo}`,
            tipo: "tag",
            tags: [tagNomeLimpo],
            x: tx,
            y: ty,
            z: tz,
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

/**
 * Executa uma iteração da simulação de forças físicas 3D (Repulsão + Mola de Atração + Gravidade Central).
 * Retorna a velocidade máxima para permitir repouso automático e eliminar tremores contínuos.
 */
export function simularPassoFisica3D(
  dados: DadosGrafo3D,
  amortecimento = 0.85,
  alpha = 1.0
): number {
  const { nos, arestas } = dados;
  if (nos.length === 0 || alpha <= 0.001) return 0;
  const mapaNos = new Map(nos.map((n) => [n.id, n]));

  let velocidadeMaxSq = 0;

  // 1. Força de repulsão eletrostática entre todos os nós (Coulomb)
  const FORCA_REPULSAO = 1200 * alpha;
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
        dx = (i % 2 === 0 ? 1 : -1) * 2;
        dy = (j % 2 === 0 ? 1 : -1) * 2;
        dz = 0;
        dist = 2.8;
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
  const K_MOLA = 0.04 * alpha;
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
  const K_CENTRO = 0.005 * alpha;
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

    const vSq = n.vx * n.vx + n.vy * n.vy + n.vz * n.vz;
    if (vSq > velocidadeMaxSq) {
      velocidadeMaxSq = vSq;
    }
  }

  return Math.sqrt(velocidadeMaxSq);
}
