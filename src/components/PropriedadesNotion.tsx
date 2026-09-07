import React, { useState, useEffect, useMemo } from "react";
import { 
  Type, 
  Hash, 
  Calendar as CalendarIcon, 
  CheckSquare, 
  ListTodo, 
  Tags,
  Plus,
  ChevronDown,
  ChevronRight,
  User,
  Clock,
  X,
  Folder,
  Sparkles,
  Check,
  Users,
  Pencil,
  Building,
  Briefcase,
  Flag,
  Mail as MailIcon,
  GripVertical,
  HelpCircle,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Modal, Botao } from "@/components/ui";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Link as LinkIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { montarIndice, chave as chaveNormalizada } from "@/lib/links";
import { lerConfig, nomeExibido as nomeDoUsuario } from "@/lib/settings";
import { cache, invalidarCache, carregarRepo } from "@/lib/repo";
import { gravar } from "@/lib/github";
import { PASTAS, type Contato } from "@/lib/tipos";
import { comoContato, contatoParaArquivo } from "@/lib/entidades";
import { nomeLivre, escreverMarkdown, tituloProvavel, nomeDeArquivo } from "@/lib/markdown";
import { idDoCaminho } from "@/lib/pdi";
import { dispararAtualizacaoAcervo } from "@/lib/eventos";
import { toast } from "@/lib/toast";
import { useItemFlutuante } from "@/components/ItemFlutuanteContext";
import { MenuConfiguracaoPropriedade } from "./propriedades/MenuConfiguracaoPropriedade";
import { ICONES_MAPA, CORES_ICONE } from "./propriedades/SeletorIconePropriedade";

export function obterOpcoesExcluidas(chave: string): Set<string> {
  try {
    const raw = localStorage.getItem(`klaus_opcoes_excluidas_${chave}`);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) {
        return new Set(arr.map(x => String(x).trim().toLowerCase()));
      }
    }
  } catch {}
  return new Set<string>();
}

export function registrarOpcaoExcluida(chave: string, opcao: string) {
  try {
    const setExcluidas = obterOpcoesExcluidas(chave);
    setExcluidas.add(opcao.trim().toLowerCase());
    localStorage.setItem(`klaus_opcoes_excluidas_${chave}`, JSON.stringify(Array.from(setExcluidas)));
  } catch {}
}

export function removerOpcaoExcluida(chave: string, opcao: string) {
  try {
    const setExcluidas = obterOpcoesExcluidas(chave);
    setExcluidas.delete(opcao.trim().toLowerCase());
    localStorage.setItem(`klaus_opcoes_excluidas_${chave}`, JSON.stringify(Array.from(setExcluidas)));
  } catch {}
}

export function obterOpcoesDaPropriedade(
  chave: string,
  dadosValorAtual: any,
  fixas?: string[],
  _coresTagsGlobais: Record<string, string> = {},
  prefixoCaminho?: string
): string[] {
  const setOpcoes = new Set<string>();
  const excluidas = obterOpcoesExcluidas(chave);

  // 1. Opções fixas (se houver)
  if (fixas && Array.isArray(fixas)) {
    fixas.forEach(o => {
      if (typeof o === "string" && o.trim() && !excluidas.has(o.trim().toLowerCase())) {
        setOpcoes.add(o.trim());
      }
    });
  }

  // 2. Opções salvas localmente
  try {
    const raw = localStorage.getItem(`klaus_opcoes_prop_${chave}`);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) {
        arr.forEach(o => {
          if (typeof o === "string" && o.trim() && !excluidas.has(o.trim().toLowerCase())) {
            setOpcoes.add(o.trim());
          }
        });
      }
    }
  } catch {}

  // 3. Valor atual deste item
  if (Array.isArray(dadosValorAtual)) {
    dadosValorAtual.forEach(t => {
      if (typeof t === "string" && t.trim() && !excluidas.has(t.trim().toLowerCase())) {
        setOpcoes.add(t.trim());
      }
    });
  } else if (typeof dadosValorAtual === "string" && dadosValorAtual.trim() && !excluidas.has(dadosValorAtual.trim().toLowerCase())) {
    setOpcoes.add(dadosValorAtual.trim());
  }

  // 4. Valores em uso no repositório para ESTA chave específica
  if (cache && cache.itens) {
    const itensFiltrados = prefixoCaminho
      ? cache.itens.filter(i => i.caminho.startsWith(prefixoCaminho))
      : cache.itens;

    itensFiltrados.forEach(item => {
      const val = item.doc?.dados?.[chave];
      if (Array.isArray(val)) {
        val.forEach(t => {
          if (typeof t === "string" && t.trim() && !excluidas.has(t.trim().toLowerCase())) {
            setOpcoes.add(t.trim());
          }
        });
      } else if (typeof val === "string" && val.trim() && !excluidas.has(val.trim().toLowerCase())) {
        setOpcoes.add(val.trim());
      }
    });
  }

  return Array.from(setOpcoes).sort((a, b) => a.localeCompare(b));
}

export function salvarOpcoesPropriedadeLocal(chave: string, opcoes: string[]) {
  try {
    localStorage.setItem(`klaus_opcoes_prop_${chave}`, JSON.stringify(Array.from(new Set(opcoes))));
  } catch {}
}

export function obterTagsDisponiveis(dadosTagsAtuais: string[], coresTagsGlobais: Record<string, string>): string[] {
  return obterOpcoesDaPropriedade("tags", dadosTagsAtuais, undefined, coresTagsGlobais);
}

export function abrirItemSpa(caminho: string) {
  if (!caminho) return;
  window.dispatchEvent(new CustomEvent("klaus-abrir-item", { detail: { caminho } }));

  const pasta = caminho.split("/")[0]?.toLowerCase() || "";
  let rota = "/notas";
  if (pasta === "tarefas") rota = "/tarefas";
  else if (pasta === "referencias") rota = "/referencias";
  else if (pasta === "pdi" || pasta === "metas") rota = "/pdi";
  else if (pasta === "lousas") rota = "/lousas";
  else if (pasta === "notas" || pasta === "reunioes") rota = "/notas";

  window.location.hash = `#${rota}?abrir=${encodeURIComponent(caminho)}`;
  window.dispatchEvent(new HashChangeEvent("hashchange"));
}

export type TipoPropriedade = 
  | "texto" 
  | "numero" 
  | "data" 
  | "checkbox" 
  | "select" 
  | "multiselect" 
  | "relation"
  | "status"
  | "criado_por"
  | "criado_em"
  | "ultima_edicao";

export type OpcaoVisibilidade = "sempre" | "vazia" | "esconder";

const ICONES_TIPO: Record<TipoPropriedade, React.ElementType> = {
  texto: Type,
  numero: Hash,
  data: CalendarIcon,
  checkbox: CheckSquare,
  select: ListTodo,
  multiselect: Tags,
  relation: LinkIcon,
  status: ListTodo,
  criado_por: User,
  criado_em: Clock,
  ultima_edicao: Clock,
};

const NOMES_TIPO: Record<TipoPropriedade, string> = {
  texto: "Texto",
  numero: "Número",
  data: "Data",
  checkbox: "Checkbox",
  select: "Seleção",
  multiselect: "Múltipla Seleção",
  relation: "Relacionamento",
  status: "Status",
  criado_por: "Criado por",
  criado_em: "Criado em",
  ultima_edicao: "Última edição em",
};

const NOMES_PADRAO_TIPO: Record<TipoPropriedade, string> = {
  texto: "Texto",
  numero: "Número",
  data: "Data",
  checkbox: "Checkbox",
  select: "Seleção",
  multiselect: "Tags",
  relation: "Relacionamento",
  status: "Status",
  criado_por: "Criado por",
  criado_em: "Criado em",
  ultima_edicao: "Última edição em",
};

export const CORES_NOTION: Record<string, { bg: string; text: string; border: string; nome: string }> = {
  cinza: { bg: "bg-stone-500/15", text: "text-stone-700 dark:text-stone-300", border: "border-stone-500/20", nome: "Cinza" },
  azul: { bg: "bg-blue-500/15", text: "text-blue-700 dark:text-blue-300", border: "border-blue-500/20", nome: "Azul" },
  verde: { bg: "bg-emerald-500/15", text: "text-emerald-700 dark:text-emerald-300", border: "border-emerald-500/20", nome: "Verde" },
  amarelo: { bg: "bg-amber-500/15", text: "text-amber-700 dark:text-amber-300", border: "border-amber-500/20", nome: "Amarelo" },
  vermelho: { bg: "bg-rose-500/15", text: "text-rose-700 dark:text-rose-300", border: "border-rose-500/20", nome: "Vermelho" },
  roxo: { bg: "bg-purple-500/15", text: "text-purple-700 dark:text-purple-300", border: "border-purple-500/20", nome: "Roxo" },
  rosa: { bg: "bg-pink-500/15", text: "text-pink-700 dark:text-pink-300", border: "border-pink-500/20", nome: "Rosa" },
  laranja: { bg: "bg-orange-500/15", text: "text-orange-700 dark:text-orange-300", border: "border-orange-500/20", nome: "Laranja" },
};

export const STATUS_NOTION: Record<string, { label: string; cor: string }> = {
  "a-fazer": { label: "A fazer", cor: "cinza" },
  "fazendo": { label: "Fazendo", cor: "azul" },
  "feito": { label: "Feito", cor: "verde" },
};

