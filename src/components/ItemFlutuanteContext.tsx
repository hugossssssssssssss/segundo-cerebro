import React, { createContext, useContext, useState, useEffect } from "react";
import { PainelNotionBase, type ModoVisaoNotion } from "@/components/PainelNotionBase";

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
}

const ItemFlutuanteContext = createContext<ContextoFlutuanteProps>({
  itemFlutuante: null,
  setItemFlutuante: () => {},
  abrirFlutuante: () => {},
  fecharFlutuante: () => {},
});

export const useItemFlutuante = () => useContext(ItemFlutuanteContext);

export function ProvedorFlutuanteGlobal({ children }: { children: React.ReactNode }) {
  const [itemFlutuante, setItemFlutuante] = useState<ItemFlutuanteGlobal | null>(null);
  const [modoVisao, setModoVisao] = useState<ModoVisaoNotion>("flutuante");

  const abrirFlutuante = (item: ItemFlutuanteGlobal) => {
    setItemFlutuante(item);
    setModoVisao("flutuante");
  };

  const fecharFlutuante = () => {
    if (itemFlutuante) {
      itemFlutuante.aoSalvar(itemFlutuante, true).catch(() => {});
    }
    setItemFlutuante(null);
  };

  // Se mudar de modo dentro do painel flutuante global para pop-up/lado/telacheia, fecha do global
  useEffect(() => {
    if (modoVisao !== "flutuante" && itemFlutuante) {
      setItemFlutuante(null);
    }
  }, [modoVisao, itemFlutuante]);

  return (
    <ItemFlutuanteContext.Provider
      value={{ itemFlutuante, setItemFlutuante, abrirFlutuante, fecharFlutuante }}
    >
      {children}

      {itemFlutuante !== null && modoVisao === "flutuante" && (
        <PainelNotionBase
          rotuloTipo={itemFlutuante.rotuloTipo}
          modoVisao="flutuante"
          setModoVisao={(novoModo) => {
            setModoVisao(novoModo);
            if (novoModo !== "flutuante") {
              setItemFlutuante(null);
            }
          }}
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
          aoSalvar={async (fechar) => {
            await itemFlutuante.aoSalvar(itemFlutuante, fechar);
            if (fechar) setItemFlutuante(null);
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
