/**
 * A rede de proteção do app.
 *
 * Sem isto, um único erro de renderização — um `.md` com formato inesperado,
 * um JSON de lousa corrompido, um campo que virou `undefined` — apagava a tela
 * inteira e deixava um retângulo branco. No celular, sem console, isso é
 * indistinguível de "o app morreu de vez".
 *
 * O risco aqui é maior que num app comum porque os dados são arquivos que você
 * edita à mão pelo github.com. O app JÁ trata entrada malformada muito bem
 * (ver `lerMarkdown`), mas tratamento tem furo, e furo sem rede de proteção
 * custa a confiança na ferramenta inteira.
 *
 * São dois usos:
 *   - `<LimiteDeErro>` na raiz, em `App.tsx`, para o app não sumir nunca.
 *   - `<LimiteDeErro chave={pathname}>` em volta das rotas, para que um erro
 *     numa tela não derrube a navegação — a barra lateral continua ali e você
 *     consegue ir para outro lugar sem recarregar.
 *
 * O `chave` é o que faz o boundary se recuperar sozinho ao trocar de tela:
 * quando ela muda, o estado de erro é zerado.
 */

import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = {
  children: ReactNode;
  /** Muda de valor → o erro é esquecido e a tela tenta renderizar de novo. */
  chave?: string;
  /** Nome da área, para a mensagem ficar concreta ("na tela de Tarefas"). */
  area?: string;
};

type Estado = {
  erro: Error | null;
  /** Onde o React diz que o erro aconteceu — ajuda a achar o culpado. */
  pilhaComponentes: string;
};

export class LimiteDeErro extends Component<Props, Estado> {
  state: Estado = { erro: null, pilhaComponentes: "" };

  static getDerivedStateFromError(erro: Error): Partial<Estado> {
    return { erro };
  }

  componentDidCatch(erro: Error, info: ErrorInfo) {
    // Único console. do app inteiro que é proposital: quando isto dispara,
    // a pilha é a única pista que sobra, e ela precisa chegar ao DevTools.
    console.error("[Klaus] erro não tratado na interface:", erro, info);
    this.setState({ pilhaComponentes: info.componentStack ?? "" });
  }

  componentDidUpdate(propsAnteriores: Props) {
    // Trocou de tela → esquece o erro e tenta de novo. Sem isto, um erro numa
    // rota deixaria o boundary preso e a próxima tela também apareceria quebrada.
    if (this.state.erro && propsAnteriores.chave !== this.props.chave) {
      this.setState({ erro: null, pilhaComponentes: "" });
    }
  }

  private tentarDeNovo = () => {
    this.setState({ erro: null, pilhaComponentes: "" });
  };

  private recarregar = () => {
    if (typeof window !== "undefined" && "caches" in window) {
      try {
        caches.keys().then((names) => {
          names.forEach((name) => caches.delete(name));
        });
      } catch {}
    }
    window.location.reload();
  };

  private copiarDetalhes = () => {
    const { erro, pilhaComponentes } = this.state;
    const texto = [
      `Klaus — erro na interface${this.props.area ? ` (${this.props.area})` : ""}`,
      `Quando: ${new Date().toLocaleString("pt-BR")}`,
      `Onde: ${window.location.hash || "/"}`,
      "",
      `Mensagem: ${erro?.message ?? "sem mensagem"}`,
      "",
      erro?.stack ?? "",
      pilhaComponentes,
    ].join("\n");
    navigator.clipboard?.writeText(texto);
  };

  render() {
    const { erro } = this.state;
    if (!erro) return this.props.children;

    const ondeTexto = this.props.area
      ? `na tela de ${this.props.area}`
      : "no aplicativo";

    return (
      <div
        role="alert"
        className="mx-auto flex max-w-lg flex-col items-start gap-4 rounded-xl border border-destructive/30 bg-destructive/5 p-6 my-8"
      >
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">
            Alguma coisa quebrou {ondeTexto}
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Nada do que você escreveu foi perdido — seus arquivos continuam no
            GitHub, exatamente como estavam. Isto é uma falha na tela, não nos
            seus dados.
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Se acontecer de novo sempre no mesmo lugar, costuma ser um arquivo
            com formato inesperado. Copie os detalhes abaixo e me mande.
          </p>
        </div>

        <pre className="max-h-32 w-full overflow-auto rounded-lg bg-background/60 p-3 text-xs text-muted-foreground">
          {erro.message || "Erro sem mensagem."}
        </pre>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={this.tentarDeNovo}
            className="inline-flex h-9 items-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            Tentar de novo
          </button>
          <button
            onClick={this.recarregar}
            className="inline-flex h-9 items-center rounded-lg border border-border bg-secondary px-3 text-sm font-medium text-secondary-foreground transition-colors hover:bg-accent"
          >
            Recarregar o app
          </button>
          <button
            onClick={this.copiarDetalhes}
            className="inline-flex h-9 items-center rounded-lg px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            Copiar detalhes
          </button>
        </div>
      </div>
    );
  }
}
