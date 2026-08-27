import type { ConectorBusca, LivroBuscado } from "./types";
import { logger } from "@/lib/logger";

const NOMES_IDIOMAS: Record<string, string> = {
  pt: "Português",
  en: "Inglês",
  es: "Espanhol",
  fr: "Francês",
  de: "Alemão",
  it: "Italiano",
};

function obterNomeIdioma(siglas: string[]): string {
  if (!siglas || siglas.length === 0) return "Desconhecido";
  const sigla = siglas[0].toLowerCase();
  return NOMES_IDIOMAS[sigla] || sigla.toUpperCase();
}

function formatarAutor(nome: string): string {
  if (nome.includes(",")) {
    const partes = nome.split(",");
    return `${partes[1].trim()} ${partes[0].trim()}`;
  }
  return nome;
}

export const gutenbergConector: ConectorBusca = {
  nome: "Project Gutenberg",
  async buscar(query: string, idioma?: string): Promise<LivroBuscado[]> {
    if (!query.trim()) return [];

    try {
      let url = `https://gutendex.com/books/?search=${encodeURIComponent(query)}`;
      if (idioma && idioma !== "todos") {
        url += `&languages=${idioma}`;
      }
      const resposta = await fetch(url);
      
      if (!resposta.ok) {
        throw new Error(`Erro HTTP: ${resposta.status}`);
      }

      const dados = await resposta.json();
      
      if (!dados || !Array.isArray(dados.results)) {
        return [];
      }

      return dados.results.map((item: any) => {
        const autores = Array.isArray(item.authors)
          ? item.authors.map((a: any) => formatarAutor(a.name || ""))
          : [];
        
        const linksDownload: Record<string, string> = {};
        const formatos: string[] = [];
        const formats = item.formats || {};

        if (formats["application/epub+zip"]) {
          linksDownload["EPUB"] = formats["application/epub+zip"];
          formatos.push("EPUB");
        }
        
        if (formats["application/pdf"]) {
          linksDownload["PDF"] = formats["application/pdf"];
          formatos.push("PDF");
        }

        if (formats["text/plain; charset=utf-8"] || formats["text/plain"]) {
          linksDownload["TXT"] = formats["text/plain; charset=utf-8"] || formats["text/plain"];
          formatos.push("TXT");
        }

        if (formats["text/html"]) {
          linksDownload["WEB (Ler Online)"] = formats["text/html"];
          formatos.push("HTML");
        }

        // Capa
        const capaUrl = formats["image/jpeg"] || undefined;

        return {
          id: `gutenberg-${item.id}`,
          titulo: item.title || "Sem título",
          autores,
          idioma: obterNomeIdioma(item.languages),
          formato: formatos,
          tamanho: "Disponível",
          fonte: "Project Gutenberg",
          capaUrl,
          linksDownload,
          anoPublicacao: undefined // Gutendex não provê o ano de publicação original diretamente de forma consistente
        };
      });
    } catch (erro) {
      logger.error("Erro na busca do Project Gutenberg:", erro);
      throw erro;
    }
  }
};
