/**
 * Componentes visuais base, no estilo shadcn/ui mas escritos à mão.
 *
 * Ficam todos num arquivo só de propósito: são poucos, mudam pouco, e
 * assim quem for mexer depois (você ou outra IA) encontra tudo num lugar.
 */

import { cn } from "@/lib/utils";
import { useCallback, useEffect, useState } from "react";
import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  TextareaHTMLAttributes,
  KeyboardEvent as ReactKeyboardEvent,
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

export function EntradaTexto({
  rotulo,
  dica,
  valor,
  aoMudar,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  rotulo?: string;
  dica?: string;
  valor?: string;
  aoMudar?: (val: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      {rotulo && <Rotulo>{rotulo}</Rotulo>}
      <Campo
        value={valor}
        onChange={(e) => aoMudar?.(e.target.value)}
        className={className}
        {...props}
      />
      {dica && <p className="text-xs text-muted-foreground">{dica}</p>}
    </div>
  );
}

/* --------------------------------------------------------------- Cartão */

// `ComponentProps<"div">` e não `HTMLAttributes`: inclui `ref` e `style`, que
// o quadro de tarefas precisa passar para o @dnd-kit posicionar o cartão
// enquanto ele é arrastado. No React 19 o `ref` viaja junto no spread abaixo.
export function Cartao({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
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
  icone,
  acao,
}: {
  titulo: string;
  descricao?: string;
  icone?: ReactNode;
  acao?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/80 bg-card/40 py-12 px-6 text-center animate-in fade-in duration-200">
      {icone && (
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-muted/60 text-muted-foreground shadow-2xs">
          {icone}
        </div>
      )}
      <p className="font-semibold text-base text-foreground">{titulo}</p>
      {descricao && (
        <p className="mt-1 max-w-md text-xs sm:text-sm text-muted-foreground leading-relaxed">
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
  tamanho = "padrao",
}: {
  aberto: boolean;
  aoFechar: () => void;
  titulo: string;
  children: ReactNode;
  rodape?: ReactNode;
  /** Quando true, fechar sem salvar pede confirmação */
  temMudancas?: boolean;
  tamanho?: "padrao" | "largo" | "extra-largo";
}) {
  const [confirmandoDescarte, setConfirmandoDescarte] = useState(false);

  const tentarFechar = useCallback(() => {
    if (temMudancas) {
      setConfirmandoDescarte(true);
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

  const maxLargura =
    tamanho === "extra-largo"
      ? "sm:max-w-5xl"
      : tamanho === "largo"
        ? "sm:max-w-3xl"
        : "sm:max-w-2xl";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4"
      onClick={tentarFechar}
      role="dialog"
      aria-modal="true"
      aria-label={titulo}
    >
      <div
        className={cn(
          "flex max-h-[92dvh] w-full flex-col rounded-t-2xl border border-border bg-card shadow-xl sm:rounded-2xl overflow-hidden",
          maxLargura,
        )}
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

      <ModalConfirmacao
        aberto={confirmandoDescarte}
        titulo="Descartar alterações?"
        descricao="Você tem edições não salvas nesta janela. Se fechar agora, o que digitou será perdido."
        textoConfirmar="Sim, descartar"
        textoCancelar="Continuar editando"
        varianteConfirmar="perigo"
        aoConfirmar={() => {
          setConfirmandoDescarte(false);
          aoFechar();
        }}
        aoCancelar={() => setConfirmandoDescarte(false)}
      />
    </div>
  );
}

/* ------------------------------------------------------------ TagInput */

export function TagInput({
  tags,
  onChange,
  placeholder = "Adicionar tag...",
}: {
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
}) {
  const [input, setInput] = useState("");

  const handleKeyDown = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const val = input.trim().replace(/^#+/, "");
      if (val && !tags.includes(val)) {
        onChange([...tags, val]);
      }
      setInput("");
    } else if (e.key === "Backspace" && input === "" && tags.length > 0) {
      e.preventDefault();
      onChange(tags.slice(0, -1));
    }
  };

  const removeTag = (indexToRemove: number) => {
    onChange(tags.filter((_, index) => index !== indexToRemove));
  };

  return (
    <div
      className={cn(
        "flex min-h-11 w-full flex-wrap items-center gap-1.5 rounded-lg border border-input bg-card px-3 py-2 text-sm",
        "focus-within:outline-none focus-within:ring-2 focus-within:ring-ring"
      )}
    >
      {tags.map((tag, index) => (
        <span
          key={index}
          className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-1 text-xs font-medium text-secondary-foreground"
        >
          #{tag}
          <button
            type="button"
            onClick={() => removeTag(index)}
            className="rounded-full opacity-70 hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={`Remover tag ${tag}`}
          >
            ✕
          </button>
        </span>
      ))}
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={tags.length === 0 ? placeholder : ""}
        className="flex-1 min-w-[120px] bg-transparent focus-visible:outline-none placeholder:text-muted-foreground"
      />
    </div>
  );
}

/* -------------------------------------------------------- ModalConfirmacao */

export function ModalConfirmacao({
  aberto,
  titulo,
  descricao,
  textoConfirmar = "Confirmar",
  textoCancelar = "Cancelar",
  varianteConfirmar = "perigo",
  aoConfirmar,
  aoCancelar,
}: {
  aberto: boolean;
  titulo: string;
  descricao: string;
  textoConfirmar?: string;
  textoCancelar?: string;
  varianteConfirmar?: "primario" | "perigo";
  aoConfirmar: () => void;
  aoCancelar: () => void;
}) {
  useEffect(() => {
    if (!aberto) return;
    const aoTecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        aoCancelar();
      }
    };
    window.addEventListener("keydown", aoTecla);
    return () => window.removeEventListener("keydown", aoTecla);
  }, [aberto, aoCancelar]);

  if (!aberto) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150"
      onClick={aoCancelar}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-confirmacao-titulo"
    >
      <div
        className="w-full max-w-sm rounded-xl border border-border bg-card p-5 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-1.5">
          <h3 id="modal-confirmacao-titulo" className="text-base font-semibold text-foreground">{titulo}</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">{descricao}</p>
        </div>
        <div className="flex items-center justify-end gap-2 pt-2">
          <Botao variante="neutro" tamanho="pequeno" onClick={aoCancelar}>
            {textoCancelar}
          </Botao>
          <Botao variante={varianteConfirmar} tamanho="pequeno" onClick={aoConfirmar}>
            {textoConfirmar}
          </Botao>
        </div>
      </div>
    </div>
  );
}

export { Tooltip } from "./ui/tooltip";
export type { TooltipProps, PosicaoTooltip } from "./ui/tooltip";

