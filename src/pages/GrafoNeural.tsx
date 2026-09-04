import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Network,
  Sparkles,
  Link as LinkIcon,
  Tag,
  CheckCircle2,
  Calendar,
  Timer,
  Target,
  TrendingUp,
  Package,
  MessageSquareQuote,
  User,
  Users,
  Briefcase,
  Building,
  Mail,
  Phone,
} from "lucide-react";
import { lerConfig, configCompleta } from "@/lib/settings";
import { useSalvar } from "@/lib/useSalvar";
import { useAcervoRepo } from "@/lib/useItemRepo";
import { invalidarCache } from "@/lib/repo";
import { dispararAtualizacaoAcervo } from "@/lib/eventos";
import { escreverMarkdown, tituloProvavel, mesclarFrontmatter } from "@/lib/markdown";
import { montarIndice, alvosUnicos, mencoesA } from "@/lib/links";
import { Botao, Vazio, Carregando, Aviso } from "@/components/ui";
import { CabecalhoPagina } from "@/components/CabecalhoPagina";
import { NavegadorGrafo3D } from "@/components/NavegadorGrafo3D";
import { PainelNotionBase, type ModoVisaoNotion } from "@/components/PainelNotionBase";

type ItemAberto = {
  caminho: string;
  sha: string;
  titulo: string;
  corpo: string;
  bruto: Record<string, any>;
  tipoRotulo: string;
  original: { titulo: string; corpo: string; bruto: Record<string, any> };
};

