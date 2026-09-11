import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl font-medium liquid-press focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 cursor-pointer",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-xs hover:opacity-95 hover:shadow-md",
        destructive:
          "bg-destructive text-destructive-foreground shadow-xs hover:opacity-95",
        outline:
          "border border-border/40 bg-card/60 backdrop-blur-md shadow-2xs hover:bg-card/90 hover:border-border/70",
        secondary:
          "liquid-glass-pill text-secondary-foreground hover:bg-accent/80 shadow-2xs",
        ghost: "hover:bg-accent/60 hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 sm:h-10 px-3.5 sm:px-4 py-2 text-xs sm:text-sm",
        sm: "h-7 sm:h-8 rounded-lg px-2.5 sm:px-3 text-xs",
        lg: "h-10 sm:h-11 rounded-2xl px-6 sm:px-8 text-sm sm:text-base",
        icon: "h-8 sm:h-9 w-8 sm:w-9 rounded-xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export type VarianteBotao = "primario" | "neutro" | "fantasma" | "perigo"
export type TamanhoBotao = "normal" | "pequeno" | "icone"

const mapaVariantes: Record<VarianteBotao, ButtonProps["variant"]> = {
  primario: "default",
  neutro: "secondary",
  fantasma: "ghost",
  perigo: "destructive",
}

const mapaTamanhos: Record<TamanhoBotao, ButtonProps["size"]> = {
  normal: "default",
  pequeno: "sm",
  icone: "icon",
}

export interface BotaoProps extends Omit<ButtonProps, "variant" | "size"> {
  variante?: VarianteBotao
  tamanho?: TamanhoBotao
  variant?: ButtonProps["variant"]
  size?: ButtonProps["size"]
}

const Botao = React.forwardRef<HTMLButtonElement, BotaoProps>(
  ({ variante, tamanho, variant, size, ...props }, ref) => {
    const vFinal = variant || (variante ? mapaVariantes[variante] : "default")
    const sFinal = size || (tamanho ? mapaTamanhos[tamanho] : "default")
    return <Button ref={ref} variant={vFinal} size={sFinal} {...props} />
  }
)
Botao.displayName = "Botao"

export { Button, Botao, buttonVariants }