export const PRIORIDADES_NOTION: Record<string, { label: string; cor: string }> = {
  baixa: { label: "Baixa", cor: "azul" },
  media: { label: "Média", cor: "amarelo" },
  alta: { label: "Alta", cor: "laranja" },
  urgente: { label: "Urgente", cor: "vermelho" },
};

const CONFIG_KEY = "segundo-cerebro-propriedades-config";

export interface ConfigPropriedadesGlobais {
  rotulos: Record<string, string>;
  coresTags: Record<string, string>;
  icones: Record<string, string>;
  coresIcones: Record<string, string>;
  descricoes: Record<string, string>;
  ordensPorCategoria: Record<string, string[]>;
}

export function lerConfigPropriedadesGlobais(): ConfigPropriedadesGlobais {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (!raw) {
      return {
        rotulos: {},
        coresTags: {},
        icones: {},
        coresIcones: {},
        descricoes: {},
        ordensPorCategoria: {},
      };
    }
    const parsed = JSON.parse(raw);
    return {
      rotulos: parsed?.rotulos || {},
      coresTags: parsed?.coresTags || {},
      icones: parsed?.icones || {},
      coresIcones: parsed?.coresIcones || {},
      descricoes: parsed?.descricoes || {},
      ordensPorCategoria: parsed?.ordensPorCategoria || {},
    };
  } catch {
    return {
      rotulos: {},
      coresTags: {},
      icones: {},
      coresIcones: {},
      descricoes: {},
      ordensPorCategoria: {},
    };
  }
}

export function salvarConfigPropriedadesGlobais(
  novosRotulos?: Record<string, string>,
  novasCores?: Record<string, string>,
  novosIcones?: Record<string, string>,
  novasCoresIcones?: Record<string, string>,
  novasDescricoes?: Record<string, string>,
  novasOrdens?: Record<string, string[]>
) {
  try {
    const atual = lerConfigPropriedadesGlobais();
    const proximo = {
      rotulos: { ...atual.rotulos, ...novosRotulos },
      coresTags: { ...atual.coresTags, ...novasCores },
      icones: { ...atual.icones, ...novosIcones },
      coresIcones: { ...atual.coresIcones, ...novasCoresIcones },
      descricoes: { ...atual.descricoes, ...novasDescricoes },
      ordensPorCategoria: { ...atual.ordensPorCategoria, ...novasOrdens },
    };
    localStorage.setItem(CONFIG_KEY, JSON.stringify(proximo));
  } catch {
    // silencioso
  }
}

export function normalizarStatus(val: string): string {
  if (val === "a_fazer") return "a-fazer";
  if (val === "em_andamento") return "fazendo";
  if (val === "concluida") return "feito";
  if (val === "pausada") return "a-fazer";
  if (val === "cancelada") return "a-fazer";
  return val || "a-fazer";
}

export function obterIniciais(nome: string) {
  const partes = (nome || "").trim().split(/\s+/);
  if (partes.length === 0 || !partes[0]) return "?";
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

interface ModalEditarContatoRapidoProps {
  aberto: boolean;
  aoFechar: () => void;
  contatoInicial?: { caminho?: string; sha?: string; titulo: string; cargo?: string; empresa?: string; email?: string } | null;
  aoSalvarSucesso: (contatoSalvo: Contato) => void;
}

export function ModalEditarContatoRapido({
  aberto,
  aoFechar,
  contatoInicial,
  aoSalvarSucesso,
}: ModalEditarContatoRapidoProps) {
  const [nome, setNome] = useState("");
  const [cargo, setCargo] = useState("");
  const [empresa, setEmpresa] = useState("");
  const [email, setEmail] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => {
    if (aberto) {
      setNome(contatoInicial?.titulo || "");
      setCargo(contatoInicial?.cargo || "");
      setEmpresa(contatoInicial?.empresa || "");
      setEmail(contatoInicial?.email || "");
      setErro("");
      setSalvando(false);
    }
  }, [aberto, contatoInicial]);

  const aoSalvar = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const nomeLimpo = nome.trim();
    if (!nomeLimpo) {
      setErro("O nome do contato é obrigatório.");
      return;
    }

    setSalvando(true);
    setErro("");
    try {
      const cfg = lerConfig();
      const todosContatos = cache?.itens ? cache.itens.map((i) => i.caminho) : [];
      const caminho = contatoInicial?.caminho || nomeLivre(PASTAS.contatos, nomeLimpo, todosContatos);

      const objetoContato: Contato = {
        caminho,
        id: idDoCaminho(caminho),
        sha: contatoInicial?.sha || "",
        titulo: nomeLimpo,
        cargo: cargo.trim() || undefined,
        empresa: empresa.trim() || undefined,
        email: email.trim() || undefined,
        tags: ["contato"],
        propriedades: {},
        corpo: "",
        bruto: {},
      };

      const { dados: fm, corpo } = contatoParaArquivo(objetoContato);
      const texto = escreverMarkdown({ dados: fm, corpo });
      const novaSha = await gravar(cfg, caminho, texto, contatoInicial?.sha || undefined, `salvar contato: ${nomeLimpo}`);

      invalidarCache();
      dispararAtualizacaoAcervo();
      toast(contatoInicial?.sha ? `Contato "${nomeLimpo}" atualizado!` : `Contato "${nomeLimpo}" criado com sucesso!`);

      aoSalvarSucesso({ ...objetoContato, sha: novaSha });
      aoFechar();
    } catch (err: any) {
      setErro(err?.message || "Erro ao salvar contato.");
    } finally {
      setSalvando(false);
    }
  };

  if (!aberto) return null;

  return (
    <Modal
      aberto={aberto}
      aoFechar={aoFechar}
      titulo={contatoInicial?.sha ? "Editar Contato" : "Novo Contato"}
      tamanho="padrao"
      rodape={
        <div className="flex items-center justify-end gap-2 w-full">
          <Botao type="button" variante="neutro" onClick={aoFechar} disabled={salvando} tamanho="pequeno">
            Cancelar
          </Botao>
          <Botao type="button" variante="primario" onClick={aoSalvar} disabled={salvando || !nome.trim()} tamanho="pequeno">
            {salvando ? "Salvando..." : contatoInicial?.sha ? "Salvar Alterações" : "Criar Contato"}
          </Botao>
        </div>
      }
    >
      <form onSubmit={aoSalvar} className="space-y-3.5 py-1">
        {erro && (
          <div className="p-2.5 rounded-lg bg-destructive/10 text-destructive text-xs border border-destructive/20 font-medium">
            {erro}
          </div>
        )}

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            <User size={13} className="text-primary" />
            Nome Completo <span className="text-destructive">*</span>
          </label>
          <input
            type="text"
            placeholder="Ex: Mariana Souza"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            autoFocus
            className="w-full bg-accent/30 border border-border text-xs px-3 py-2 rounded-lg outline-none focus:ring-1 focus:ring-primary text-foreground"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Briefcase size={13} className="text-blue-500" />
              Cargo / Função
            </label>
            <input
              type="text"
              placeholder="Ex: Design Lead, Tech Lead..."
              value={cargo}
              onChange={(e) => setCargo(e.target.value)}
              className="w-full bg-accent/30 border border-border text-xs px-3 py-2 rounded-lg outline-none focus:ring-1 focus:ring-primary text-foreground"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Building size={13} className="text-emerald-500" />
              Empresa / Time
            </label>
            <input
              type="text"
              placeholder="Ex: Nubank, Design Ops..."
              value={empresa}
              onChange={(e) => setEmpresa(e.target.value)}
              className="w-full bg-accent/30 border border-border text-xs px-3 py-2 rounded-lg outline-none focus:ring-1 focus:ring-primary text-foreground"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            <MailIcon size={13} className="text-indigo-500" />
            E-mail (opcional)
          </label>
          <input
            type="email"
            placeholder="Ex: mariana@empresa.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-accent/30 border border-border text-xs px-3 py-2 rounded-lg outline-none focus:ring-1 focus:ring-primary text-foreground"
          />
        </div>
      </form>
    </Modal>
  );
}

type PropriedadesNotionProps = {
  dados: Record<string, any>;
  onChange: (novosDados: Record<string, any>) => void;
  corpoTexto?: string;
  camposFixos?: {
    [key: string]: {
      icone: React.ReactNode;
      tipo: TipoPropriedade;
      opcoes?: string[]; 
    };
  };
  opcoesRelacionamento?: { titulo: string; caminho: string }[];
  caminhoItem?: string;
  rotuloTipo?: string;
  focoPropriedadeInicial?: string;
  aoMoverPasta?: (novaPasta: string) => Promise<any> | void;
  aoRemover?: () => Promise<void> | void;
};

