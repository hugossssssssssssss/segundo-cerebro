import React, { createContext, useContext, useState } from "react";
import { PainelNotionBase, type ModoVisaoNotion } from "@/components/PainelNotionBase";
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

interface ContextoFlutuanteProps {
  itemFlutuante: ItemFlutuanteGlobal | null;
  setItemFlutuante: (item: ItemFlutuanteGlobal | null) => void;
  abrirFlutuante: (item: ItemFlutuanteGlobal) => void;
  fecharFlutuante: () => void;
  estaAbertoFlutuante: (caminho: string) => boolean;
  focarFlutuante: (caminho: string) => boolean;
}

const ItemFlutuanteContext = createContext<ContextoFlutuanteProps>({
  itemFlutuante: null,
  setItemFlutuante: () => {},
  abrirFlutuante: () => {},
  fecharFlutuante: () => {},
  estaAbertoFlutuante: () => false,
  focarFlutuante: () => false,
});

export const useItemFlutuante = () => useContext(ItemFlutuanteContext);

export function ProvedorFlutuanteGlobal({ children }: { children: React.ReactNode }) {
  const [itemFlutuante, setItemFlutuante] = useState<ItemFlutuanteGlobal | null>(null);
  const [modoVisao, setModoVisao] = useState<ModoVisaoNotion>("popup");

  const abrirFlutuante = (item: ItemFlutuanteGlobal) => {
    setItemFlutuante(item);
    setModoVisao("flutuante");
  };

  const fecharFlutuante = async () => {
    if (itemFlutuante) {
      try {
        await itemFlutuante.aoSalvar(itemFlutuante, true);
      } catch (err: any) {
        toast(`Erro ao salvar "${itemFlutuante.titulo || "item"}" no GitHub: ${err?.message || "Falha na gravação"}`, { tipo: "erro" });
      }
    }
    setItemFlutuante(null);
  };

  // O item flutuante continua montado e transitando suavemente entre popup, lado, telacheia e flutuante
  const estaAbertoFlutuante = (caminho: string): boolean => {
    return itemFlutuante !== null && itemFlutuante.caminho === caminho;
  };

  const focarFlutuante = (caminho: string): boolean => {
    if (itemFlutuante !== null && itemFlutuante.caminho === caminho) {
      return true;
    }
    return false;
  };

  return (
    <ItemFlutuanteContext.Provider
      value={{ itemFlutuante, setItemFlutuante, abrirFlutuante, fecharFlutuante, estaAbertoFlutuante, focarFlutuante }}
    >
      {children}

      {itemFlutuante !== null && (
        <PainelNotionBase
          rotuloTipo={itemFlutuante.rotuloTipo}
          modoVisao={modoVisao}
          setModoVisao={setModoVisao}
          posicaoLateral="esquerda"
          titulo={itemFlutuante.titulo}
          setTitulo={(t) => {
            itemFlutuante.setTitulo?.(t);
            setItemFlutuante({ ...itemFlutuante, titulo: t });
          }}
          corpo={itemFlutuante.corpo}
          setCorpo={(c) => {
            itemFlutuante.setCorpo?.(c);
            setItemFlutuante({ ...itemFlutuante, corpo: c });
          }}
          dadosProps={itemFlutuante.dadosProps}
          onChangeProps={(novosDados) => {
            itemFlutuante.onChangeProps?.(novosDados);
            setItemFlutuante({ ...itemFlutuante, dadosProps: novosDados });
          }}
          camposFixosProps={itemFlutuante.camposFixosProps}
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
