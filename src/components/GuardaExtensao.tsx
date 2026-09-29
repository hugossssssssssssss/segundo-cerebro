import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { verificarExtensaoInstalada } from "@/lib/klausExtensionCatalog";
import { Boxes, Download, ArrowLeft } from "lucide-react";
import { Botao } from "@/components/ui";

interface GuardaExtensaoProps {
  idExtensao: string;
  nomeExtensao: string;
  children: ReactNode;
}

/**
  * Componente de Guarda para Rotas de Extensão.
  * Impede a execução de ferramentas modulares que não foram baixadas/instaladas
  * no repositório de dados do usuário (.klaus/projetos/<id>/).
  */
export function GuardaExtensao({
  idExtensao,
  nomeExtensao,
  children,
}: GuardaExtensaoProps) {
  const instalada = verificarExtensaoInstalada(idExtensao);

  if (!instalada) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] max-w-lg mx-auto p-6 text-center select-none animate-in fade-in duration-200">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center mb-5 shadow-xs">
          <Boxes size={32} />
        </div>

        <h2 className="text-xl font-bold text-foreground mb-2">
          {nomeExtensao} não está instalada
        </h2>

        <p className="text-sm text-muted-foreground leading-relaxed mb-6">
          Esta ferramenta funciona como uma extensão modular. O código dela não fica
          ativo até que você a baixe para o seu repositório de dados privado.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          <Link to="/biblioteca" className="w-full sm:w-auto">
            <Botao variante="primario" className="w-full flex items-center justify-center gap-2">
              <Download size={16} />
              <span>Instalar na Biblioteca</span>
            </Botao>
          </Link>
          <Link to="/home" className="w-full sm:w-auto">
            <Botao variante="neutro" className="w-full flex items-center justify-center gap-2">
              <ArrowLeft size={16} />
              <span>Voltar ao Início</span>
            </Botao>
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