export function PropriedadesNotion({ 
  dados, 
  onChange, 
  camposFixos = {}, 
  opcoesRelacionamento = [],
  caminhoItem,
  rotuloTipo,
  focoPropriedadeInicial,
  aoMoverPasta,
  aoRemover,
}: PropriedadesNotionProps) {
  const { abrirFlutuante } = useItemFlutuante();
  const [menuAberto, setMenuAberto] = useState<string | null>(null);

  const aoClicarItemRel = async (itemAlvo?: { titulo: string; caminho: string }, nomePuro?: string) => {
    if (!itemAlvo && !nomePuro) return;

    const nomeBusca = (nomePuro || itemAlvo?.titulo || "").trim();
    const caminhoBusca = (itemAlvo?.caminho || "").trim();

    let itens = cache?.itens;
    if (!itens || itens.length === 0) {
      try {
        const cfg = lerConfig();
        const todos = await carregarRepo(cfg);
        itens = todos;
      } catch {}
    }

    if (!itens || itens.length === 0) {
      if (caminhoBusca) abrirItemSpa(caminhoBusca);
      return;
    }

    const indice = montarIndice(itens);
    const chaveAlvo = chaveNormalizada(caminhoBusca || nomeBusca);
    const resolvido = indice.get(chaveAlvo) || 
                      indice.get(chaveNormalizada(nomeBusca)) || 
                      indice.get(chaveNormalizada(caminhoBusca));

    const caminhoFinal = resolvido?.caminho || caminhoBusca;

    const itemRepo = itens.find((i) => {
      if (caminhoFinal && i.caminho.toLowerCase() === caminhoFinal.toLowerCase()) return true;
      if (caminhoBusca && i.caminho.toLowerCase() === caminhoBusca.toLowerCase()) return true;
      const t = tituloProvavel(i.doc, i.nome).toLowerCase().trim();
      if (t === nomeBusca.toLowerCase()) return true;
      const nomeSemExt = i.nome.replace(/\.(md|json|excalidraw)$/i, "").toLowerCase().trim();
      return nomeSemExt === nomeBusca.toLowerCase();
    });

    if (itemRepo) {
      const caminho = itemRepo.caminho;
      const pasta = caminho.split("/")[0]?.toLowerCase() || "";
      const tit = tituloProvavel(itemRepo.doc, itemRepo.nome);
      const corpo = itemRepo.doc.corpo || "";
      const dadosProps = itemRepo.doc.dados || {};

      let rotulo = "Documento";
      let camposFixosProps: any = undefined;

      if (pasta === "tarefas") {
        rotulo = "Tarefa";
        camposFixosProps = {
          status: { icone: <ListTodo className="h-4 w-4 opacity-70 text-blue-500" />, tipo: "status" },
          prioridade: { icone: <Flag className="h-4 w-4 opacity-70 text-amber-500" />, tipo: "select", opcoes: ["Urgente", "Alta", "Média", "Baixa"] },
          prazo: { icone: <CalendarIcon className="h-4 w-4 opacity-70 text-rose-500" />, tipo: "data" },
          tags: { icone: <Tags className="h-4 w-4 opacity-70 text-emerald-500" />, tipo: "multiselect" },
        };
      } else if (pasta === "notas") {
        rotulo = "Nota";
      } else if (pasta === "contatos") {
        rotulo = "Contato";
        camposFixosProps = {
          cargo: { icone: <Briefcase className="h-4 w-4 opacity-70 text-blue-500" />, tipo: "texto" },
          empresa: { icone: <Building className="h-4 w-4 opacity-70 text-emerald-500" />, tipo: "texto" },
          email: { icone: <MailIcon className="h-4 w-4 opacity-70 text-indigo-500" />, tipo: "texto" },
          tags: { icone: <Tags className="h-4 w-4 opacity-70 text-amber-500" />, tipo: "multiselect" },
        };
      } else if (pasta === "referencias") {
        rotulo = "Referência";
        camposFixosProps = {
          tags: { icone: <Tags className="h-4 w-4 opacity-70 text-rose-500" />, tipo: "multiselect" },
          fonte: { icone: <LinkIcon className="h-4 w-4 opacity-70 text-blue-500" />, tipo: "texto" },
        };
      } else if (pasta === "pdi" || pasta === "metas") {
        rotulo = caminho.includes("entregas") ? "Entrega PDI" : "Meta PDI";
        camposFixosProps = {
          impacto: { icone: <Sparkles className="h-4 w-4 opacity-70 text-amber-500" />, tipo: "texto" },
          colaboracao: { icone: <Users className="h-4 w-4 opacity-70 text-teal-500" />, tipo: "multiselect" },
          tags: { icone: <Tags className="h-4 w-4 opacity-70 text-emerald-500" />, tipo: "multiselect" },
        };
      } else if (pasta === "lousas") {
        rotulo = "Lousa";
      }

      abrirFlutuante({
        id: caminho,
        caminho,
        sha: itemRepo.sha,
        rotuloTipo: rotulo,
        titulo: tit,
        corpo,
        dadosProps,
        camposFixosProps,
        aoSalvar: async (itemEditado) => {
          const cfg = lerConfig();
          const mdPronto = escreverMarkdown({
            dados: itemEditado.dadosProps,
            corpo: itemEditado.corpo,
          });
          await gravar(cfg, caminho, mdPronto, `Atualiza ${tit} via pop-up de relacionamento`, itemRepo.sha);
          invalidarCache();
          dispararAtualizacaoAcervo();
        },
      });
      return;
    }

    if (caminhoFinal) {
      abrirItemSpa(caminhoFinal);
    }
  };

  const [nomeNovoCampo, setNomeNovoCampo] = useState("");
  const [tipoNovoCampo, setTipoNovoCampo] = useState<TipoPropriedade>("texto");
  const [novaSubpastaInput, setNovaSubpastaInput] = useState("");

  const [mostrandoOcultas, setMostrandoOcultas] = useState(false);
  const [modalContatoAberto, setModalContatoAberto] = useState(false);
  const [contatoParaEditar, setContatoParaEditar] = useState<{ caminho?: string; sha?: string; titulo: string; cargo?: string; empresa?: string; email?: string } | null>(null);
  const [chaveAtivaContato, setChaveAtivaContato] = useState<string>("autor_elogio");

  const [globalConfig, setGlobalConfig] = useState(lerConfigPropriedadesGlobais());

  const contatosDisponiveis = useMemo(() => {
    const lista: Contato[] = [];
    const titulosVistos = new Set<string>();

    if (cache?.itens) {
      for (const item of cache.itens) {
        if (item.caminho.startsWith("contatos/") && item.caminho.endsWith(".md")) {
          try {
            const c = comoContato(item.doc, item.caminho, item.sha, tituloProvavel(item.doc, item.nome));
            if (!titulosVistos.has(c.titulo.toLowerCase().trim())) {
              lista.push(c);
              titulosVistos.add(c.titulo.toLowerCase().trim());
            }
          } catch {}
        }
      }
    }

    const opcoesFixas = camposFixos.autor_elogio?.opcoes || camposFixos.autorElogio?.opcoes;
    if (Array.isArray(opcoesFixas)) {
      for (const nome of opcoesFixas) {
        if (typeof nome === "string" && nome.trim() && !titulosVistos.has(nome.toLowerCase().trim())) {
          lista.push({
            caminho: `contatos/${nomeDeArquivo(nome)}.md`,
            id: idDoCaminho(`contatos/${nomeDeArquivo(nome)}.md`),
            sha: "",
            titulo: nome.trim(),
            tags: [],
            propriedades: {},
            corpo: "",
            bruto: {},
          });
          titulosVistos.add(nome.toLowerCase().trim());
        }
      }
    }

    return lista.sort((a, b) => a.titulo.localeCompare(b.titulo));
  }, [camposFixos]);

  useEffect(() => {
    setGlobalConfig(lerConfigPropriedadesGlobais());
  }, []);

  useEffect(() => {
    if (focoPropriedadeInicial) {
      const timer = setTimeout(() => {
        const el = document.getElementById(`prop-input-${focoPropriedadeInicial}`);
        if (el) {
          el.focus();
          el.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 70);
      return () => clearTimeout(timer);
    }
  }, [focoPropriedadeInicial]);

  const { pastaRaiz, subpastaAtualTexto, nomeAmigavelRaiz, trilhaAmigavel } = useMemo(() => {
    let raiz = "notas";
    let subpastaAtual = "";
    
    if (caminhoItem) {
      const partes = caminhoItem.split("/");
      raiz = partes[0] === "pdi" ? `pdi/${partes[1]}` : partes[0];
      const subpastas = partes.slice(raiz.split("/").length, -1);
      subpastaAtual = subpastas.join("/");
    } else {
      const rotulo = (rotuloTipo || dados.tipo || "").toLowerCase();
      if (rotulo.includes("tarefa")) raiz = "tarefas";
      else if (rotulo.includes("meta")) raiz = "pdi/metas";
      else if (rotulo.includes("entrega")) raiz = "pdi/entregas";
      else if (rotulo.includes("referencia") || rotulo.includes("referência")) raiz = "referencias";
      else if (rotulo.includes("reuniao") || rotulo.includes("reunião")) raiz = "reunioes";
      else if (rotulo.includes("contato")) raiz = "contatos";
      else raiz = "notas";
    }

    const mapaNomes: Record<string, string> = {
      notas: "Notas",
      tarefas: "Tarefas",
      "pdi/metas": "PDI / Metas",
      "pdi/entregas": "PDI / Entregas",
      referencias: "Referências",
      reunioes: "Reuniões",
      contatos: "Contatos",
    };

    const nomeRaiz = mapaNomes[raiz] || raiz;
    const trilha = subpastaAtual ? `${nomeRaiz} › ${subpastaAtual.split("/").join(" › ")}` : `${nomeRaiz} (Raiz)`;

    return {
      pastaRaiz: raiz,
      subpastaAtualTexto: subpastaAtual,
      nomeAmigavelRaiz: nomeRaiz,
      trilhaAmigavel: trilha,
    };
  }, [caminhoItem, rotuloTipo, dados.tipo]);

  const pastasDaCategoria = useMemo(() => {
    if (!pastaRaiz || !cache || !cache.itens) return [];
    const prefixo = `${pastaRaiz}/`;
    const conjunto = new Set<string>();
    for (const item of cache.itens) {
      if (item.caminho.startsWith(prefixo)) {
        const pedacos = item.caminho.slice(prefixo.length).split("/").slice(0, -1);
        if (pedacos.length > 0) {
          for (let i = 1; i <= pedacos.length; i++) {
            conjunto.add(pedacos.slice(0, i).join("/"));
          }
        }
      }
    }
    return Array.from(conjunto).sort((a, b) => a.localeCompare(b));
  }, [pastaRaiz]);

  useEffect(() => {
    if (!menuAberto) return;
    const aoClicarFora = (e: PointerEvent) => {
      const el = e.target as HTMLElement | null;
      if (!el) return;
      const dentroDoPopover = el.closest('[data-radix-popper-content-wrapper], [role="dialog"], [role="menu"]');
      if (!dentroDoPopover) {
        setMenuAberto(null);
      }
    };
    window.addEventListener("pointerdown", aoClicarFora, { capture: true });
    return () => window.removeEventListener("pointerdown", aoClicarFora, { capture: true });
  }, [menuAberto]);

  const esquema = (dados.esquema as Record<string, TipoPropriedade>) || {};
  const visibilidadeMap = (dados._visibilidade as Record<string, OpcaoVisibilidade>) || {};
  const coresMap = { ...globalConfig.coresTags, ...((dados._coresTags as Record<string, string>) || {}) };
  const rotulosMap = { ...globalConfig.rotulos, ...((dados._rotulos as Record<string, string>) || {}) };
  const iconesMap = { ...globalConfig.icones, ...((dados._icones as Record<string, string>) || {}) };
  const coresIconesMap = { ...globalConfig.coresIcones, ...((dados._coresIcones as Record<string, string>) || {}) };
  const descricoesMap = { ...globalConfig.descricoes, ...((dados._descricoes as Record<string, string>) || {}) };
  const ordemCustomizada = (dados._ordem as string[]) || globalConfig.ordensPorCategoria?.[pastaRaiz] || [];

  const ehLembrete = rotuloTipo?.toLowerCase().includes("lembrete") || dados.tipo === "lembrete";
  const chavesLembrete = ["horario", "hora", "aviso_inbox", "notificacao_inbox", "aviso_telegram", "notificacao_telegram", "aviso_email", "notificacao_email"];
  const chavesExclusivasTarefa = ["caminho", "pasta", "status", "prioridade", "pomodoro", "pomodoros", "pomodoros_estimados", "pomodoro_estimado", "pomodoros_realizados", "pomodoro_realizado", "pomodoro_fraturado", "PomodoroFraturado", "fraturados", "estimativa", "c", "indicador", "metas"];

  const todasAsChaves = Array.from(new Set([...Object.keys(camposFixos), ...Object.keys(dados)]))
    .filter(k => {
      if ([
        "titulo", "tipo", "atualizado", "atualizado_em", "criado", "autor", "criado_em", "criado_por", "ultima_edicao", "id", "esquema", "_visibilidade", "_coresTags", "_rotulos", "_icones", "_coresIcones", "_descricoes", "_ordem", "c", "pomodoro", "pomodoros", "pomodoros_estimados", "pomodoro_estimado", "pomodoros_realizados", "pomodoro_realizado", "pomodoro_fraturado", "PomodoroFraturado", "fraturados", "estimativa", "porque", "anotacoes",
        "subtipo", "fixado", "demo", "ia_sugeriu"
      ].includes(k)) return false;
      if (ehLembrete && chavesExclusivasTarefa.includes(k)) return false;
      if (!ehLembrete && chavesLembrete.includes(k)) return false;
      return true;
    });
    
  const temRelacionamentos = (Array.isArray(dados.relacionamentos) && dados.relacionamentos.length > 0) ||
    (Array.isArray(dados.relacao) && dados.relacao.length > 0);
  if (temRelacionamentos && !todasAsChaves.includes("relacionamentos")) {
    todasAsChaves.push("relacionamentos");
  }
  if (!todasAsChaves.includes("tags")) todasAsChaves.push("tags");
  if (!ehLembrete && !todasAsChaves.includes("caminho")) todasAsChaves.push("caminho");
  if (!todasAsChaves.includes("criado_por")) todasAsChaves.push("criado_por");
  if (!todasAsChaves.includes("criado_em")) todasAsChaves.push("criado_em");
  if (!todasAsChaves.includes("ultima_edicao")) todasAsChaves.push("ultima_edicao");

  // Ordenação customizada persistida
  if (ordemCustomizada.length > 0) {
    todasAsChaves.sort((a, b) => {
      const idxA = ordemCustomizada.indexOf(a);
      const idxB = ordemCustomizada.indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return 0;
    });
  }

  function nomeExibido(chave: string): string {
    if (chave === "Pomodoro" || chave === "pomodoro" || chave === "estimativa" || chave === "c") return "Pomodoro";
    if (chave === "prioridade") return "Prioridade";
    if (chave === "indicador") return "Indicador";
    if (chave === "metas") return "Metas Vinculadas";
    if (chave === "data") return "Data";
    if (chave === "horario" || chave === "hora") return "Horário";
    if (chave === "aviso_inbox" || chave === "notificacao_inbox") return "Avisar na Caixa de Entrada";
    if (chave === "aviso_telegram" || chave === "notificacao_telegram") return "Avisar no Telegram";
    if (chave === "aviso_email" || chave === "notificacao_email") return "Avisar por E-mail";
    if (chave === "fonte" || chave === "sourceUrl") return "Link da fonte";
    if (rotulosMap[chave]) return rotulosMap[chave];
    if (chave === "relacionamentos" || chave === "relacao") return "Relacionamentos";
    if (chave === "caminho" || chave === "pasta") return "Caminho";
    if (chave === "criado_por" || chave === "autor") return "Criado por";
    if (chave === "criado_em" || chave === "criado") return "Criado em";
    if (chave === "ultima_edicao" || chave === "atualizado" || chave === "atualizado_em") return "Última edição em";
    if (chave === "status") return "Status";
    if (chave === "prazo") return rotuloTipo?.toLowerCase().includes("lembrete") ? "Data do Lembrete" : "Prazo";
    if (chave === "tags") return "Tags";
    if (chave === "paleta" || chave === "palette" || chave === "cores") return "Paleta de Cores";
    if (chave === "cargo") return "Cargo";
    if (chave === "empresa") return "Empresa";
    if (chave === "email") return "E-mail";
    if (chave === "telefone") return "Telefone";
    if (chave === "pai_id" || chave === "paiId" || chave === "pai" || chave === "contato_pai" || chave === "responde_a" || chave === "lider") return "Responde a (Líder)";
    if (chave === "impacto") return "Impacto / Resultado";
    if (chave === "elogio") return "Elogio / Feedback";
    if (chave === "autor_elogio" || chave === "autorElogio") return "Autor do Elogio";
    if (chave === "colaboracao" || chave === "equipe") return "Colaboração & Equipe";
    
    const formatado = chave.replace(/[_-]+/g, " ").trim();
    if (!formatado) return chave;
    return formatado.charAt(0).toUpperCase() + formatado.slice(1);
  }

  function atualizar(chave: string, valor: any) {
    onChange({ ...dados, [chave]: valor });
  }

  function atualizarEsquema(chave: string, tipo: TipoPropriedade) {
    const novoEsquema = { ...esquema, [chave]: tipo };
    onChange({ ...dados, esquema: novoEsquema });
  }

  function atualizarVisibilidade(chave: string, op: OpcaoVisibilidade) {
    const novo = { ...visibilidadeMap, [chave]: op };
    onChange({ ...dados, _visibilidade: novo });
  }

  function atualizarCorTag(tag: string, cor: string) {
    const novasCores = { ...coresMap, [tag]: cor };
    salvarConfigPropriedadesGlobais(undefined, { [tag]: cor });
    setGlobalConfig(lerConfigPropriedadesGlobais());
    onChange({ ...dados, _coresTags: novasCores });
  }

  function atualizarDescricaoPropriedade(chave: string, desc: string) {
    const novasDescricoes = { ...descricoesMap, [chave]: desc };
    salvarConfigPropriedadesGlobais(undefined, undefined, undefined, undefined, { [chave]: desc });
    setGlobalConfig(lerConfigPropriedadesGlobais());
    onChange({ ...dados, _descricoes: novasDescricoes });
  }

  function atualizarIconePropriedade(chave: string, icone: string) {
    const novosIcones = { ...iconesMap, [chave]: icone };
    salvarConfigPropriedadesGlobais(undefined, undefined, { [chave]: icone });
    setGlobalConfig(lerConfigPropriedadesGlobais());
    onChange({ ...dados, _icones: novosIcones });
  }

  function atualizarCorIconePropriedade(chave: string, cor: string) {
    const novasCoresIcones = { ...coresIconesMap, [chave]: cor };
    salvarConfigPropriedadesGlobais(undefined, undefined, undefined, { [chave]: cor });
    setGlobalConfig(lerConfigPropriedadesGlobais());
    onChange({ ...dados, _coresIcones: novasCoresIcones });
  }

  function remover(chave: string) {
    if (camposFixos[chave]) return;
    const novos: Record<string, any> = { ...dados };
    delete novos[chave];
    if (novos.esquema) delete (novos.esquema as any)[chave];
    if (novos._visibilidade) delete (novos._visibilidade as any)[chave];
    if (novos._rotulos) delete (novos._rotulos as any)[chave];
    if (novos._icones) delete (novos._icones as any)[chave];
    if (novos._coresIcones) delete (novos._coresIcones as any)[chave];
    if (novos._descricoes) delete (novos._descricoes as any)[chave];
    onChange(novos);
  }

  function renomear(velha: string, nova: string) {
    if (!nova.trim() || nomeExibido(velha) === nova) return;
    
    const novosRotulos = { ...rotulosMap, [velha]: nova.trim() };
    salvarConfigPropriedadesGlobais({ [velha]: nova.trim() });
    setGlobalConfig(lerConfigPropriedadesGlobais());
    
    const novos: Record<string, any> = { ...dados, _rotulos: novosRotulos };

    if (!camposFixos[velha] && velha !== nova) {
      novos[nova] = novos[velha];
      delete novos[velha];

      if (novos.esquema && (novos.esquema as any)[velha]) {
        (novos.esquema as any)[nova] = (novos.esquema as any)[velha];
        delete (novos.esquema as any)[velha];
      }
    }

    onChange(novos);
    setMenuAberto(null);
  }

  function moverPropriedade(chave: string, direcao: "cima" | "baixo") {
    const idx = chavesVisiveis.indexOf(chave);
    if (idx === -1) return;
    const novoIdx = direcao === "cima" ? idx - 1 : idx + 1;
    if (novoIdx < 0 || novoIdx >= chavesVisiveis.length) return;

    const copia = [...chavesVisiveis];
    const [removido] = copia.splice(idx, 1);
    copia.splice(novoIdx, 0, removido);

    const novaOrdemCompleta = Array.from(new Set([...copia, ...todasAsChaves]));
    const novosDados = { ...dados, _ordem: novaOrdemCompleta };
    salvarConfigPropriedadesGlobais(undefined, undefined, undefined, undefined, undefined, {
      [pastaRaiz]: novaOrdemCompleta,
    });
    setGlobalConfig(lerConfigPropriedadesGlobais());
    onChange(novosDados);
  }

  function duplicarPropriedade(chave: string) {
    if (camposFixos[chave]) return;
    let novoNome = `${chave}_copia`;
    let idx = 2;
    while (dados[novoNome] !== undefined || camposFixos[novoNome] !== undefined) {
      novoNome = `${chave}_copia_${idx}`;
      idx++;
    }

    const valorOriginal = dados[chave];
    const tipoOriginal = esquema[chave] || "texto";
    const novos = {
      ...dados,
      [novoNome]: valorOriginal !== undefined ? JSON.parse(JSON.stringify(valorOriginal)) : "",
      esquema: { ...esquema, [novoNome]: tipoOriginal },
    };
    if (rotulosMap[chave]) {
      novos._rotulos = { ...rotulosMap, [novoNome]: `${rotulosMap[chave]} (Cópia)` };
    }
    onChange(novos);
    toast(`Propriedade "${nomeExibido(chave)}" duplicada.`);
    setMenuAberto(null);
  }

  function criarNovaPropriedade(tipo: TipoPropriedade) {
    const nomePadrao = NOMES_PADRAO_TIPO[tipo] || "Propriedade";
    const nomeBase = nomeNovoCampo.trim() || nomePadrao;
    let nomeFinal = nomeBase;
    let idx = 2;
    while (dados[nomeFinal] !== undefined || camposFixos[nomeFinal] !== undefined) {
      nomeFinal = `${nomeBase} ${idx}`;
      idx++;
    }

    const novos: Record<string, any> = { ...dados, [nomeFinal]: "" };
    const novoEsquema = { ...esquema, [nomeFinal]: tipo };
    novos.esquema = novoEsquema;

    onChange(novos);
    setNomeNovoCampo("");
    setMenuAberto(null);
  }

  function ehVazia(chave: string): boolean {
    const v = dados[chave];
    if (v === undefined || v === null || v === "") return true;
    if (Array.isArray(v) && v.length === 0) return true;
    return false;
  }

  const chavesVisiveis: string[] = [];
  const chavesOcultas: string[] = [];

  todasAsChaves.forEach((chave) => {
    const visDefault = ["criado_por", "criado_em", "ultima_edicao", "caminho"].includes(chave) ? "esconder" : "sempre";
    const vis = visibilidadeMap[chave] || visDefault;

    if (vis === "esconder") {
      chavesOcultas.push(chave);
    } else if (vis === "vazia" && ehVazia(chave)) {
      chavesOcultas.push(chave);
    } else {
      chavesVisiveis.push(chave);
    }
  });

  function renderizarBadgeTag(nomeTag: string) {
    const chaveCor = coresMap[nomeTag] || "azul";
    const estiloCor = CORES_NOTION[chaveCor] || CORES_NOTION.azul;
    const idMenu = `tag-${nomeTag}`;

    return (
      <Popover open={menuAberto === idMenu} onOpenChange={(open) => setMenuAberto(open ? idMenu : null)}>
        <PopoverTrigger asChild>
          <Badge 
            variant="secondary" 
            className={cn(
              "font-medium text-[11px] px-2 py-0.5 border cursor-pointer transition-all hover:opacity-85 flex items-center gap-1 shadow-2xs",
              estiloCor.bg,
              estiloCor.text,
              estiloCor.border
            )}
          >
            <span>{nomeTag}</span>
          </Badge>
        </PopoverTrigger>
        <PopoverContent className="w-[180px] p-2" align="start" onInteractOutside={() => setMenuAberto(null)}>
          <p className="text-xs font-semibold text-muted-foreground mb-2">Cor da tag "{nomeTag}"</p>
          <div className="grid grid-cols-2 gap-1">
            {Object.entries(CORES_NOTION).map(([k, c]) => (
              <button
                key={k}
                onClick={() => {
                  atualizarCorTag(nomeTag, k);
                  setMenuAberto(null);
                }}
                className={cn(
                  "px-2 py-1 rounded text-xs text-left font-medium transition-colors border flex items-center justify-between",
                  c.bg,
                  c.text,
                  c.border
                )}
              >
                <span>{c.nome}</span>
                {coresMap[nomeTag] === k && <Check size={12} className="text-primary shrink-0" />}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  function renderizarBadgeStatus(rawVal: string) {
    const val = normalizarStatus(rawVal);
    const info = STATUS_NOTION[val] || { label: "A fazer", cor: "cinza" };
    const estiloCor = CORES_NOTION[info.cor] || CORES_NOTION.cinza;

    return (
      <Popover open={menuAberto === "status-pop"} onOpenChange={(open) => setMenuAberto(open ? "status-pop" : null)}>
        <PopoverTrigger asChild>
          <Badge 
            variant="secondary" 
            className={cn(
              "font-semibold text-xs px-2.5 py-1 border cursor-pointer transition-all hover:scale-105 active:scale-95 flex items-center gap-1.5 shadow-xs",
              estiloCor.bg,
              estiloCor.text,
              estiloCor.border
            )}
          >
            <span>{info.label}</span>
          </Badge>
        </PopoverTrigger>
        <PopoverContent className="w-[180px] p-1.5" align="start" onInteractOutside={() => setMenuAberto(null)}>
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-2 py-1">Alterar Status</p>
          <div className="flex flex-col gap-1 mt-1">
            {Object.entries(STATUS_NOTION).map(([stKey, stInfo]) => {
              const est = CORES_NOTION[stInfo.cor] || CORES_NOTION.cinza;
              return (
                <button
                  key={stKey}
                  onClick={() => {
                    atualizar("status", stKey);
                    setMenuAberto(null);
                  }}
                  className={cn(
                    "w-full px-2.5 py-1.5 rounded-md text-xs font-semibold text-left transition-colors border flex items-center justify-between",
                    est.bg,
                    est.text,
                    est.border,
                    val === stKey && "ring-2 ring-primary font-bold"
                  )}
                >
                  <span>{stInfo.label}</span>
                  {val === stKey && <Check size={12} className="shrink-0" />}
                </button>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  function renderizarBadgePrioridade(rawVal?: string) {
    const val = (rawVal || "media").toLowerCase().trim();
    const info = PRIORIDADES_NOTION[val] || { label: rawVal ? rawVal.charAt(0).toUpperCase() + rawVal.slice(1) : "Média", cor: "amarelo" };
    const estiloCor = CORES_NOTION[info.cor] || CORES_NOTION.cinza;

    return (
      <Popover open={menuAberto === "prioridade-pop"} onOpenChange={(open) => setMenuAberto(open ? "prioridade-pop" : null)}>
        <PopoverTrigger asChild>
          <Badge 
            variant="secondary" 
            className={cn(
              "font-semibold text-xs px-2.5 py-1 border cursor-pointer transition-all hover:scale-105 active:scale-95 flex items-center gap-1.5 shadow-xs",
              estiloCor.bg,
              estiloCor.text,
              estiloCor.border
            )}
          >
            <Flag size={11} className="shrink-0 opacity-80" />
            <span>{info.label}</span>
          </Badge>
        </PopoverTrigger>
        <PopoverContent className="w-[180px] p-1.5" align="start" onInteractOutside={() => setMenuAberto(null)}>
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-2 py-1">Definir Prioridade</p>
          <div className="flex flex-col gap-1 mt-1">
            {Object.entries(PRIORIDADES_NOTION).map(([prioKey, prioInfo]) => {
              const est = CORES_NOTION[prioInfo.cor] || CORES_NOTION.cinza;
              return (
                <button
                  key={prioKey}
                  onClick={() => {
                    atualizar("prioridade", prioKey);
                    setMenuAberto(null);
                  }}
                  className={cn(
                    "w-full px-2.5 py-1.5 rounded-md text-xs font-semibold text-left transition-colors border flex items-center justify-between",
                    est.bg,
                    est.text,
                    est.border,
                    val === prioKey && "ring-2 ring-primary font-bold"
                  )}
                >
                  <div className="flex items-center gap-1.5">
                    <Flag size={12} className="shrink-0" />
                    <span>{prioInfo.label}</span>
                  </div>
                  {val === prioKey && <Check size={12} className="shrink-0" />}
                </button>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  function renderizarValor(chave: string) {
    const fixo = camposFixos[chave];
    const valor = dados[chave];
    const tipo = 
      chave === "status" ? "status" :
      chave === "prioridade" ? "select" :
      chave === "caminho" ? "caminho" :
      chave === "relacionamentos" || chave === "relacao" ? "relation" :
      chave === "criado_por" ? "criado_por" :
      chave === "criado_em" || chave === "criado" ? "criado_em" :
      chave === "ultima_edicao" || chave === "atualizado" || chave === "atualizado_em" ? "ultima_edicao" :
      chave === "aviso_inbox" || chave === "aviso_telegram" || chave === "aviso_email" ? "checkbox" :
      chave === "data" || chave === "prazo" ? "data" :
      fixo?.tipo || esquema[chave] || (Array.isArray(valor) ? "multiselect" : typeof valor === "boolean" ? "checkbox" : "texto");

    const idPopover = `prop-pop-${chave}`;

    if (tipo === "status" || chave === "status") {
      return renderizarBadgeStatus(valor || "a-fazer");
    }

    if (chave === "prioridade") {
      return renderizarBadgePrioridade(valor);
    }

    if (chave === "autor_elogio" || chave === "autorElogio" || chave === "contato_pai" || chave === "pai_id") {
      return (
        <div className="flex items-center gap-1.5 flex-wrap py-0.5">
          {valor ? (
            <div className="inline-flex items-center gap-2 px-2 py-0.5 rounded-md bg-accent/60 border border-border/70 text-xs">
              <span className="font-medium text-foreground">{valor}</span>
              <button
                type="button"
                onClick={() => {
                  setContatoParaEditar({ titulo: valor });
                  setChaveAtivaContato(chave);
                  setModalContatoAberto(true);
                }}
                className="p-0.5 text-muted-foreground hover:text-foreground rounded cursor-pointer"
                title="Editar dados deste contato"
              >
                <Pencil size={11} />
              </button>
              <button
                type="button"
                onClick={() => atualizar(chave, "")}
                className="p-0.5 text-muted-foreground hover:text-destructive rounded cursor-pointer"
                title="Remover"
              >
                <X size={11} />
              </button>
            </div>
          ) : (
            <Popover open={menuAberto === `contato-${chave}`} onOpenChange={(open) => setMenuAberto(open ? `contato-${chave}` : null)}>
              <PopoverTrigger asChild>
                <button className="h-6 px-1.5 text-xs text-muted-foreground hover:text-foreground rounded hover:bg-accent flex items-center gap-1 transition-colors">
                  <Plus size={11} />
                  <span>Selecionar contato</span>
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-[220px] p-0" align="start" onInteractOutside={() => setMenuAberto(null)}>
                <Command>
                  <CommandInput placeholder="Buscar contato..." />
                  <CommandList>
                    <CommandEmpty className="p-2 text-xs text-muted-foreground">Nenhum contato encontrado</CommandEmpty>
                    <CommandGroup>
                      {contatosDisponiveis.map((c) => (
                        <CommandItem
                          key={c.caminho}
                          onSelect={() => {
                            atualizar(chave, c.titulo);
                            setMenuAberto(null);
                          }}
                          className="text-xs cursor-pointer flex items-center justify-between"
                        >
                          <span>{c.titulo}</span>
                          {valor === c.titulo && <Check size={12} className="text-primary shrink-0" />}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          )}
        </div>
      );
    }

    if (tipo === "criado_por" || chave === "criado_por") {
      const autor = (typeof valor === "string" && valor.trim()) || nomeDoUsuario(lerConfig());
      return (
        <span className="text-xs font-medium text-foreground/80 px-2 py-1 flex items-center gap-1.5">
          <User size={13} className="text-muted-foreground shrink-0" />
          {autor}
        </span>
      );
    }

    if (tipo === "criado_em" || chave === "criado_em" || chave === "criado") {
      let dataObj: Date | undefined;
      const raw = dados.criado_em || dados.criado || valor;
      if (typeof raw === "string" && raw.trim()) {
        const parsed = new Date(raw.includes("T") ? raw : `${raw.trim()}T00:00:00`);
        if (!isNaN(parsed.getTime())) dataObj = parsed;
      }
      if (!dataObj) dataObj = new Date();
      const formatada = format(dataObj, "dd 'de' MMM 'de' yyyy", { locale: ptBR });
      return (
        <span className="text-xs font-medium text-muted-foreground px-2 py-1 flex items-center gap-1.5">
          <Clock size={13} className="shrink-0" />
          {formatada}
        </span>
      );
    }

    if (tipo === "ultima_edicao" || chave === "ultima_edicao" || chave === "atualizado" || chave === "atualizado_em") {
      let dataObj: Date | undefined;
      const raw = dados.atualizado || dados.atualizado_em || dados.ultima_edicao || valor;
      if (typeof raw === "string" && raw.trim()) {
        const parsed = new Date(raw);
        if (!isNaN(parsed.getTime())) dataObj = parsed;
      }
      if (!dataObj) dataObj = new Date();
      const formatada = format(dataObj, "dd 'de' MMM 'de' yyyy, HH:mm", { locale: ptBR });
      return (
        <span className="text-xs font-medium text-muted-foreground px-2 py-1 flex items-center gap-1.5">
          <Clock size={13} className="shrink-0" />
          {formatada}
        </span>
      );
    }

    if (tipo === "checkbox") {
      return (
        <input 
          type="checkbox" 
          checked={!!valor}
          onChange={(e) => atualizar(chave, e.target.checked)}
          className="w-4 h-4 rounded border-border text-primary focus:ring-primary cursor-pointer ml-2"
        />
      );
    }

    if (tipo === "data") {
      let dataObj: Date | undefined;
      if (valor) {
        const d = new Date(valor.includes("T") ? valor : `${valor}T00:00:00`);
        if (!isNaN(d.getTime())) dataObj = d;
      }

      return (
        <Popover open={menuAberto === idPopover} onOpenChange={(open) => setMenuAberto(open ? idPopover : null)}>
          <PopoverTrigger asChild>
            <button className="flex items-center gap-1.5 text-xs text-foreground/80 px-2 py-1 rounded hover:bg-accent transition-colors font-medium">
              <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground" />
              <span>{dataObj ? format(dataObj, "dd 'de' MMM, yyyy", { locale: ptBR }) : <span className="text-muted-foreground font-normal">Vazio</span>}</span>
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start" onInteractOutside={() => setMenuAberto(null)}>
            <Calendar
              mode="single"
              selected={dataObj}
              onSelect={(d) => {
                if (d) {
                  atualizar(chave, format(d, "yyyy-MM-dd"));
                } else {
                  atualizar(chave, undefined);
                }
                setMenuAberto(null);
              }}
              locale={ptBR}
            />
            {dataObj && (
              <div className="p-2 border-t border-border flex justify-end">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-7 text-xs text-destructive hover:bg-destructive/10"
                  onClick={() => {
                    atualizar(chave, undefined);
                    setMenuAberto(null);
                  }}
                >
                  Limpar data
                </Button>
              </div>
            )}
          </PopoverContent>
        </Popover>
      );
    }

    if (tipo === "select" || tipo === "multiselect" || chave === "tags" || chave === "colaboracao") {
      const opcoesCadastradas = obterOpcoesDaPropriedade(
        chave,
        Array.isArray(valor) ? valor : valor ? [valor] : [],
        fixo?.opcoes,
        coresMap,
        pastaRaiz
      );
      const valoresAtuais = Array.isArray(valor) ? valor : valor ? [valor] : [];
      const ehMulti = tipo === "multiselect" || chave === "tags" || chave === "colaboracao" || Array.isArray(valor);

      return (
        <div className="flex flex-wrap items-center gap-1 flex-1 min-w-0">
          {valoresAtuais.map((item) => (
            <div key={item} className="flex items-center">
              {renderizarBadgeTag(item)}
            </div>
          ))}
          <Popover open={menuAberto === idPopover} onOpenChange={(open) => setMenuAberto(open ? idPopover : null)}>
            <PopoverTrigger asChild>
              <button className="h-6 px-1.5 text-xs text-muted-foreground hover:text-foreground rounded hover:bg-accent flex items-center gap-1 transition-colors">
                <Plus size={11} />
                <span>{valoresAtuais.length === 0 ? "Adicionar" : ""}</span>
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-[200px] p-0" align="start" onInteractOutside={() => setMenuAberto(null)}>
              <Command>
                <CommandInput placeholder="Buscar ou criar opção..." />
                <CommandList>
                  <CommandEmpty className="p-2 text-xs text-muted-foreground">
                    Pressione Enter para criar nova opção
                  </CommandEmpty>
                  <CommandGroup>
                    {opcoesCadastradas.map((op) => {
                      const selecionado = valoresAtuais.includes(op);
                      return (
                        <CommandItem
                          key={op}
                          onSelect={() => {
                            if (ehMulti) {
                              if (selecionado) {
                                atualizar(chave, valoresAtuais.filter((x) => x !== op));
                              } else {
                                atualizar(chave, [...valoresAtuais, op]);
                              }
                            } else {
                              atualizar(chave, selecionado ? undefined : op);
                              setMenuAberto(null);
                            }
                          }}
                          className="text-xs flex items-center justify-between cursor-pointer"
                        >
                          <div className="flex items-center gap-1.5 truncate">
                            {renderizarBadgeTag(op)}
                          </div>
                          {selecionado && <Check size={12} className="text-primary shrink-0" />}
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
      );
    }

    if (tipo === "relation" || chave === "relacionamentos" || chave === "relacao") {
      const rels = Array.isArray(valor) ? valor : valor ? [valor] : [];
      return (
        <div className="flex flex-wrap items-center gap-1.5 flex-1 min-w-0">
          {rels.map((r: any) => {
            const tit = typeof r === "string" ? r : r?.titulo || "Item";
            return (
              <button
                key={tit}
                onClick={() => aoClicarItemRel(typeof r === "object" ? r : undefined, tit)}
                className="px-2 py-0.5 rounded text-xs bg-accent hover:bg-accent/80 text-foreground border border-border/60 flex items-center gap-1 transition-colors cursor-pointer truncate max-w-[200px]"
              >
                <LinkIcon size={11} className="text-primary shrink-0" />
                <span className="truncate">{tit}</span>
              </button>
            );
          })}
          <Popover open={menuAberto === idPopover} onOpenChange={(open) => setMenuAberto(open ? idPopover : null)}>
            <PopoverTrigger asChild>
              <button className="h-6 px-1.5 text-xs text-muted-foreground hover:text-foreground rounded hover:bg-accent flex items-center gap-1 transition-colors">
                <Plus size={11} />
                <span>{rels.length === 0 ? "Vincular item" : ""}</span>
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-[240px] p-0" align="start" onInteractOutside={() => setMenuAberto(null)}>
              <Command>
                <CommandInput placeholder="Buscar item para vincular..." />
                <CommandList>
                  <CommandEmpty className="p-2 text-xs text-muted-foreground">Nenhum item encontrado</CommandEmpty>
                  <CommandGroup>
                    {opcoesRelacionamento.map((op) => {
                      const selecionado = rels.includes(op.titulo);
                      return (
                        <CommandItem
                          key={op.caminho}
                          onSelect={() => {
                            if (selecionado) {
                              atualizar(chave, rels.filter((x: string) => x !== op.titulo));
                            } else {
                              atualizar(chave, [...rels, op.titulo]);
                            }
                          }}
                          className="text-xs flex items-center justify-between cursor-pointer"
                        >
                          <span className="truncate">{op.titulo}</span>
                          {selecionado && <Check size={12} className="text-primary shrink-0" />}
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
      );
    }

    if (chave === "caminho" || chave === "pasta") {
      return (
        <Popover open={menuAberto === idPopover} onOpenChange={(open) => setMenuAberto(open ? idPopover : null)}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-left justify-start font-normal text-foreground/80 hover:text-foreground group/pasta"
            >
              <Folder className="h-3.5 w-3.5 text-muted-foreground mr-1.5 shrink-0 group-hover/pasta:text-primary transition-colors" />
              <span className="text-xs truncate">{trilhaAmigavel}</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-3 shadow-xl border-border" align="start" onInteractOutside={() => setMenuAberto(null)}>
            <div className="mb-2 pb-1.5 border-b border-border">
              <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Folder className="h-3.5 w-3.5 text-primary" />
                {caminhoItem ? "Mover para outra pasta" : "Pasta de destino"}
              </span>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Pasta atual: <strong className="text-foreground">{subpastaAtualTexto || "Raiz"}</strong>
              </p>
            </div>

            <div className="flex flex-col gap-0.5 max-h-48 overflow-y-auto">
              {/* Opção Raiz */}
              <button
                onClick={() => {
                  if (aoMoverPasta) aoMoverPasta("");
                  setMenuAberto(null);
                }}
                className={cn(
                  "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-left transition-colors cursor-pointer",
                  !subpastaAtualTexto
                    ? "bg-primary/10 text-primary font-semibold"
                    : "text-foreground hover:bg-accent"
                )}
              >
                <Folder className="h-3.5 w-3.5 shrink-0" />
                <span>Raiz de {nomeAmigavelRaiz}</span>
                {!subpastaAtualTexto && <span className="ml-auto text-[10px] text-primary">Atual</span>}
              </button>

              {/* Pastas Existentes */}
              {pastasDaCategoria.map((p: string) => {
                const ehAtual = subpastaAtualTexto === p;
                return (
                  <button
                    key={p}
                    onClick={() => {
                      if (aoMoverPasta) aoMoverPasta(p);
                      setMenuAberto(null);
                    }}
                    className={cn(
                      "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-left transition-colors cursor-pointer",
                      ehAtual
                        ? "bg-primary/10 text-primary font-semibold"
                        : "text-foreground hover:bg-accent"
                    )}
                  >
                    <Folder className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <span className="truncate">{p}</span>
                    {ehAtual && <span className="ml-auto text-[10px] text-primary">Atual</span>}
                  </button>
                );
              })}
            </div>

            {/* Criar nova subpasta e mover */}
            <div className="pt-2 border-t border-border/60">
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  placeholder="Nova subpasta..."
                  value={novaSubpastaInput}
                  onChange={(e) => setNovaSubpastaInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && novaSubpastaInput.trim()) {
                      const normalizado = novaSubpastaInput.trim().replace(/[^a-zA-Z0-9\s-_/]/g, "").toLowerCase();
                      if (normalizado && aoMoverPasta) {
                        aoMoverPasta(normalizado);
                        setNovaSubpastaInput("");
                        setMenuAberto(null);
                      }
                    }
                  }}
                  className="flex-1 bg-accent/40 border border-border text-xs px-2 py-1 rounded-md outline-none focus:ring-1 focus:ring-primary"
                />
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={!novaSubpastaInput.trim()}
                  onClick={() => {
                    const normalizado = novaSubpastaInput.trim().replace(/[^a-zA-Z0-9\s-_/]/g, "").toLowerCase();
                    if (normalizado && aoMoverPasta) {
                      aoMoverPasta(normalizado);
                      setNovaSubpastaInput("");
                      setMenuAberto(null);
                    }
                  }}
                  className="h-7 text-xs px-2 cursor-pointer"
                >
                  {caminhoItem ? "Mover" : "Definir"}
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      );
    }

    const ehFocoInicial = chave === focoPropriedadeInicial;
    return (
      <input
        type="text"
        id={`prop-input-${chave}`}
        autoFocus={ehFocoInicial}
        value={valor || ""}
        onChange={(e) => atualizar(chave, e.target.value)}
        placeholder="Vazio"
        className={cn(
          "flex-1 bg-transparent border-none outline-none h-7 px-2 text-xs text-foreground/80 placeholder:text-muted-foreground focus:ring-0 transition-all",
          ehFocoInicial && "ring-1 ring-primary/40 rounded bg-primary/5"
        )}
      />
    );
  }

  function renderizarMenuPropriedade(chave: string, fixo?: any, indiceVisivel: number = 0, totalVisiveis: number = 1) {
    const tipoAtual: TipoPropriedade = 
      chave === "status" ? "status" :
      chave === "prioridade" ? "select" :
      chave === "caminho" ? "texto" :
      chave === "criado_por" ? "criado_por" :
      chave === "criado_em" || chave === "criado" ? "criado_em" :
      chave === "ultima_edicao" || chave === "atualizado" || chave === "atualizado_em" ? "ultima_edicao" :
      chave === "aviso_inbox" || chave === "aviso_telegram" || chave === "aviso_email" ? "checkbox" :
      chave === "data" || chave === "prazo" ? "data" :
      chave === "tags" || chave === "tag" ? "multiselect" :
      chave === "paleta" || chave === "palette" || chave === "cores" ? "multiselect" :
      chave === "relacionamentos" || chave === "relacao" ? "relation" :
      chave === "pai_id" || chave === "paiId" || chave === "pai" || chave === "contato_pai" ? "select" :
      (fixo?.tipo as TipoPropriedade) || esquema[chave] || "texto";

    const visDefault = ["criado_por", "criado_em", "criado", "ultima_edicao", "atualizado", "atualizado_em", "caminho"].includes(chave) ? "esconder" : "sempre";
    const visAtual = visibilidadeMap[chave] || visDefault;
    const rotuloAtual = nomeExibido(chave);
    const idMenu = `prop-${chave}`;
    const opcoesCadastradas = obterOpcoesDaPropriedade(
      chave,
      Array.isArray(dados[chave]) ? dados[chave] : dados[chave] ? [dados[chave]] : [],
      fixo?.opcoes,
      coresMap
    );
    const iconePersonalizado = iconesMap[chave];
    const corIconePersonalizada = coresIconesMap[chave] || "padrao";
    const descricaoAtual = descricoesMap[chave] || "";
    const IconeComponente =
      (iconePersonalizado && ICONES_MAPA[iconePersonalizado]) ||
      (fixo?.icone ? () => <>{fixo.icone}</> : ICONES_MAPA.Type);
    const corIconeObj = CORES_ICONE.find((c) => c.id === corIconePersonalizada) || CORES_ICONE[0];

    return (
      <MenuConfiguracaoPropriedade
        chave={chave}
        nomeAtual={rotuloAtual}
        tipoAtual={tipoAtual}
        visibilidadeAtual={visAtual}
        descricaoAtual={descricaoAtual}
        iconePersonalizado={iconePersonalizado}
        corIconePersonalizada={corIconePersonalizada}
        ehFixo={Boolean(fixo)}
        podeMoverCima={indiceVisivel > 0}
        podeMoverBaixo={indiceVisivel < totalVisiveis - 1}
        opcoesCadastradas={opcoesCadastradas}
        coresTagsMap={coresMap}
        aberto={menuAberto === idMenu}
        aoMudarAberto={(aberto) => setMenuAberto(aberto ? idMenu : null)}
        aoRenomear={(novoNome) => renomear(chave, novoNome)}
        aoMudarTipo={(novoTipo) => atualizarEsquema(chave, novoTipo)}
        aoMudarVisibilidade={(novaVis) => atualizarVisibilidade(chave, novaVis)}
        aoMudarDescricao={(novaDesc) => atualizarDescricaoPropriedade(chave, novaDesc)}
        aoMudarIcone={(novoIcone) => atualizarIconePropriedade(chave, novoIcone)}
        aoMudarCorIcone={(novaCor) => atualizarCorIconePropriedade(chave, novaCor)}
        aoMover={(direcao) => moverPropriedade(chave, direcao)}
        aoDuplicar={() => duplicarPropriedade(chave)}
        aoExcluir={() => remover(chave)}
        aoAtualizarOpcoes={(novas) => salvarOpcoesPropriedadeLocal(chave, novas)}
        aoAtualizarCorTag={(tag, cor) => atualizarCorTag(tag, cor)}
        aoRenomearTag={(antiga, nova) => {
          const novas = opcoesCadastradas.map((x) => (x === antiga ? nova : x));
          salvarOpcoesPropriedadeLocal(chave, novas);
          if (chave === "tags") {
            const novasCores = { ...globalConfig.coresTags };
            const cAntiga = novasCores[antiga] || "azul";
            delete novasCores[antiga];
            novasCores[nova] = cAntiga;
            salvarConfigPropriedadesGlobais(undefined, novasCores);
            setGlobalConfig(lerConfigPropriedadesGlobais());
          }
        }}
        aoExcluirTag={(tag) => {
          registrarOpcaoExcluida(chave, tag);
          const novas = opcoesCadastradas.filter((x) => x !== tag);
          salvarOpcoesPropriedadeLocal(chave, novas);
          if (chave === "tags") {
            const novasCores = { ...globalConfig.coresTags };
            delete novasCores[tag];
            salvarConfigPropriedadesGlobais(undefined, novasCores);
            setGlobalConfig(lerConfigPropriedadesGlobais());
          }
          const valItem = dados[chave];
          if (Array.isArray(valItem) && valItem.includes(tag)) {
            atualizar(chave, valItem.filter((x) => x !== tag));
          } else if (valItem === tag) {
            atualizar(chave, undefined);
          }
          toast(`Opção "${tag}" excluída.`);
        }}
        dadosPomodoro={{
          estimados: dados.pomodoros_estimados ?? dados.Pomodoro ?? dados.pomodoro,
          realizados: dados.pomodoros_realizados ?? dados.fraturados,
        }}
        aoAtualizarPomodoro={(p) => {
          onChange({
            ...dados,
            pomodoros_estimados: p.estimados,
            Pomodoro: p.estimados,
            pomodoro: p.estimados,
            pomodoros_realizados: p.realizados,
            fraturados: p.realizados,
          });
        }}
      >
        <button className="w-28 sm:w-36 shrink-0 flex items-center gap-1.5 sm:gap-2 text-muted-foreground px-1.5 sm:px-2 py-1 -ml-1 sm:-ml-2 rounded hover:bg-accent/60 transition-colors text-left group/prop cursor-pointer">
          <IconeComponente className={cn("h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0 transition-colors", corIconeObj.classe)} />
          <span className="truncate flex-1 font-medium text-xs text-foreground/90">{rotuloAtual}</span>
        </button>
      </MenuConfiguracaoPropriedade>
    );
  }

  return (
    <div className="flex flex-col gap-1.5 w-full">
      {Boolean(dados.ia_sugeriu) && (
        <div className="mb-2 p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/25 flex items-center justify-between gap-2 text-xs text-purple-700 dark:text-purple-300">
          <div className="flex items-center gap-1.5 min-w-0">
            <Sparkles size={14} className="shrink-0 text-purple-600 dark:text-purple-400" />
            <span className="truncate">Sugerido por IA. Confira as informações deste item.</span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {aoRemover && (
              <button
                type="button"
                onClick={aoRemover}
                className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 font-medium text-[11px] shrink-0 cursor-pointer transition-colors"
              >
                Reprovar e excluir
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                const novos = { ...dados };
                delete novos.ia_sugeriu;
                onChange(novos);
                toast("Sugestão da IA aprovada!");
              }}
              className="px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-medium text-[11px] shrink-0 cursor-pointer shadow-sm transition-colors"
            >
              Aprovar sugestão
            </button>
          </div>
        </div>
      )}

      {chavesVisiveis.map((chave, idx) => {
        const fixo = camposFixos[chave];
        const descricao = descricoesMap[chave];
        return (
          <div key={chave} className="flex min-h-8 items-center gap-1.5 sm:gap-3 text-xs group relative">
            <div className="opacity-0 group-hover:opacity-40 transition-opacity cursor-grab text-muted-foreground -ml-4 pl-1 hidden sm:flex items-center">
              <GripVertical size={12} />
            </div>
            {renderizarMenuPropriedade(chave, fixo, idx, chavesVisiveis.length)}
            {descricao && (
              <span title={descricao} className="text-muted-foreground/60 hover:text-foreground cursor-help -ml-1">
                <HelpCircle size={11} />
              </span>
            )}
            <div className="flex-1 flex items-center min-h-8 min-w-0">
              {renderizarValor(chave)}
            </div>
          </div>
        );
      })}

      <div className="flex items-center gap-2 sm:gap-4 text-xs mt-1 pt-1 border-t border-border/30">
        <div className="w-28 sm:w-36 shrink-0">
          <Popover open={menuAberto === "novo_campo"} onOpenChange={(open) => setMenuAberto(open ? "novo_campo" : null)}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-1.5 sm:px-2 -ml-1 sm:-ml-2 text-muted-foreground hover:text-foreground font-normal text-xs flex items-center gap-1.5 rounded-md hover:bg-accent/60 w-full justify-start"
              >
                <Plus className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">Adicionar</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[280px] p-3 shadow-2xl border-border space-y-3" align="start" onInteractOutside={() => setMenuAberto(null)}>
              <div>
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                  Nome da Propriedade (Opcional)
                </span>
                <input
                  type="text"
                  autoFocus
                  placeholder={`Padrão: "${NOMES_PADRAO_TIPO[tipoNovoCampo]}"...`}
                  value={nomeNovoCampo}
                  onChange={(e) => setNomeNovoCampo(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      criarNovaPropriedade(tipoNovoCampo);
                    }
                  }}
                  className="w-full bg-accent/40 border border-border text-xs px-2.5 py-1.5 rounded-md outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="border-t border-border pt-2">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                  Selecione o Tipo
                </span>
                <div className="flex flex-col gap-0.5 max-h-56 overflow-y-auto pr-1">
                  {(Object.entries(ICONES_TIPO) as [TipoPropriedade, React.ElementType][]).map(([t, Icon]) => (
                    <button
                      key={t}
                      onClick={() => {
                        setTipoNovoCampo(t);
                        criarNovaPropriedade(t);
                      }}
                      className={cn(
                        "w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs text-left transition-colors hover:bg-accent cursor-pointer",
                        tipoNovoCampo === t ? "bg-accent font-semibold text-foreground" : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <Icon className="h-4 w-4 opacity-75 shrink-0" />
                      <span>{NOMES_TIPO[t]}</span>
                    </button>
                  ))}
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
        <div className="flex-1"></div>
      </div>

      {chavesOcultas.length > 0 && (
        <div className="mt-1 border-t border-border/40 pt-1">
          <button
            onClick={() => setMostrandoOcultas(!mostrandoOcultas)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-1 py-0.5 font-medium cursor-pointer"
          >
            {mostrandoOcultas ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
            <span>{chavesOcultas.length} propriedade{chavesOcultas.length > 1 ? "s" : ""} oculta{chavesOcultas.length > 1 ? "s" : ""}</span>
          </button>

          {mostrandoOcultas && (
            <div className="flex flex-col gap-1.5 mt-1.5 pl-2 border-l border-border/60">
              {chavesOcultas.map((chave, idx) => {
                const fixo = camposFixos[chave];
                const descricao = descricoesMap[chave];
                return (
                  <div key={chave} className="flex min-h-8 items-center gap-1.5 sm:gap-3 text-xs group opacity-75 hover:opacity-100 relative">
                    <div className="opacity-0 group-hover:opacity-40 transition-opacity cursor-grab text-muted-foreground -ml-4 pl-1 hidden sm:flex items-center">
                      <GripVertical size={12} />
                    </div>
                    {renderizarMenuPropriedade(chave, fixo, idx, chavesOcultas.length)}
                    {descricao && (
                      <span title={descricao} className="text-muted-foreground/60 hover:text-foreground cursor-help -ml-1">
                        <HelpCircle size={11} />
                      </span>
                    )}
                    <div className="flex-1 flex items-center min-h-8 min-w-0">
                      {renderizarValor(chave)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <ModalEditarContatoRapido
        aberto={modalContatoAberto}
        aoFechar={() => {
          setModalContatoAberto(false);
          setContatoParaEditar(null);
        }}
        contatoInicial={contatoParaEditar}
        aoSalvarSucesso={(contatoSalvo) => {
          atualizar(chaveAtivaContato, contatoSalvo.titulo);
        }}
      />
    </div>
  );
}
