import { gutenbergConector } from "./gutenberg";
import { openlibraryConector } from "./openlibrary";
import type { LivroBuscado } from "./types";

const CONECTORES = [gutenbergConector, openlibraryConector];
const TIMEOUT_PADRAO = 9000; // 9 segundos de timeout por conector

export async function buscarLivrosUnificado(
  query: string,
  idioma?: string,
  timeoutMs = TIMEOUT_PADRAO
): Promise<LivroBuscado[]> {
  if (!query || !query.trim()) return [];

  const termoBusca = query.trim();

  // Executa todas as buscas em paralelo
  const promessas = CONECTORES.map(async (conector) => {
    let timerId: ReturnType<typeof setTimeout> | undefined;
    try {
      const timeoutPromessa = new Promise<LivroBuscado[]>((_, reject) => {
        timerId = setTimeout(() => reject(new Error(`Timeout na fonte: ${conector.nome}`)), timeoutMs);
      });

      return await Promise.race([conector.buscar(termoBusca, idioma), timeoutPromessa]);
    } catch (erro) {
      console.warn(`[Buscador de Livros] Erro ou timeout na fonte ${conector.nome}:`, erro);
      throw erro;
    } finally {
      if (timerId) clearTimeout(timerId);
    }
  });

  const resultados = await Promise.allSettled(promessas);
  const livrosAgregados: LivroBuscado[] = [];

  resultados.forEach((res) => {
    if (res.status === "fulfilled") {
      livrosAgregados.push(...res.value);
    }
  });

  // Relevância simples:
  // 1. Títulos que começam exatamente com a busca
  // 2. Títulos que contêm a busca
  // 3. Demais títulos
  const termoLower = termoBusca.toLowerCase();

  return livrosAgregados.sort((a, b) => {
    const aTitulo = a.titulo.toLowerCase();
    const bTitulo = b.titulo.toLowerCase();

    const aComeca = aTitulo.startsWith(termoLower);
    const bComeca = bTitulo.startsWith(termoLower);

    if (aComeca && !bComeca) return -1;
    if (!aComeca && bComeca) return 1;

    const aContem = aTitulo.includes(termoLower);
    const bContem = bTitulo.includes(termoLower);

    if (aContem && !bContem) return -1;
    if (!aContem && bContem) return 1;

    // Se empatar, ordena por ano de publicação (mais recentes primeiro)
    const aAno = a.anoPublicacao || 0;
    const bAno = b.anoPublicacao || 0;
    if (aAno !== bAno) return bAno - aAno;

    // Senão, ordem alfabética
    return a.titulo.localeCompare(b.titulo);
  });
}
