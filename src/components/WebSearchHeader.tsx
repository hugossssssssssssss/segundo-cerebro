import { useState } from "react";
import { Globe } from "lucide-react";
import { ModalBuscaWeb } from "@/components/ModalBuscaWeb";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export interface WebSearchHeaderProps {
  className?: string;
}

export function WebSearchHeader({ className }: WebSearchHeaderProps) {
  const [modalAberto, setModalAberto] = useState(false);

  return (
    <>
      <Tooltip conteudo="Busca Web Externa (Google, Bing, DuckDuckGo)">
        <button
          type="button"
          onClick={() => setModalAberto(true)}
          className={cn(
            "rounded-lg p-1.5 sm:p-2 transition-colors relative flex items-center justify-center cursor-pointer text-muted-foreground hover:bg-accent hover:text-foreground",
            modalAberto && "bg-primary/10 text-primary font-semibold",
            className
          )}
          aria-label="Busca Web Externa"
        >
          <Globe size={18} />
        </button>
      </Tooltip>

      <ModalBuscaWeb
        aberta={modalAberto}
        aoFechar={() => setModalAberto(false)}
      />
    </>
  );
}
