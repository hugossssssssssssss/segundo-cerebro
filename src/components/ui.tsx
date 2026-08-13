/**
 * Componentes visuais base, no estilo shadcn/ui mas escritos à mão.
 *
 * Ficam todos num arquivo só de propósito: são poucos, mudam pouco, e
 * assim quem for mexer depois (você ou outra IA) encontra tudo num lugar.
 */

import { cn } from "@/lib/utils";
import { useCallback, useEffect } from "react";
import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  TextareaHTMLAttributes,
} from "react";

/* ---------------------------------------------------------------- Botão */

type VarianteBotao = "primario" | "neutro" | "fantasma" | "perigo";
type TamanhoBotao = "normal" | "pequeno" | "icone";

const variantes: Record<VarianteBotao, string> = {
  primario:
    "bg-primary text-primary-foreground hover:opacity-90 shadow-sm",
  neutro:
    "bg-secondary text-secondary-foreground hover:bg-accent border border-border",
  fantasma: "hover:bg-accent hover:text-accent-foreground",
  perigo:
    "bg-destructive text-destructive-foreground hover:opacity-90 shadow-sm",
};

const tamanhos: Record<TamanhoBotao, string> = {
  normal: "h-11 px-4 text-sm",
  pequeno: "h-9 px-3 text-sm",
  icone: "h-10 w-10",
};

export function Botao({
  variante = "primario",
  tamanho = "normal",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variante?: VarianteBotao;
  tamanho?: TamanhoBotao;
}) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "disabled:pointer-events-none disabled:opacity-50",
        variantes[variante],
        tamanhos[tamanho],
        className,
      )}
      {...props}
    />
  );
}

/* --------------------------------------------------------------- Campos */

export function Campo({
  className,
  ref,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  ref?: React.Ref<HTMLInputElement>;
}) {
  return (
    <input
      ref={ref}
      className={cn(
        "flex h-11 w-full rounded-lg border border-input bg-card px-3 py-2 text-sm",
        "placeholder:text-muted-foreground",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export function AreaTexto({
  className,
  ref,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & {
  ref?: React.Ref<HTMLTextAreaElement>;
}) {
  return (
    <textarea
      ref={ref}
      className={cn(
        "flex min-h-24 w-full rounded-lg border border-input bg-card px-3 py-2 text-sm",
        "placeholder:text-muted-foreground",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
      {...props}
    />
  );
}

export function Rotulo({
  children,
  dica,
  obrigatorio,
  faltando,
}: {
  children: ReactNode;
  dica?: string;
  obrigatorio?: boolean;
  /** true quando o campo é obrigatório e está vazio — destaca em vermelho */
  faltando?: boolean;
}) {
  return (
    <div className="mb-1.5">
      <label className="text-sm font-medium">
        {children}
        {obrigatorio && (
          <span
            className={cn(
              "ml-1",
              faltando ? "text-destructive" : "text-muted-foreground",
            )}
          >
            *
          </span>
        )}
      </label>
      {faltando ? (
        <p className="mt-0.5 text-xs text-destructive">
          Este campo é obrigatório.
        </p>
      ) : (
        dica && <p className="text-xs text-muted-foreground mt-0.5">{dica}</p>
      )}
    </div>
  );
}

/* --------------------------------------------------------------- Cartão */

export function Cartao({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card text-card-foreground shadow-sm",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

/* --------------------------------------------------------------- Selo */

export function Selo({
  children,
  tom = "neutro",
  className,
}: {
  children: ReactNode;
  tom?: "neutro" | "sucesso" | "aviso" | "perigo" | "primario";
  className?: string;
}) {
  const tons = {
    neutro: "bg-secondary text-secondary-foreground",
    sucesso: "bg-[var(--success)]/15 text-[var(--success)]",
    aviso: "bg-[var(--warning)]/15 text-[var(--warning)]",
    perigo: "bg-destructive/15 text-destructive",
    primario: "bg-primary/15 text-primary",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium",
        tons[tom],
        className,
      )}
    >
      {children}
    </span>
  );
}

/* ------------------------------------------------------------ Feedback */

export function Aviso({
  tom = "neutro",
  children,
}: {
  tom?: "neutro" | "erro" | "sucesso";
  children: ReactNode;
}) {
  const tons = {
    neutro: "border-border bg-secondary text-secondary-foreground",
    erro: "border-destructive/30 bg-destructive/10 text-destructive",
    sucesso: "border-[var(--success)]/30 bg-[var(--success)]/10 text-[var(--success)]",
  };
  return (
    <div className={cn("rounded-lg border px-4 py-3 text-sm", tons[tom])}>
      {children}
    </div>
  );
}

export function Vazio({
  titulo,
  descricao,
  acao,
}: {
  titulo: string;
  descricao?: string;
  acao?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16 px-6 text-center">
      <p className="font-medium">{titulo}</p>
      {descricao && (
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          {descricao}
        </p>
      )}
      {acao && <div className="mt-4">{acao}</div>}
    </div>
  );
}

export function Carregando({ texto = "Carregando…" }: { texto?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-sm text-muted-foreground">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-primary" />
      {texto}
    </div>
  );
}

/* ---------------------------------------------------------------- Modal */

export function Modal({
  aberto,
  aoFechar,
  titulo,
  children,
  rodape,
  temMudancas,
}: {
  aberto: boolean;
  aoFechar: () => void;
  titulo: string;
  children: ReactNode;
  rodape?: ReactNode;
  /** Quando true, fechar sem salvar pede confirmação */
  temMudancas?: boolean;
}) {
  // Fechar por engano com texto digitado é perda de trabalho. Um toque
  // desatento na área escura enquanto se rola um campo longo bastava.
  const tentarFechar = useCallback(() => {
    if (temMudancas && !confirm("Você tem alterações não salvas. Descartar?")) {
      return;
    }
    aoFechar();
  }, [temMudancas, aoFechar]);

  // Esc fecha; e enquanto o modal está aberto o fundo não rola atrás dele
  useEffect(() => {
    if (!aberto) return;

    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === "Escape") tentarFechar();
    };
    document.addEventListener("keydown", aoTeclar);

    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", aoTeclar);
      document.body.style.overflow = overflowAnterior;
    };
  }, [aberto, tentarFechar]);

  if (!aberto) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4"
      onClick={tentarFechar}
      role="dialog"
      aria-modal="true"
      aria-label={titulo}
    >
      {/*
        max-h-[92dvh] e não 92vh: no Android, `vh` ignora o teclado virtual,
        então o rodapé com o botão Salvar ficava empurrado para fora da tela
        enquanto se digitava. `dvh` acompanha a área realmente visível.
      */}
      <div
        className="flex max-h-[92dvh] w-full flex-col rounded-t-2xl border border-border bg-card shadow-xl sm:max-w-2xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-lg font-semibold">{titulo}</h2>
          <Botao
            variante="fantasma"
            tamanho="icone"
            onClick={tentarFechar}
            aria-label="Fechar"
          >
            ✕
          </Botao>
        </div>

        <div className="min-h-0 flex-1 overflow-auto px-5 py-4">{children}</div>

        {rodape && (
          <div className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-border px-5 py-4">
            {rodape}
          </div>
        )}
      </div>
    </div>
  );
}
