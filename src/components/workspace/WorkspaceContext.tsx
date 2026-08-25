import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useMemo,
  useEffect,
} from "react";
import { cache, invalidarCache } from "@/lib/repo";
import { lerMarkdown, escreverMarkdown, tituloProvavel } from "@/lib/markdown";
import { lerConfig } from "@/lib/settings";
import { useSalvar } from "@/lib/useSalvar";
import { toast } from "@/lib/toast";

export interface WorkspaceAba {
  id: string;
  caminho?: string;
  sha?: string;
  rotuloTipo: string;
  titulo: string;
  corpo: string;
  dadosProps: Record<string, any>;
  camposFixosProps?: Record<string, any>;
  temMudancas?: boolean;
  salvando?: boolean;
  erro?: string;
  mencoes?: any[];
  opcoesRelacionamento?: { titulo: string; caminho: string }[];
  aoSalvar?: (aba: WorkspaceAba) => Promise<void>;
  aoRemover?: () => Promise<void>;
}

export interface WorkspaceContextProps {
  abas: WorkspaceAba[];
  abaAtivaId: string | null;
  abaAtiva: WorkspaceAba | null;
  workspaceAberto: boolean;
  buscaGlobalAberta: boolean;
  setBuscaGlobalAberta: (aberta: boolean) => void;
  abrirNoWorkspace: (item: Omit<WorkspaceAba, "id"> & { id?: string }) => void;
  fecharAba: (id: string) => Promise<void>;
  fecharWorkspace: () => Promise<void>;
  selecionarAba: (id: string) => void;
  atualizarAba: (id: string, updates: Partial<WorkspaceAba>) => void;
  atualizarAbaAtiva: (updates: Partial<WorkspaceAba>) => void;
  reordenarAbas: (origemIndex: number, destinoIndex: number) => void;
  salvarAba: (id: string) => Promise<void>;
  irParaAnterior: () => void;
  irParaProximo: () => void;
  infoSequencial: {
    indice: number;
    total: number;
    podeAnterior: boolean;
    podeProximo: boolean;
    tipo: string;
  };
  migrarParaPopup: (id: string) => void;
}

const WorkspaceContext = createContext<WorkspaceContextProps | null>(null);

