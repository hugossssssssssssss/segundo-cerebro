import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from "react";
import { PainelNotionBase, type ModoVisaoNotion } from "@/components/PainelNotionBase";
import { lerMarkdown, escreverMarkdown, tituloProvavel } from "@/lib/markdown";
import { cache, invalidarCache } from "@/lib/repo";
import { lerConfig } from "@/lib/settings";
import { useSalvar } from "@/lib/useSalvar";
import { ler as lerArquivoGithub } from "@/lib/github";
import { toast } from "@/lib/toast";

export interface ItemFlutuanteGlobal {
  id: string;
  rotuloTipo: string;
  titulo: string;
  corpo: string;
  dadosProps: Record<string, any>;
  camposFixosProps?: Record<string, any>;
  caminho: string;
  sha: string;
  temMudancas?: boolean;
  salvando?: boolean;
  erro?: string;
  mencoes?: any[];
  opcoesRelacionamento?: { titulo: string; caminho: string }[];
  aoSalvar: (item: ItemFlutuanteGlobal, fechar?: boolean) => Promise<void>;
  aoRemover?: () => Promise<void>;
  setTitulo?: (t: string) => void;
  setCorpo?: (c: string) => void;
  onChangeProps?: (novosDados: Record<string, any>) => void;
}

export type SlotPainel = "esquerda" | "direita" | "popup" | "flutuante";

interface ContextoFlutuanteProps {
  itemFlutuante: ItemFlutuanteGlobal | null;
  setItemFlutuante: (item: ItemFlutuanteGlobal | null) => void;
  painelEsquerdo: ItemFlutuanteGlobal | null;
  painelDireito: ItemFlutuanteGlobal | null;
  painelPopup: ItemFlutuanteGlobal | null;
  abrirFlutuante: (item: ItemFlutuanteGlobal) => void;
  fecharFlutuante: () => void;
  abrirItemEmSlot: (caminho: string, slot: SlotPainel) => Promise<void>;
  fecharSlot: (slot: SlotPainel) => Promise<void>;
  estaAbertoFlutuante: (caminho: string) => boolean;
  focarFlutuante: (caminho: string) => boolean;
}

const ItemFlutuanteContext = createContext<ContextoFlutuanteProps>({
  itemFlutuante: null,
  setItemFlutuante: () => {},
  painelEsquerdo: null,
  painelDireito: null,
  painelPopup: null,
  abrirFlutuante: () => {},
  fecharFlutuante: () => {},
  abrirItemEmSlot: async () => {},
  fecharSlot: async () => {},
  estaAbertoFlutuante: () => false,
  focarFlutuante: () => false,
});

export const useItemFlutuante = () => useContext(ItemFlutuanteContext);

