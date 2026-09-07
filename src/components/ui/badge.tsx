import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground shadow-xs hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive/15 text-destructive",
        outline: "text-foreground border-border",
        sucesso: "border-transparent bg-[var(--success)]/15 text-[var(--success)]",
        aviso: "border-transparent bg-[var(--warning)]/15 text-[var(--warning)]",
        perigo: "border-transparent bg-destructive/15 text-destructive",
        primario: "border-transparent bg-primary/15 text-primary",
        neutro: "border-transparent bg-secondary text-secondary-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export type TomSelo = "neutro" | "sucesso" | "aviso" | "perigo" | "primario"

export interface SeloProps extends React.HTMLAttributes<HTMLSpanElement> {
  children?: React.ReactNode
  tom?: TomSelo
  className?: string
}

function Selo({ children, tom = "neutro", className, ...props }: SeloProps) {
  return (
    <span
      className={cn(badgeVariants({ variant: tom }), className)}
      {...props}
    >
      {children}
    </span>
  )
}

export { Badge, Selo, badgeVariants }

