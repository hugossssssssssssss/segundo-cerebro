import type { ConectorBusca, LivroBuscado } from "./types";

const IDIOMAS_3_LETRAS: Record<string, string> = {
  por: "Português",
  eng: "Inglês",
  spa: "Espanhol",
  fre: "Francês",
  fra: "Francês",
  ger: "Alemão",
  deu: "Alemão",
  ita: "Italiano",
};

function obterIdioma3Letras(siglas: string[]): string {
  if (!siglas || siglas.length === 0) return "Desconhecido";
  const sigla = siglas[0].toLowerCase();
  return IDIOMAS_3_LETRAS[sigla] || sigla.toUpperCase();
}

export const openlibraryConector: ConectorBusca = {
  nome: "Open Library",
  async buscar(query: string): Promise<LivroBuscado[]> {
    if (!query.trim()) return [];

    try {
      // Limitamos a 40 para ter bastante resultados e fazemos a query
      const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=40`;
      const resposta = await fetch(url);
      
      if (!resposta.ok) {
        throw new Error(`Erro HTTP: ${resposta.status}`);
      }

      const dados = await resposta.json();
      
      if (!dados || !Array.isArray(dados.docs)) {
        return [];
      }

      // Filtramos apenas livros que possuem cópia digital no Internet Archive (ia)
      const comCopiaDigital = dados.docs.filter((item: any) => item.ia && item.ia.length > 0);

      return comCopiaDigital.map((item: any) => {
        const autores = Array.isArray(item.author_name) ? item.author_name : [];
        const iaId = item.ia[0];
        
        const linksDownload: Record<string, string> = {
          "EPUB": `https://archive.org/download/${iaId}/${iaId}.epub`,
          "PDF": `https://archive.org/download/${iaId}/${iaId}.pdf`,
          "TXT": `https://archive.org/download/${iaId}/${iaId}_djvu.txt`,
          "WEB (Internet Archive)": `https://archive.org/details/${iaId}`
        };

        const formatos = ["EPUB", "PDF", "TXT", "HTML"];

        // URL da capa
        let capaUrl: string | undefined = undefined;
        if (item.cover_i) {
          capaUrl = `https://covers.openlibrary.org/b/id/${item.cover_i}-M.jpg`;
        } else if (item.cover_edition_key) {
          capaUrl = `https://covers.openlibrary.org/b/olid/${item.cover_edition_key}-M.jpg`;
        }

        return {
          id: `openlibrary-${item.key.replace("/works/", "")}`,
          titulo: item.title || "Sem título",
          autores,
          idioma: obterIdioma3Letras(item.language),
          formato: formatos,
          tamanho: "Disponível",
          fonte: "Open Library",
          capaUrl,
          linksDownload,
          anoPublicacao: item.first_publish_year || undefined
        };
      });
    } catch (erro) {
      console.error("Erro na busca do Open Library:", erro);
      throw erro;
    }
  }
};
