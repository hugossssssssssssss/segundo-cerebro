import { useEffect, useRef, useState } from "react";
import { lerConfig } from "@/lib/settings";
import { PASTA_REFS } from "@/lib/referencias";
import { cn } from "@/lib/utils";

/**
 * Mostra uma imagem que vive num repositório PRIVADO.
 *
 * Uma `<img src>` comum não consegue: o arquivo exige o cabeçalho de
 * autenticação. Então buscamos os bytes com o token e criamos um `blob:`.
 *
 * Duas coisas que a versão anterior errava e que aqui são o ponto central:
 *
 * 1. **Só baixa quando chega perto da tela** (IntersectionObserver). Antes,
 *    abrir a aba baixava todas as imagens do repositório de uma vez — dezenas
 *    de MB no 4G, a cada visita.
 * 2. **Libera o blob ao desmontar.** O `revokeObjectURL` anterior rodava com
 *    um objeto vazio capturado no primeiro render, então nunca liberava nada.
 */
export function ImagemPrivada({
  caminho,
  alt,
  className,
}: {
  /** Caminho relativo a `referencias/` ou completo no repositório */
  caminho: string;
  alt: string;
  className?: string;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [estado, setEstado] = useState<"esperando" | "baixando" | "erro">(
    "esperando",
  );
  const alvo = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const elemento = alvo.current;
    if (!elemento) return;

    let cancelado = false;
    let criada: string | null = null;

    const baixar = async () => {
      setEstado("baixando");
      const cfg = lerConfig();
      const completo = caminho.startsWith(PASTA_REFS)
        ? caminho
        : `${PASTA_REFS}/${caminho.replace(/^\.?\//, "")}`;

      try {
        const resposta = await fetch(
          `https://api.github.com/repos/${encodeURIComponent(cfg.repoOwner)}/${encodeURIComponent(cfg.repoName)}/contents/${completo
            .split("/")
            .map(encodeURIComponent)
            .join("/")}?ref=${encodeURIComponent(cfg.branch)}`,
          {
            headers: {
              Authorization: `Bearer ${cfg.githubToken.trim()}`,
              Accept: "application/vnd.github.raw",
            },
          },
        );
        if (!resposta.ok) throw new Error(String(resposta.status));

        const blob = await resposta.blob();
        if (cancelado) return;

        criada = URL.createObjectURL(blob);
        setUrl(criada);
      } catch {
        if (!cancelado) setEstado("erro");
      }
    };

    // rootMargin: começa a baixar um pouco antes de entrar na tela
    const observador = new IntersectionObserver(
      (entradas) => {
        if (entradas[0]?.isIntersecting) {
          observador.disconnect();
          baixar();
        }
      },
      { rootMargin: "300px" },
    );
    observador.observe(elemento);

    return () => {
      cancelado = true;
      observador.disconnect();
      if (criada) URL.revokeObjectURL(criada);
    };
  }, [caminho]);

  if (url) {
    return <img src={url} alt={alt} className={className} />;
  }

  return (
    <div
      ref={alvo}
      className={cn(
        "flex items-center justify-center bg-secondary text-xs text-muted-foreground",
        className,
      )}
    >
      {estado === "erro" ? (
        "imagem indisponível"
      ) : estado === "baixando" ? (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-primary" />
      ) : null}
    </div>
  );
}
