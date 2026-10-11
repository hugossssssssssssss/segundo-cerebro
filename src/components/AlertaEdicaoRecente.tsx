import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { lerConfig } from "@/lib/settings";
import { verificarFrescorArquivo, type StatusFrescorArquivo } from "@/lib/klausBeacon";
import { AvatarUsuario } from "@/components/AvatarUsuario";
import { Botao } from "@/components/ui";

interface AlertaEdicaoRecenteProps {
  caminho: string;
  aoRecarregar?: () => void;
  className?: string;
}

export function AlertaEdicaoRecente({
  caminho,
  aoRecarregar,
  className = "",
}: AlertaEdicaoRecenteProps) {
  const [status, setStatus] = useState<StatusFrescorArquivo | null>(null);

  useEffect(() => {
    let ativo = true;
    if (!caminho) {
      setStatus(null);
      return;
    }

    const cfg = lerConfig();
    verificarFrescorArquivo(cfg, caminho, 20).then((res) => {
      if (ativo) {
        setStatus(res);
      }
    });

    return () => {
      ativo = false;
    };
  }, [caminho]);

  if (!status || !status.ehRecente || !status.ehOutroAutor) {
    return null;
  }

  const tempoFormatado =
    status.minutosAtras === 0
      ? "menos de 1 minuto"
      : status.minutosAtras === 1
      ? "1 minuto"
      : `${status.minutosAtras} minutos`;

  return (
    <div
      className={`p-3 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs animate-in fade-in duration-200 ${className}`}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <AvatarUsuario
          login={status.autorLogin || ""}
          nome={status.autorNome}
          avatarUrl={status.autorAvatar}
          tamanho="sm"
        />
        <div className="min-w-0">
          <p className="font-medium leading-tight">
            <strong className="font-semibold text-amber-950 dark:text-amber-100">
              @{status.autorLogin}
            </strong>{" "}
            salvou alterações neste arquivo há {tempoFormatado}.
          </p>
          {status.mensagem && (
            <p className="text-[11px] opacity-80 truncate font-mono mt-0.5">
              "{status.mensagem}"
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
        {aoRecarregar && (
          <Botao
            type="button"
            variante="neutro"
            tamanho="pequeno"
            onClick={aoRecarregar}
            className="h-7 text-xs px-2.5 gap-1.5 cursor-pointer bg-amber-500/20 hover:bg-amber-500/30 border-amber-500/40"
          >
            <RefreshCw size={11} />
            <span>Recarregar</span>
          </Botao>
        )}
      </div>
    </div>
  );
}
