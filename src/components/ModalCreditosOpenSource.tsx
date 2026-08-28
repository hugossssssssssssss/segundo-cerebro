import { useState } from "react";
import {
  Code2,
  GitBranch,
  ExternalLink,
  Search,
  Heart,
} from "lucide-react";
import { Modal } from "./ui";
import { TODOS_CREDITOS_OPEN_SOURCE, type CreditoOpenSource } from "@/lib/creditosOpenSource";
import { correspondeBusca } from "@/lib/utils";

interface ModalCreditosOpenSourceProps {
  aberta: boolean;
  aoFechar: () => void;
}

export function ModalCreditosOpenSource({ aberta, aoFechar }: ModalCreditosOpenSourceProps) {
  const [busca, setBusca] = useState("");

  const filtrados = TODOS_CREDITOS_OPEN_SOURCE.filter(
    (c) =>
      correspondeBusca(c.nome, busca) ||
      correspondeBusca(c.autor, busca) ||
      correspondeBusca(c.descricao, busca) ||
      correspondeBusca(c.licenca, busca)
  );

  return (
    <Modal
      aberto={aberta}
      aoFechar={aoFechar}
      titulo="Tecnologias & Créditos Open Source"
      tamanho="largo"
    >
      <div className="space-y-4 text-xs">
        <div className="flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 p-3.5">
          <Heart size={18} className="text-rose-500 fill-rose-500 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-foreground">
              O Klaus é construído sobre ombros de gigantes da comunidade Open Source.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Todas as bibliotecas e motores de terceiros integrados ao Klaus são de código aberto e
              respeitam as licenças de seus autores originais.
            </p>
          </div>
        </div>

        {/* Campo de Busca */}
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Filtrar por nome, autor ou tecnologia..."
            className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-xs placeholder:text-muted-foreground focus:border-primary focus:outline-none"
          />
        </div>

        {/* Lista de Projetos */}
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 max-h-[50vh] overflow-y-auto pr-1">
          {filtrados.map((item: CreditoOpenSource) => (
            <div
              key={item.id}
              className="flex flex-col justify-between rounded-xl border border-border/80 bg-card p-3.5 shadow-2xs hover:border-primary/50 transition-colors gap-3"
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-foreground flex items-center gap-1.5 text-sm">
                    <Code2 size={15} className="text-primary shrink-0" />
                    {item.nome}
                  </span>
                  <span className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[10px] font-semibold text-muted-foreground border border-border/60">
                    {item.licenca}
                  </span>
                </div>
                <p className="text-muted-foreground text-[11px] leading-relaxed line-clamp-2">
                  {item.descricao}
                </p>
                <div className="text-[11px] text-foreground/80 font-medium pt-0.5">
                  Autor: <span className="text-primary font-semibold">{item.autor}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-border/50 flex items-center justify-between">
                <a
                  href={item.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-secondary/50 px-2.5 py-1 font-mono text-[11px] font-semibold text-foreground hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors"
                >
                  <GitBranch size={12} />
                  <span>Acessar no GitHub</span>
                  <ExternalLink size={10} className="opacity-70" />
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
}