export function ProvedorFlutuanteGlobal({ children }: { children: React.ReactNode }) {
  const [itemFlutuante, setItemFlutuante] = useState<ItemFlutuanteGlobal | null>(null);
  const [painelEsquerdo, setPainelEsquerdo] = useState<ItemFlutuanteGlobal | null>(null);
  const [painelDireito, setPainelDireito] = useState<ItemFlutuanteGlobal | null>(null);
  const [painelPopup, setPainelPopup] = useState<ItemFlutuanteGlobal | null>(null);

  const [modoVisaoFlutuante, setModoVisaoFlutuante] = useState<ModoVisaoNotion>("flutuante");
  const [modoVisaoPopup, setModoVisaoPopup] = useState<ModoVisaoNotion>("popup");
  const [modoVisaoEsquerdo, setModoVisaoEsquerdo] = useState<ModoVisaoNotion>("lado");
  const [modoVisaoDireito, setModoVisaoDireito] = useState<ModoVisaoNotion>("lado");

  const [cfg, setCfg] = useState(() => lerConfig());
  useEffect(() => {
    const aoAtualizarConfig = () => setCfg(lerConfig());
    window.addEventListener("storage", aoAtualizarConfig);
    window.addEventListener("klaus-config-atualizada", aoAtualizarConfig);
    return () => {
      window.removeEventListener("storage", aoAtualizarConfig);
      window.removeEventListener("klaus-config-atualizada", aoAtualizarConfig);
    };
  }, []);

  const { salvarTexto, apagarItem } = useSalvar(cfg);
  const salvarTextoRef = useRef(salvarTexto);
  salvarTextoRef.current = salvarTexto;
  const apagarItemRef = useRef(apagarItem);
  apagarItemRef.current = apagarItem;

  const salvarItemNoGithub = useCallback(async (item: ItemFlutuanteGlobal) => {
    if (!item.caminho) return;
    const texto = escreverMarkdown({
      dados: item.dadosProps || {},
      corpo: item.corpo || "",
    });
    const novoSha = await salvarTextoRef.current(
      item.caminho,
      texto,
      item.sha,
      `atualizar ${item.caminho}`
    );
    invalidarCache();
    window.dispatchEvent(new CustomEvent("acervo-atualizado"));
    return novoSha;
  }, []);

  const fecharSlot = useCallback(async (slot: SlotPainel) => {
    let alvo: ItemFlutuanteGlobal | null = null;
    if (slot === "esquerda") alvo = painelEsquerdo;
    else if (slot === "direita") alvo = painelDireito;
    else if (slot === "popup") alvo = painelPopup;
    else if (slot === "flutuante") alvo = itemFlutuante;

    if (alvo && alvo.temMudancas) {
      try {
        await salvarItemNoGithub(alvo);
      } catch (err: any) {
        toast(`Erro ao salvar ao fechar: ${err?.message || err}`, { tipo: "erro" });
      }
    }

    if (slot === "esquerda") setPainelEsquerdo(null);
    else if (slot === "direita") setPainelDireito(null);
    else if (slot === "popup") setPainelPopup(null);
    else if (slot === "flutuante") setItemFlutuante(null);
  }, [painelEsquerdo, painelDireito, painelPopup, itemFlutuante, salvarItemNoGithub]);

  const abrirFlutuante = (item: ItemFlutuanteGlobal) => {
    setItemFlutuante(item);
    setModoVisaoFlutuante("flutuante");
  };

  const fecharFlutuante = async () => {
    await fecharSlot("flutuante");
  };

  const abrirItemEmSlot = useCallback(async (caminho: string, slot: SlotPainel) => {
    if (!caminho) return;

    // 1. Tenta carregar do cache local
    let itemRepo = cache?.itens?.find((i) => i.caminho === caminho);
    let textoItem = itemRepo?.texto;
    let shaItem = itemRepo?.sha || "";

    // 2. Se não estiver no cache, carrega do GitHub
    if (!textoItem) {
      try {
        const remoto = await lerArquivoGithub(cfg, caminho);
        if (remoto) {
          textoItem = remoto.texto;
          shaItem = remoto.sha;
        }
      } catch {}
    }

    const { dados, corpo } = lerMarkdown(textoItem || "");
    const tit = dados.titulo
      ? String(dados.titulo)
      : itemRepo?.nome
      ? tituloProvavel(itemRepo.doc, itemRepo.nome)
      : caminho.split("/").pop()?.replace(/\.md$/, "") || "Documento";

    const pasta = caminho.split("/")[0]?.toLowerCase() || "";
    const rotulos: Record<string, string> = {
      notas: "Nota",
      tarefas: "Tarefa",
      pdi: "Meta",
      metas: "Meta",
      referencias: "Referência",
      lousas: "Lousa",
      contatos: "Contato",
    };
    const rotuloTipo = rotulos[pasta] || "Documento";

    const novoItem: ItemFlutuanteGlobal = {
      id: caminho,
      caminho,
      sha: shaItem,
      rotuloTipo,
      titulo: tit,
      corpo,
      dadosProps: dados,
      temMudancas: false,
      aoSalvar: async (itemAtual) => {
        const novoSha = await salvarItemNoGithub(itemAtual);
        if (novoSha) {
          itemAtual.sha = novoSha;
          itemAtual.temMudancas = false;
        }
      },
      aoRemover: async () => {
        const itemRemoto = cache?.itens?.find((i) => i.caminho === caminho);
        if (itemRemoto?.sha) {
          await apagarItemRef.current(caminho, itemRemoto.sha);
        }
        invalidarCache();
        window.dispatchEvent(new CustomEvent("acervo-atualizado"));
        fecharSlot(slot);
      },
    };

    if (slot === "esquerda") {
      setPainelEsquerdo(novoItem);
      setModoVisaoEsquerdo("lado");
    } else if (slot === "direita") {
      setPainelDireito(novoItem);
      setModoVisaoDireito("lado");
    } else if (slot === "popup") {
      setPainelPopup(novoItem);
      setModoVisaoPopup("popup");
    } else if (slot === "flutuante") {
      setItemFlutuante(novoItem);
      setModoVisaoFlutuante("flutuante");
    }
  }, [cfg, salvarItemNoGithub, fecharSlot]);

  const estaAbertoFlutuante = (caminho: string): boolean => {
    return (
      (itemFlutuante !== null && itemFlutuante.caminho === caminho) ||
      (painelEsquerdo !== null && painelEsquerdo.caminho === caminho) ||
      (painelDireito !== null && painelDireito.caminho === caminho) ||
      (painelPopup !== null && painelPopup.caminho === caminho)
    );
  };

  const focarFlutuante = (caminho: string): boolean => {
    return estaAbertoFlutuante(caminho);
  };

  return (
    <ItemFlutuanteContext.Provider
      value={{
        itemFlutuante,
        setItemFlutuante,
        painelEsquerdo,
        painelDireito,
        painelPopup,
        abrirFlutuante,
        fecharFlutuante,
        abrirItemEmSlot,
        fecharSlot,
        estaAbertoFlutuante,
        focarFlutuante,
      }}
    >
      {children}

      {/* Painel Esquerdo (Lado a Lado Esquerda) */}
      {painelEsquerdo !== null && (
        <PainelNotionBase
          key={`slot-esquerda-${painelEsquerdo.caminho}`}
          rotuloTipo={painelEsquerdo.rotuloTipo}
          modoVisao={modoVisaoEsquerdo}
          setModoVisao={setModoVisaoEsquerdo}
          posicaoLateral="esquerda"
          titulo={painelEsquerdo.titulo}
          setTitulo={(t) => {
            setPainelEsquerdo((prev) => (prev ? { ...prev, titulo: t, temMudancas: true } : null));
          }}
          corpo={painelEsquerdo.corpo}
          setCorpo={(c) => {
            setPainelEsquerdo((prev) => (prev ? { ...prev, corpo: c, temMudancas: true } : null));
          }}
          dadosProps={painelEsquerdo.dadosProps}
          onChangeProps={(novosDados) => {
            setPainelEsquerdo((prev) => (prev ? { ...prev, dadosProps: novosDados, temMudancas: true } : null));
          }}
          camposFixosProps={painelEsquerdo.camposFixosProps}
          caminhoItem={painelEsquerdo.caminho}
          salvando={!!painelEsquerdo.salvando}
          temMudancas={!!painelEsquerdo.temMudancas}
          aoFechar={() => fecharSlot("esquerda")}
          aoSalvar={async () => {
            if (painelEsquerdo) await painelEsquerdo.aoSalvar(painelEsquerdo);
          }}
          aoRemover={painelEsquerdo.aoRemover}
          erro={painelEsquerdo.erro}
          mencoes={painelEsquerdo.mencoes}
          opcoesRelacionamento={painelEsquerdo.opcoesRelacionamento}
        />
      )}

      {/* Painel Direito (Lado a Lado Direita) */}
      {painelDireito !== null && (
        <PainelNotionBase
          key={`slot-direita-${painelDireito.caminho}`}
          rotuloTipo={painelDireito.rotuloTipo}
          modoVisao={modoVisaoDireito}
          setModoVisao={setModoVisaoDireito}
          posicaoLateral="direita"
          titulo={painelDireito.titulo}
          setTitulo={(t) => {
            setPainelDireito((prev) => (prev ? { ...prev, titulo: t, temMudancas: true } : null));
          }}
          corpo={painelDireito.corpo}
          setCorpo={(c) => {
            setPainelDireito((prev) => (prev ? { ...prev, corpo: c, temMudancas: true } : null));
          }}
          dadosProps={painelDireito.dadosProps}
          onChangeProps={(novosDados) => {
            setPainelDireito((prev) => (prev ? { ...prev, dadosProps: novosDados, temMudancas: true } : null));
          }}
          camposFixosProps={painelDireito.camposFixosProps}
          caminhoItem={painelDireito.caminho}
          salvando={!!painelDireito.salvando}
          temMudancas={!!painelDireito.temMudancas}
          aoFechar={() => fecharSlot("direita")}
          aoSalvar={async () => {
            if (painelDireito) await painelDireito.aoSalvar(painelDireito);
          }}
          aoRemover={painelDireito.aoRemover}
          erro={painelDireito.erro}
          mencoes={painelDireito.mencoes}
          opcoesRelacionamento={painelDireito.opcoesRelacionamento}
        />
      )}

      {/* Painel Pop-up Central */}
      {painelPopup !== null && (
        <PainelNotionBase
          key={`slot-popup-${painelPopup.caminho}`}
          rotuloTipo={painelPopup.rotuloTipo}
          modoVisao={modoVisaoPopup}
          setModoVisao={setModoVisaoPopup}
          posicaoLateral="esquerda"
          titulo={painelPopup.titulo}
          setTitulo={(t) => {
            setPainelPopup((prev) => (prev ? { ...prev, titulo: t, temMudancas: true } : null));
          }}
          corpo={painelPopup.corpo}
          setCorpo={(c) => {
            setPainelPopup((prev) => (prev ? { ...prev, corpo: c, temMudancas: true } : null));
          }}
          dadosProps={painelPopup.dadosProps}
          onChangeProps={(novosDados) => {
            setPainelPopup((prev) => (prev ? { ...prev, dadosProps: novosDados, temMudancas: true } : null));
          }}
          camposFixosProps={painelPopup.camposFixosProps}
          caminhoItem={painelPopup.caminho}
          salvando={!!painelPopup.salvando}
          temMudancas={!!painelPopup.temMudancas}
          aoFechar={() => fecharSlot("popup")}
          aoSalvar={async () => {
            if (painelPopup) await painelPopup.aoSalvar(painelPopup);
          }}
          aoRemover={painelPopup.aoRemover}
          erro={painelPopup.erro}
          mencoes={painelPopup.mencoes}
          opcoesRelacionamento={painelPopup.opcoesRelacionamento}
        />
      )}

      {/* Nota Autoadesiva Flutuante */}
      {itemFlutuante !== null && (
        <PainelNotionBase
          key={`slot-flutuante-${itemFlutuante.caminho}`}
          rotuloTipo={itemFlutuante.rotuloTipo}
          modoVisao={modoVisaoFlutuante}
          setModoVisao={setModoVisaoFlutuante}
          posicaoLateral="esquerda"
          titulo={itemFlutuante.titulo}
          setTitulo={(t) => {
            itemFlutuante.setTitulo?.(t);
            setItemFlutuante({ ...itemFlutuante, titulo: t, temMudancas: true });
          }}
          corpo={itemFlutuante.corpo}
          setCorpo={(c) => {
            itemFlutuante.setCorpo?.(c);
            setItemFlutuante({ ...itemFlutuante, corpo: c, temMudancas: true });
          }}
          dadosProps={itemFlutuante.dadosProps}
          onChangeProps={(novosDados) => {
            itemFlutuante.onChangeProps?.(novosDados);
            setItemFlutuante({ ...itemFlutuante, dadosProps: novosDados, temMudancas: true });
          }}
          camposFixosProps={itemFlutuante.camposFixosProps}
          caminhoItem={itemFlutuante.caminho}
          salvando={!!itemFlutuante.salvando}
          temMudancas={!!itemFlutuante.temMudancas}
          aoFechar={fecharFlutuante}
          aoSalvar={async () => {
            await itemFlutuante.aoSalvar(itemFlutuante);
          }}
          aoRemover={itemFlutuante.aoRemover}
          erro={itemFlutuante.erro}
          mencoes={itemFlutuante.mencoes}
          opcoesRelacionamento={itemFlutuante.opcoesRelacionamento}
        />
      )}
    </ItemFlutuanteContext.Provider>
  );
}
