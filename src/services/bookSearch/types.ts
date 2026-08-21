export interface LivroBuscado {
  id: string; // Ex: gutenberg-16328 ou openlibrary-OL12345W
  titulo: string;
  autores: string[];
  idioma: string;
  formato: string[];
  tamanho: string;
  fonte: string;
  capaUrl?: string;
  linksDownload: Record<string, string>; // Ex: { "EPUB": "...", "PDF": "..." }
  anoPublicacao?: number;
}

export interface ConectorBusca {
  nome: string;
  buscar(query: string, idioma?: string): Promise<LivroBuscado[]>;
}
