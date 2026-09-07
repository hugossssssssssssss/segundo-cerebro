import * as React from "react"
import { cn } from "@/lib/utils"
import { Campo } from "./input"

/* --------------------------------------------------------------- Rótulo */

export function Rotulo({
  children,
  dica,
  obrigatorio,
  faltando,
}: {
  children: React.ReactNode
  dica?: string
  obrigatorio?: boolean
  /** true quando o campo é obrigatório e está vazio — destaca em vermelho */
  faltando?: boolean
}) {
  return (
    <div className="mb-1.5">
      <label className="text-sm font-medium">
        {children}
        {obrigatorio && (
          <span
            className={cn(
              "ml-1",
              faltando ? "text-destructive" : "text-muted-foreground"
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
  )
}

/* -------------------------------------------------------- Entrada de Texto */

export function EntradaTexto({
  rotulo,
  dica,
  valor,
  aoMudar,
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  rotulo?: string
  dica?: string
  valor?: string
  aoMudar?: (val: string) => void
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
  )
}

/* --------------------------------------------------------------- Aviso */

export function Aviso({
  tom = "neutro",
  children,
  className,
}: {
  tom?: "neutro" | "erro" | "sucesso"
  children: React.ReactNode
  className?: string
}) {
  const tons = {
    neutro: "border-border bg-secondary text-secondary-foreground",
    erro: "border-destructive/30 bg-destructive/10 text-destructive",
    sucesso:
      "border-[var(--success)]/30 bg-[var(--success)]/10 text-[var(--success)]",
  }
  return (
    <div
      className={cn(
        "rounded-lg border px-4 py-3 text-sm leading-relaxed",
        tons[tom],
        className
      )}
    >
      {children}
    </div>
  )
}

/* --------------------------------------------------------------- Vazio */

export function Vazio({
  titulo,
  descricao,
  icone,
  acao,
}: {
  titulo: string
  descricao?: string
  icone?: React.ReactNode
  acao?: React.ReactNode
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
  )
}

/* ----------------------------------------------------------- Carregando */

export function Carregando({ texto = "Carregando…" }: { texto?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-sm text-muted-foreground animate-in fade-in duration-150">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-primary" />
      {texto}
    </div>
  )
}
