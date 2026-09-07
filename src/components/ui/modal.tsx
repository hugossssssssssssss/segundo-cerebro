import * as React from "react"
import { useCallback, useEffect, useRef, useState } from "react"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Botao } from "./button"

/* ---------------------------------------------------------------- Modal */

export interface ModalProps {
  aberto: boolean
  aoFechar: () => void
  titulo: React.ReactNode
  children: React.ReactNode
  rodape?: React.ReactNode
  /** Quando true, fechar sem salvar pede confirmação */
  temMudancas?: boolean
  tamanho?: "padrao" | "largo" | "extra-largo"
}

export function Modal({
  aberto,
  aoFechar,
  titulo,
  children,
  rodape,
  temMudancas,
  tamanho = "padrao",
}: ModalProps) {
  const [confirmandoDescarte, setConfirmandoDescarte] = useState(false)
  const [arrastoY, setArrastoY] = useState(0)
  const [toqueInicialY, setToqueInicialY] = useState<number | null>(null)

  const tentarFechar = useCallback(() => {
    if (temMudancas) {
      setConfirmandoDescarte(true)
      return
    }
    aoFechar()
  }, [temMudancas, aoFechar])

  const lidarTouchStart = (e: React.TouchEvent) => {
    setToqueInicialY(e.touches[0].clientY)
  }

  const lidarTouchMove = (e: React.TouchEvent) => {
    if (toqueInicialY === null) return
    const deltaY = e.touches[0].clientY - toqueInicialY
    if (deltaY > 0) {
      setArrastoY(deltaY)
    }
  }

  const lidarTouchEnd = () => {
    if (arrastoY > 80) {
      tentarFechar()
    }
    setArrastoY(0)
    setToqueInicialY(null)
  }

  // Esc fecha; e enquanto o modal está aberto o fundo não rola atrás dele
  useEffect(() => {
    if (!aberto) return

    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === "Escape") tentarFechar()
    }
    document.addEventListener("keydown", aoTeclar)

    const overflowAnterior = document.body.style.overflow
    document.body.style.overflow = "hidden"

    return () => {
      document.removeEventListener("keydown", aoTeclar)
      document.body.style.overflow = overflowAnterior
    }
  }, [aberto, tentarFechar])

  if (!aberto) return null

  const maxLargura =
    tamanho === "extra-largo"
      ? "sm:max-w-5xl"
      : tamanho === "largo"
        ? "sm:max-w-3xl"
        : "sm:max-w-2xl"

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4 backdrop-blur-xs animate-in fade-in duration-150 overscroll-none select-none sm:select-auto"
      onClick={tentarFechar}
      role="dialog"
      aria-modal="true"
      aria-label={typeof titulo === "string" ? titulo : undefined}
    >
      <div
        style={{
          transform: arrastoY > 0 ? `translateY(${arrastoY}px)` : undefined,
          transition: arrastoY === 0 ? "transform 0.2s ease" : "none",
        }}
        className={cn(
          "flex max-h-[90dvh] sm:max-h-[92dvh] w-full flex-col rounded-t-3xl border-t border-border sm:border bg-card shadow-2xl sm:rounded-2xl overflow-hidden animate-in slide-in-from-bottom sm:zoom-in-95 duration-200",
          maxLargura
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Puxador nativo de Bottom Sheet no mobile */}
        <div
          onTouchStart={lidarTouchStart}
          onTouchMove={lidarTouchMove}
          onTouchEnd={lidarTouchEnd}
          className="w-full pt-3 pb-1 sm:hidden flex flex-col items-center justify-center cursor-grab active:cursor-grabbing touch-none"
        >
          <div className="w-12 h-1.5 rounded-full bg-muted-foreground/30 select-none hover:bg-muted-foreground/50 transition-colors" />
        </div>

        <div
          onTouchStart={lidarTouchStart}
          onTouchMove={lidarTouchMove}
          onTouchEnd={lidarTouchEnd}
          className="flex shrink-0 items-center justify-between border-b border-border px-5 py-3.5 sm:py-4 touch-none"
        >
          <h2 className="text-lg font-semibold text-foreground tracking-tight">{titulo}</h2>
          <Botao
            variante="fantasma"
            tamanho="icone"
            onClick={tentarFechar}
            aria-label="Fechar"
            className="touch-manipulation"
          >
            <X size={18} />
          </Botao>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 overscroll-contain select-text">{children}</div>

        {rodape && (
          <div className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-border px-5 py-3.5 sm:py-4 pb-[max(env(safe-area-inset-bottom),14px)] bg-muted/20">
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
          setConfirmandoDescarte(false)
          aoFechar()
        }}
        aoCancelar={() => setConfirmandoDescarte(false)}
      />
    </div>
  )
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
  aberto: boolean
  titulo: string
  descricao: string
  textoConfirmar?: string
  textoCancelar?: string
  varianteConfirmar?: "primario" | "perigo"
  aoConfirmar: () => void
  aoCancelar: () => void
}) {
  useEffect(() => {
    if (!aberto) return
    const aoTecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation()
        aoCancelar()
      }
    }
    window.addEventListener("keydown", aoTecla)
    return () => window.removeEventListener("keydown", aoTecla)
  }, [aberto, aoCancelar])

  if (!aberto) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-150 overscroll-none"
      onClick={aoCancelar}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-confirmacao-titulo"
    >
      <div
        className="w-full max-w-sm rounded-t-3xl sm:rounded-2xl border-t border-border sm:border bg-card p-5 pb-[max(env(safe-area-inset-bottom),20px)] sm:pb-5 shadow-2xl space-y-4 animate-in slide-in-from-bottom sm:zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1.5 rounded-full bg-muted-foreground/30 mx-auto -mt-1 mb-2 sm:hidden select-none" />
        <div className="space-y-1.5">
          <h3 id="modal-confirmacao-titulo" className="text-base font-semibold text-foreground">{titulo}</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">{descricao}</p>
        </div>
        <div className="flex items-center justify-end gap-2 pt-2">
          <Botao variante="neutro" tamanho="pequeno" onClick={aoCancelar} className="touch-manipulation min-h-[40px] px-4">
            {textoCancelar}
          </Botao>
          <Botao variante={varianteConfirmar} tamanho="pequeno" onClick={aoConfirmar} className="touch-manipulation min-h-[40px] px-4">
            {textoConfirmar}
          </Botao>
        </div>
      </div>
    </div>
  )
}