export const useWorkspace = () => {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) {
    throw new Error("useWorkspace deve ser usado dentro de um WorkspaceProvider");
  }
  return ctx;
};

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [abas, setAbas] = useState<WorkspaceAba[]>([]);
  const [abaAtivaId, setAbaAtivaId] = useState<string | null>(null);
  const [workspaceAberto, setWorkspaceAberto] = useState(false);
  const [buscaGlobalAberta, setBuscaGlobalAberta] = useState(false);

  const abasRef = useRef(abas);
  abasRef.current = abas;

  const abaAtivaIdRef = useRef(abaAtivaId);
  abaAtivaIdRef.current = abaAtivaId;

  const cfg = useMemo(() => lerConfig(), []);
  const { salvarTexto } = useSalvar(cfg);

  const timersAutoSaveRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // Salvar uma aba no GitHub
  const salvarAba = useCallback(
    async (id: string) => {
      const aba = abasRef.current.find((a) => a.id === id);
      if (!aba) return;

      // Se a aba tem uma função customizada de salvar
      if (aba.aoSalvar) {
        try {
          setAbas((prev) =>
            prev.map((a) => (a.id === id ? { ...a, salvando: true } : a))
          );
          await aba.aoSalvar(aba);
          setAbas((prev) =>
            prev.map((a) => (a.id === id ? { ...a, salvando: false, temMudancas: false } : a))
          );
        } catch (err: any) {
          setAbas((prev) =>
            prev.map((a) => (a.id === id ? { ...a, salvando: false, erro: err?.message || String(err) } : a))
          );
          toast(`Erro ao salvar aba: ${err?.message || err}`, { tipo: "erro" });
        }
        return;
      }

      // Se a aba tem caminho do GitHub
      if (!aba.caminho) return;

      try {
        setAbas((prev) =>
          prev.map((a) => (a.id === id ? { ...a, salvando: true } : a))
        );

        const dadosParaGravar = { ...aba.dadosProps };
        if (aba.titulo && (!dadosParaGravar.titulo || dadosParaGravar.titulo !== aba.titulo)) {
          dadosParaGravar.titulo = aba.titulo;
        }

        const texto = escreverMarkdown({
          dados: dadosParaGravar,
          corpo: aba.corpo || "",
        });

        const novoSha = await salvarTexto(aba.caminho, texto, aba.sha, `atualizar ${aba.caminho}`);
        invalidarCache();

        setAbas((prev) =>
          prev.map((a) =>
            a.id === id
              ? {
                  ...a,
                  sha: novoSha || a.sha,
                  salvando: false,
                  temMudancas: false,
                  erro: undefined,
                }
              : a
          )
        );
      } catch (err: any) {
        setAbas((prev) =>
          prev.map((a) => (a.id === id ? { ...a, salvando: false, erro: err?.message || String(err) } : a))
        );
        toast(`Erro ao salvar "${aba.titulo || "documento"}": ${err?.message || err}`, {
          tipo: "erro",
        });
      }
    },
    [salvarTexto]
  );

  // Debounced auto-save quando uma aba é modificada
  const agendarAutoSave = useCallback(
    (id: string) => {
      const timerAntigo = timersAutoSaveRef.current.get(id);
      if (timerAntigo) clearTimeout(timerAntigo);

      const novoTimer = setTimeout(() => {
        salvarAba(id);
        timersAutoSaveRef.current.delete(id);
      }, 1200);

      timersAutoSaveRef.current.set(id, novoTimer);
    },
    [salvarAba]
  );

  // Atualizar dados de uma aba
  const atualizarAba = useCallback(
    (id: string, updates: Partial<WorkspaceAba>) => {
      setAbas((prev) =>
        prev.map((a) => {
          if (a.id !== id) return a;
          const novo = { ...a, ...updates, temMudancas: true };
          return novo;
        })
      );
      agendarAutoSave(id);
    },
    [agendarAutoSave]
  );

  const abaAtiva = useMemo(() => {
    return abas.find((a) => a.id === abaAtivaId) || null;
  }, [abas, abaAtivaId]);

  const atualizarAbaAtiva = useCallback(
    (updates: Partial<WorkspaceAba>) => {
      if (!abaAtivaId) return;
      atualizarAba(abaAtivaId, updates);
    },
    [abaAtivaId, atualizarAba]
  );

  // Abrir ou focar aba (Prevenção de duplicatas)
  const abrirNoWorkspace = useCallback(
    (item: Omit<WorkspaceAba, "id"> & { id?: string }) => {
      setWorkspaceAberto(true);

      // Prevenção de duplicatas por caminho ou id
      const abaExistente = abasRef.current.find((a) => {
        if (item.caminho && a.caminho && a.caminho === item.caminho) return true;
        if (item.id && a.id === item.id) return true;
        return false;
      });

      if (abaExistente) {
        // Se já existe, foca e atualiza se fornecido novos dados
        setAbaAtivaId(abaExistente.id);
        return;
      }

      // Se não existe, cria nova aba
      const novoId = item.id || item.caminho || `aba-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const novaAba: WorkspaceAba = {
        ...item,
        id: novoId,
        temMudancas: false,
      };

      setAbas((prev) => [...prev, novaAba]);
      setAbaAtivaId(novoId);
    },
    []
  );

  // Fechar uma aba
  const fecharAba = useCallback(
    async (id: string) => {
      // Salva imediatamente se houver mudanças pendentes
      const aba = abasRef.current.find((a) => a.id === id);
      if (aba && aba.temMudancas) {
        const timer = timersAutoSaveRef.current.get(id);
        if (timer) clearTimeout(timer);
        timersAutoSaveRef.current.delete(id);
        await salvarAba(id);
      }

      const lista = abasRef.current;
      const index = lista.findIndex((a) => a.id === id);
      const novasAbas = lista.filter((a) => a.id !== id);

      setAbas(novasAbas);

      if (abaAtivaIdRef.current === id) {
        if (novasAbas.length > 0) {
          // Seleciona a aba vizinha (anterior ou a mesma posição)
          const novoIndex = Math.max(0, Math.min(index, novasAbas.length - 1));
          setAbaAtivaId(novasAbas[novoIndex].id);
        } else {
          setAbaAtivaId(null);
        }
      }
    },
    [salvarAba]
  );

  // Fechar o Workspace Tela Cheia inteiro
  const fecharWorkspace = useCallback(async () => {
    // Flush de todas as abas com mudanças
    for (const aba of abasRef.current) {
      if (aba.temMudancas) {
        const timer = timersAutoSaveRef.current.get(aba.id);
        if (timer) clearTimeout(timer);
        await salvarAba(aba.id);
      }
    }
    setWorkspaceAberto(false);
  }, [salvarAba]);

  // Migrar uma aba para o modo popup do app
  const migrarParaPopup = useCallback(
    async (id: string) => {
      const aba = abasRef.current.find((a) => a.id === id);
      if (!aba) return;
      await fecharAba(id);

      if (aba.caminho) {
        const pasta = aba.caminho.split("/")[0]?.toLowerCase() || "";
        let rota = "/notas";
        if (pasta === "tarefas") rota = "/tarefas";
        else if (pasta === "referencias") rota = "/referencias";
        else if (pasta === "pdi" || pasta === "metas") rota = "/pdi";
        else if (pasta === "lousas") rota = "/lousas";
        else if (pasta === "contatos") rota = "/contatos";

        window.location.hash = `#${rota}?abrir=${encodeURIComponent(aba.caminho)}`;
        window.dispatchEvent(new HashChangeEvent("hashchange"));
      }
    },
    [fecharAba]
  );

  // Reordenar abas (Drag and drop)
  const reordenarAbas = useCallback((origemIndex: number, destinoIndex: number) => {
    setAbas((prev) => {
      const resultado = Array.from(prev);
      const [removido] = resultado.splice(origemIndex, 1);
      resultado.splice(destinoIndex, 0, removido);
      return resultado;
    });
  }, []);

  // Escutar cliques em links e menções quando o workspace estiver ativo
  useEffect(() => {
    const aoAbrirItem = (e: Event) => {
      const customEvent = e as CustomEvent<{ caminho: string }>;
      const caminho = customEvent.detail?.caminho;
      if (!caminho || !workspaceAberto) return;

      // Verifica se já está aberto em uma aba
      const abaExistente = abasRef.current.find((a) => a.caminho === caminho);
      if (abaExistente) {
        setAbaAtivaId(abaExistente.id);
        return;
      }

      // Se não estiver aberto, carrega do cache do repo e abre nova aba
      const itemRepo = cache?.itens?.find((i) => i.caminho === caminho);
      if (itemRepo) {
        const { dados, corpo } = lerMarkdown(itemRepo.texto || "");
        const tit = tituloProvavel(itemRepo.doc, itemRepo.nome);
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

        abrirNoWorkspace({
          id: caminho,
          caminho,
          sha: itemRepo.sha,
          rotuloTipo: rotulos[pasta] || "Documento",
          titulo: tit,
          corpo,
          dadosProps: dados,
        });
      }
    };

    window.addEventListener("klaus-abrir-item", aoAbrirItem);
    return () => window.removeEventListener("klaus-abrir-item", aoAbrirItem);
  }, [workspaceAberto, abrirNoWorkspace]);

  // Monitorar remoção de arquivos no repositório para fechar abas automaticamente
  useEffect(() => {
    const aoAtualizarAcervo = () => {
      if (!cache || !cache.itens) return;
      const caminhosExistentes = new Set(cache.itens.map((i) => i.caminho));
      setAbas((prev) => {
        const filtradas = prev.filter((aba) => {
          if (!aba.caminho) return true; // Itens temporários / novos permanecem
          return caminhosExistentes.has(aba.caminho);
        });
        if (filtradas.length !== prev.length) {
          if (abaAtivaIdRef.current && !filtradas.some((a) => a.id === abaAtivaIdRef.current)) {
            setAbaAtivaId(filtradas.length > 0 ? filtradas[0].id : null);
          }
        }
        return filtradas;
      });
    };

    window.addEventListener("acervo-atualizado", aoAtualizarAcervo);
    return () => window.removeEventListener("acervo-atualizado", aoAtualizarAcervo);
  }, []);

  // Lista de itens do mesmo tipo da aba ativa para navegação sequencial
  const itensDoMesmoTipo = useMemo(() => {
    if (!abaAtiva || !abaAtiva.caminho || !cache || !cache.itens) return [];

    const pasta = abaAtiva.caminho.split("/")[0] || "";
    if (!pasta) return [];

    const prefixo = `${pasta}/`;
    return cache.itens
      .filter((i) => i.caminho.startsWith(prefixo))
      .sort((a, b) => {
        // Ordenação por nome / data de criação
        return a.caminho.localeCompare(b.caminho, undefined, { numeric: true });
      });
  }, [abaAtiva?.caminho]);

  const indiceSequencial = useMemo(() => {
    if (!abaAtiva || !abaAtiva.caminho || itensDoMesmoTipo.length === 0) return -1;
    return itensDoMesmoTipo.findIndex((i) => i.caminho === abaAtiva.caminho);
  }, [abaAtiva?.caminho, itensDoMesmoTipo]);

  const infoSequencial = useMemo(() => {
    const total = itensDoMesmoTipo.length;
    const indice = indiceSequencial >= 0 ? indiceSequencial + 1 : 1;
    const tipo = abaAtiva?.rotuloTipo || "Item";

    return {
      indice,
      total: Math.max(total, 1),
      podeAnterior: indiceSequencial > 0,
      podeProximo: indiceSequencial >= 0 && indiceSequencial < total - 1,
      tipo,
    };
  }, [itensDoMesmoTipo.length, indiceSequencial, abaAtiva?.rotuloTipo]);

  // Navegar para o item anterior
  const irParaAnterior = useCallback(async () => {
    if (indiceSequencial <= 0 || itensDoMesmoTipo.length === 0 || !abaAtiva) return;

    if (abaAtiva.temMudancas) {
      await salvarAba(abaAtiva.id);
    }

    const itemAlvo = itensDoMesmoTipo[indiceSequencial - 1];
    const { dados, corpo } = lerMarkdown(itemAlvo.texto || "");
    const tit = tituloProvavel(itemAlvo.doc, itemAlvo.nome);

    atualizarAba(abaAtiva.id, {
      caminho: itemAlvo.caminho,
      sha: itemAlvo.sha,
      titulo: tit,
      corpo,
      dadosProps: dados,
      temMudancas: false,
      erro: undefined,
    });
  }, [indiceSequencial, itensDoMesmoTipo, abaAtiva, salvarAba, atualizarAba]);

  // Navegar para o próximo item
  const irParaProximo = useCallback(async () => {
    if (
      indiceSequencial < 0 ||
      indiceSequencial >= itensDoMesmoTipo.length - 1 ||
      itensDoMesmoTipo.length === 0 ||
      !abaAtiva
    ) {
      return;
    }

    if (abaAtiva.temMudancas) {
      await salvarAba(abaAtiva.id);
    }

    const itemAlvo = itensDoMesmoTipo[indiceSequencial + 1];
    const { dados, corpo } = lerMarkdown(itemAlvo.texto || "");
    const tit = tituloProvavel(itemAlvo.doc, itemAlvo.nome);

    atualizarAba(abaAtiva.id, {
      caminho: itemAlvo.caminho,
      sha: itemAlvo.sha,
      titulo: tit,
      corpo,
      dadosProps: dados,
      temMudancas: false,
      erro: undefined,
    });
  }, [indiceSequencial, itensDoMesmoTipo, abaAtiva, salvarAba, atualizarAba]);

  return (
    <WorkspaceContext.Provider
      value={{
        abas,
        abaAtivaId,
        abaAtiva,
        workspaceAberto,
        buscaGlobalAberta,
        setBuscaGlobalAberta,
        abrirNoWorkspace,
        fecharAba,
        fecharWorkspace,
        selecionarAba: setAbaAtivaId,
        atualizarAba,
        atualizarAbaAtiva,
        reordenarAbas,
        salvarAba,
        irParaAnterior,
        irParaProximo,
        infoSequencial,
        migrarParaPopup,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}
