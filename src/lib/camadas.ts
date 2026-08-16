/**
 * Sistema de Hierarquia e Gerenciamento de Camadas (Overlays, Modais, Janelas Flutuantes e Toasts)
 * do Klaus.
 *
 * Este módulo gerencia as regras de empilhamento (LIFO), controle de z-index,
 * trava inteligente de rolagem da página (scroll lock) e fechamento ordenado via tecla Escape.
 */

export const CAMADAS_Z_INDEX = {
  CONTEUDO_BASE: "z-0",
  NAVEGACAO_HEADER: "z-40",
  GAVETA_MOBILE: "z-[100]",
  PAINEL_NOTION_BASE: "z-[200]",
  FERRAMENTAS_APP: "z-[300]",
  MODAIS_GLOBAIS: "z-[400]",
  JANELA_FLUTUANTE: "z-[500]",
  CONFIRMACAO_CRITICA: "z-[600]",
  TOASTS_ALERTAS: "z-[700]",
} as const;

export const NIVEIS_CAMADAS = {
  GAVETA_MOBILE: 100,
  PAINEL_NOTION_BASE: 200,
  FERRAMENTAS_APP: 300,
  MODAIS_GLOBAIS: 400,
  JANELA_FLUTUANTE: 500,
  CONFIRMACAO_CRITICA: 600,
  TOASTS_ALERTAS: 700,
} as const;

export interface CamadaAtiva {
  id: string;
  nivel: number;
  temBackdrop: boolean;
  aoFechar: () => void;
}

class GerenciadorCamadas {
  private pilha: CamadaAtiva[] = [];
  private escutandoEsc = false;

  constructor() {
    this.iniciarEscutadorGlobalEsc();
  }

  /**
   * Registra uma nova camada/modal ativa. Retorna uma função de limpeza (desregistro).
   */
  public registrar(camada: CamadaAtiva): () => void {
    // Se a camada já existe pelo id, atualiza
    this.pilha = this.pilha.filter((c) => c.id !== camada.id);
    this.pilha.push(camada);
    // Ordenar pilha por nível ascendente
    this.pilha.sort((a, b) => a.nivel - b.nivel);

    this.atualizarScrollLock();

    return () => {
      this.desregistrar(camada.id);
    };
  }

  /**
   * Remove uma camada da pilha pelo ID.
   */
  public desregistrar(id: string): void {
    this.pilha = this.pilha.filter((c) => c.id !== id);
    this.atualizarScrollLock();
  }

  /**
   * Fecha a camada mais alta do topo da pilha (LIFO). Retorna true se fechou algo.
   */
  public fecharTopo(): boolean {
    if (this.pilha.length === 0) return false;
    const top = this.pilha[this.pilha.length - 1];
    top.aoFechar();
    return true;
  }

  /**
   * Verifica se há alguma camada com backdrop ativo (para travar o scroll da página).
   */
  public temBackdropAtivo(): boolean {
    return this.pilha.some((c) => c.temBackdrop);
  }

  /**
   * Limpa todas as camadas ativas.
   */
  public limpar(): void {
    this.pilha = [];
    this.atualizarScrollLock();
  }

  /**
   * Atualiza o estado de overflow do body (scroll lock).
   */
  private atualizarScrollLock(): void {
    if (typeof document === "undefined") return;
    if (this.temBackdropAtivo()) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
  }

  /**
   * Inicia escutador global da tecla ESC.
   */
  private iniciarEscutadorGlobalEsc(): void {
    if (typeof window === "undefined" || this.escutandoEsc) return;
    this.escutandoEsc = true;

    window.addEventListener("keydown", (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        // Se a tecla ESC foi pressionada num input ativo (sem shift/ctrl/cmd), permite fechar o topo
        const fecharSucesso = this.fecharTopo();
        if (fecharSucesso) {
          e.preventDefault();
        }
      }
    });
  }
}

export const gerenciadorCamadas = new GerenciadorCamadas();