export default function GrafoNeural() {
  const cfg = lerConfig();
  const pronto = configCompleta(cfg);
  const { salvarTexto, apagarItem, salvando, erro: erroSalvar } = useSalvar(cfg);
  const { acervo, carregando, erro } = useAcervoRepo(cfg);

  const [aberto, setAberto] = useState<ItemAberto | null>(null);
  const [modoVisao, setModoVisao] = useState<ModoVisaoNotion>("lado");

  const indice = useMemo(() => montarIndice(acervo), [acervo]);
  const opcoesRelacionamento = useMemo(
    () => alvosUnicos(indice).map((a) => ({ titulo: a.titulo, caminho: a.caminho })),
    [indice]
  );

  const abrirItemDoGrafo = (caminho: string) => {
    const item = acervo.find((i) => i.caminho === caminho);
    if (!item) return;

    const titulo = String(item.doc.dados.titulo || tituloProvavel(item.doc, item.nome));
    const tipoRotulo =
      caminho.startsWith("tarefas/")
        ? "Tarefa"
        : caminho.startsWith("referencias/")
        ? "Referência"
        : caminho.startsWith("pdi/entregas")
        ? "PDI Entrega"
        : caminho.startsWith("pdi/metas") || caminho.startsWith("pdi/")
        ? "PDI Meta"
        : caminho.startsWith("contatos/")
        ? "Contato"
        : caminho.startsWith("lousas/")
        ? "Lousa Visual"
        : "Nota";

    setAberto({
      caminho: item.caminho,
      sha: item.sha,
      titulo,
      corpo: item.doc.corpo,
      bruto: item.doc.dados,
      tipoRotulo,
      original: { titulo, corpo: item.doc.corpo, bruto: item.doc.dados },
    });
  };

  const salvarItemAberto = async () => {
    if (!aberto) return;
    const novosDados = mesclarFrontmatter(aberto.bruto, {
      titulo: aberto.titulo.trim() || undefined,
    });
    const md = escreverMarkdown({ dados: novosDados, corpo: aberto.corpo });
    const novaSha = await salvarTexto(aberto.caminho, md, aberto.sha);

    setAberto((prev) =>
      prev
        ? {
            ...prev,
            sha: novaSha,
            original: { titulo: prev.titulo, corpo: prev.corpo, bruto: novosDados },
          }
        : null
    );
    invalidarCache();
    dispararAtualizacaoAcervo();
  };

  const removerItemAberto = async () => {
    if (!aberto) return;
    await apagarItem(aberto.caminho, aberto.sha);
    setAberto(null);
    invalidarCache();
    dispararAtualizacaoAcervo();
  };

  const obterCamposFixos = (caminho: string, tipoRotulo: string) => {
    if (caminho.startsWith("tarefas/") || tipoRotulo === "Tarefa") {
      return {
        status: { icone: <CheckCircle2 className="h-4 w-4 opacity-50 text-emerald-500" />, tipo: "status" as const },
        prazo: { icone: <Calendar className="h-4 w-4 opacity-50 text-rose-500" />, tipo: "data" as const },
        tags: { icone: <Tag className="h-4 w-4 opacity-50 text-blue-500" />, tipo: "multiselect" as const },
        Pomodoro: { icone: <Timer className="h-4 w-4 opacity-50 text-indigo-500" />, tipo: "numero" as const },
        relacionamentos: { icone: <Target className="h-4 w-4 opacity-50 text-emerald-500" />, tipo: "multiselect" as const },
      };
    }
    if (caminho.startsWith("pdi/entregas") || tipoRotulo === "PDI Entrega") {
      return {
        data: { icone: <Calendar className="h-4 w-4 opacity-50 text-rose-500" />, tipo: "data" as const },
        metas: { icone: <Target className="h-4 w-4 opacity-50 text-emerald-500" />, tipo: "multiselect" as const },
        conquista: { icone: <Package className="h-4 w-4 opacity-50 text-amber-500" />, tipo: "texto" as const },
        impacto: { icone: <TrendingUp className="h-4 w-4 opacity-50 text-emerald-500" />, tipo: "texto" as const },
        elogio: { icone: <MessageSquareQuote className="h-4 w-4 opacity-50 text-purple-500" />, tipo: "texto" as const },
        autor_elogio: { icone: <User className="h-4 w-4 opacity-50 text-blue-500" />, tipo: "texto" as const },
        colaboracao: { icone: <Users className="h-4 w-4 opacity-50 text-indigo-500" />, tipo: "multiselect" as const },
        tags: { icone: <Tag className="h-4 w-4 opacity-50 text-amber-500" />, tipo: "multiselect" as const },
      };
    }
    if (caminho.startsWith("pdi/metas") || tipoRotulo === "PDI Meta") {
      return {
        status: { icone: <CheckCircle2 className="h-4 w-4 opacity-50 text-emerald-500" />, tipo: "status" as const },
        prazo: { icone: <Calendar className="h-4 w-4 opacity-50 text-rose-500" />, tipo: "data" as const },
        tags: { icone: <Tag className="h-4 w-4 opacity-50 text-amber-500" />, tipo: "multiselect" as const },
        relacionamentos: { icone: <Target className="h-4 w-4 opacity-50 text-emerald-500" />, tipo: "multiselect" as const },
      };
    }
    if (caminho.startsWith("contatos/") || tipoRotulo === "Contato") {
      return {
        cargo: { icone: <Briefcase className="h-4 w-4 opacity-50 text-blue-500" />, tipo: "texto" as const },
        empresa: { icone: <Building className="h-4 w-4 opacity-50 text-emerald-500" />, tipo: "texto" as const },
        email: { icone: <Mail className="h-4 w-4 opacity-50 text-indigo-500" />, tipo: "texto" as const },
        telefone: { icone: <Phone className="h-4 w-4 opacity-50 text-purple-500" />, tipo: "texto" as const },
        pai_id: { icone: <User className="h-4 w-4 opacity-50 text-amber-500" />, tipo: "relation" as const },
        tags: { icone: <Tag className="h-4 w-4 opacity-50 text-amber-500" />, tipo: "multiselect" as const },
      };
    }
    if (caminho.startsWith("referencias/") || tipoRotulo === "Referência") {
      return {
        porque: { icone: <Sparkles className="h-4 w-4 opacity-50 text-purple-500" />, tipo: "texto" as const },
        fonte: { icone: <LinkIcon className="h-4 w-4 opacity-50 text-blue-500" />, tipo: "link" as const },
        tags: { icone: <Tag className="h-4 w-4 opacity-50 text-emerald-500" />, tipo: "multiselect" as const },
      };
    }
    return {
      tags: { icone: <Tag className="h-4 w-4 opacity-50 text-blue-500" />, tipo: "multiselect" as const },
      relacionamentos: { icone: <Target className="h-4 w-4 opacity-50 text-emerald-500" />, tipo: "multiselect" as const },
    };
  };

  if (!pronto) {
    return (
      <Vazio
        titulo="Grafo Neural 3D"
        descricao="Conecte sua conta do GitHub em Ajustes para visualizar seu mapa neural de conexões."
        acao={
          <Link to="/config">
            <Botao variante="primario">Ir para Ajustes</Botao>
          </Link>
        }
      />
    );
  }

  if (carregando) {
    return <Carregando texto="Mapeando conexões neurais do seu segundo cérebro em 3D..." />;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <CabecalhoPagina
        titulo="Grafo de Relacionamentos"
        descricao="Visualização interativa das conexões entre notas, tarefas, metas e ideias do seu Segundo Cérebro."
        icone={<Network size={20} />}
        corIcone="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
      />

      {erro && <Aviso tom="erro">{erro}</Aviso>}

      {/* Visualizador 3D do Grafo Neural */}
      <NavegadorGrafo3D
        acervo={acervo}
        aoSelecionarItem={abrirItemDoGrafo}
      />

      {/* Painel Notion Base para Visualização e Edição do Item Clicado */}
      {aberto && (
        <PainelNotionBase
          rotuloTipo={aberto.tipoRotulo}
          modoVisao={modoVisao}
          setModoVisao={setModoVisao}
          titulo={aberto.titulo}
          setTitulo={(t) => setAberto((prev) => (prev ? { ...prev, titulo: t } : null))}
          corpo={aberto.corpo}
          setCorpo={(c) => setAberto((prev) => (prev ? { ...prev, corpo: c } : null))}
          dadosProps={aberto.bruto}
          onChangeProps={(novosDados) =>
            setAberto((prev) => (prev ? { ...prev, bruto: novosDados } : null))
          }
          camposFixosProps={obterCamposFixos(aberto.caminho, aberto.tipoRotulo)}
          caminhoItem={aberto.caminho}
          salvando={salvando}
          temMudancas={
            aberto.titulo !== aberto.original.titulo ||
            aberto.corpo !== aberto.original.corpo ||
            JSON.stringify(aberto.bruto) !== JSON.stringify(aberto.original.bruto)
          }
          aoFechar={() => setAberto(null)}
          aoSalvar={salvarItemAberto}
          aoRemover={removerItemAberto}
          erro={erroSalvar}
          mencoes={mencoesA(aberto.caminho, acervo, indice)}
          opcoesRelacionamento={opcoesRelacionamento}
        />
      )}
    </div>
  );
}