/* ---------------------------------------------------- Modal de Entrada de Texto */

export function ModalEntradaTexto({
  aberto,
  titulo,
  descricao,
  placeholder = "",
  valorInicial = "",
  textoConfirmar = "Confirmar",
  textoCancelar = "Cancelar",
  aoConfirmar,
  aoCancelar,
}: {
  aberto: boolean
  titulo: string
  descricao?: string
  placeholder?: string
  valorInicial?: string
  textoConfirmar?: string
  textoCancelar?: string
  aoConfirmar: (valor: string) => void
  aoCancelar: () => void
}) {
  const [valor, setValor] = useState(valorInicial)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (aberto) {
      setValor(valorInicial)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [aberto, valorInicial])

  useEffect(() => {
    if (!aberto) return
    const aoTecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation()
        aoCancelar()
      }
    }
    window.addEventListener("keydown", aoTecla)
    return () => window.removeEventListener("keydown", aoTecla)
  }, [aberto, aoCancelar])

  if (!aberto) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-150 overscroll-none"
      onClick={aoCancelar}
      role="dialog"
      aria-modal="true"
    >
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (valor.trim()) {
            aoConfirmar(valor.trim())
          }
        }}
        className="w-full max-w-sm rounded-t-3xl sm:rounded-2xl border-t border-border sm:border bg-card p-5 pb-[max(env(safe-area-inset-bottom),20px)] sm:pb-5 shadow-2xl space-y-4 animate-in slide-in-from-bottom sm:zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1.5 rounded-full bg-muted-foreground/30 mx-auto -mt-1 mb-2 sm:hidden select-none" />
        <div className="space-y-1.5">
          <h3 className="text-base font-semibold text-foreground">{titulo}</h3>
          {descricao && <p className="text-xs text-muted-foreground leading-relaxed">{descricao}</p>}
        </div>

        <input
          ref={inputRef}
          type="text"
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-hidden focus:ring-1 focus:ring-primary touch-manipulation"
        />

        <div className="flex items-center justify-end gap-2 pt-1">
          <Botao type="button" variante="neutro" tamanho="pequeno" onClick={aoCancelar} className="touch-manipulation min-h-[40px] px-4">
            {textoCancelar}
          </Botao>
          <Botao type="submit" variante="primario" tamanho="pequeno" disabled={!valor.trim()} className="touch-manipulation min-h-[40px] px-4">
            {textoConfirmar}
          </Botao>
        </div>
      </form>
    </div>
  )
}
