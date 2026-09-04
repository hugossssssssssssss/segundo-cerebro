import React, { useState, useEffect, useMemo } from "react";
import { 
  Type, 
  Hash, 
  Calendar as CalendarIcon, 
  CheckSquare, 
  ListTodo, 
  Tags,
  Plus,
  Trash2,
  EyeOff,
  Eye,
  ChevronDown,
  ChevronRight,
  User,
  Clock,
  X,
  Folder,
  Inbox as InboxIcon,
  Send as SendIcon,
  Mail as MailIcon,
  SlidersHorizontal,
  Sparkles,
  Check,
  Layout,
  Target,
  Bookmark,
  Users,
  FileText,
  Palette,
  Pencil,
  Search,
  Building,
  Briefcase,
  UserPlus,
  Flag,
  Timer,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip } from "@/components/ui/tooltip";
import { Modal, Botao } from "@/components/ui";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Link as LinkIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { extrairMencoesTexto } from "@/lib/links";
import { lerConfig, nomeExibido as nomeDoUsuario } from "@/lib/settings";
import { cache, invalidarCache } from "@/lib/repo";
import { gravar } from "@/lib/github";
import { PASTAS, type Contato } from "@/lib/tipos";
import { comoContato, contatoParaArquivo } from "@/lib/entidades";
import { nomeLivre, escreverMarkdown, tituloProvavel, nomeDeArquivo } from "@/lib/markdown";
import { idDoCaminho } from "@/lib/pdi";
import { dispararAtualizacaoAcervo } from "@/lib/eventos";
import { toast } from "@/lib/toast";

export function obterOpcoesDaPropriedade(
  chave: string,
  dadosValorAtual: string[] | string | undefined,
  fixoOpcoes?: string[],
  coresTagsGlobais: Record<string, string> = {}
): string[] {
  const setOpcoes = new Set<string>();

  // 1. Opções fixas passadas na configuração da propriedade
  if (Array.isArray(fixoOpcoes)) {
    fixoOpcoes.forEach(o => { if (typeof o === "string" && o.trim()) setOpcoes.add(o.trim()); });
  }

  // 2. Opções salvas localmente específicas para esta chave
  try {
    const rawLocal = localStorage.getItem(`klaus_opcoes_prop_${chave}`);
    if (rawLocal) {
      const arr = JSON.parse(rawLocal);
      if (Array.isArray(arr)) {
        arr.forEach(o => { if (typeof o === "string" && o.trim()) setOpcoes.add(o.trim()); });
      }
    }
  } catch {}

  // 3. Valor atual deste item
  if (Array.isArray(dadosValorAtual)) {
    dadosValorAtual.forEach(t => { if (typeof t === "string" && t.trim()) setOpcoes.add(t.trim()); });
  } else if (typeof dadosValorAtual === "string" && dadosValorAtual.trim()) {
    setOpcoes.add(dadosValorAtual.trim());
  }

  // 4. Valores em uso no repositório para ESTA chave específica
  if (cache && cache.itens) {
    cache.itens.forEach(item => {
      const val = item.doc?.dados?.[chave];
      if (Array.isArray(val)) {
        val.forEach(t => { if (typeof t === "string" && t.trim()) setOpcoes.add(t.trim()); });
      } else if (typeof val === "string" && val.trim()) {
        setOpcoes.add(val.trim());
      }
    });
  }

  // 5. Se for a chave "tags", incluir as tags do mapa global de cores
  if (chave === "tags") {
    Object.keys(coresTagsGlobais).forEach(t => {
      if (typeof t === "string" && t.trim()) setOpcoes.add(t.trim());
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

export function lerConfigPropriedadesGlobais(): { rotulos: Record<string, string>; coresTags: Record<string, string> } {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (!raw) return { rotulos: {}, coresTags: {} };
    const parsed = JSON.parse(raw);
    return {
      rotulos: parsed?.rotulos || {},
      coresTags: parsed?.coresTags || {},
    };
  } catch {
    return { rotulos: {}, coresTags: {} };
  }
}

export function salvarConfigPropriedadesGlobais(novosRotulos?: Record<string, string>, novasCores?: Record<string, string>) {
  try {
    const atual = lerConfigPropriedadesGlobais();
    const proximo = {
      rotulos: { ...atual.rotulos, ...novosRotulos },
      coresTags: { ...atual.coresTags, ...novasCores },
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

const CORES_AVATAR = [
  "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30",
  "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
  "bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30",
  "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
  "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30",
  "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30",
  "bg-teal-500/15 text-teal-600 dark:text-teal-400 border-teal-500/30",
];

export function corDoAvatar(nome: string): string {
  let hash = 0;
  for (let i = 0; i < (nome || "").length; i++) {
    hash = (hash << 5) - hash + nome.charCodeAt(i);
    hash |= 0;
  }
  return CORES_AVATAR[Math.abs(hash) % CORES_AVATAR.length];
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
};

export function PropriedadesNotion({ 
  dados, 
  onChange, 
  corpoTexto = "",
  camposFixos = {}, 
  opcoesRelacionamento = [],
  caminhoItem,
  rotuloTipo,
  focoPropriedadeInicial,
  aoMoverPasta,
}: PropriedadesNotionProps) {
  // Controle estrito de um ÚNICO menu aberto por vez
  const [menuAberto, setMenuAberto] = useState<string | null>(null);

  const [nomeNovoCampo, setNomeNovoCampo] = useState("");
  const [tipoNovoCampo, setTipoNovoCampo] = useState<TipoPropriedade>("texto");
  const [novaSubpastaInput, setNovaSubpastaInput] = useState("");

  const [renomearPara, setRenomearPara] = useState("");
  const [copiado, setCopiado] = useState<string | null>(null);
  const [mostrandoOcultas, setMostrandoOcultas] = useState(false);
  const [buscaTag, setBuscaTag] = useState("");
  const [editandoTag, setEditandoTag] = useState<string | null>(null);
  const [novoNomeTag, setNovoNomeTag] = useState("");

  const [buscaContato, setBuscaContato] = useState("");
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
        const el = document.getElementById(`prop-input-${focoPropriedadeInicial}`) ||
                   document.getElementById(`prop-btn-${focoPropriedadeInicial}`);
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

  // Garante o fechamento imediato de qualquer menu de propriedade aberto ao clicar fora em qualquer lugar da tela
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

  const ehLembrete = rotuloTipo?.toLowerCase().includes("lembrete") || dados.tipo === "lembrete";
  const chavesLembrete = ["horario", "hora", "aviso_inbox", "notificacao_inbox", "aviso_telegram", "notificacao_telegram", "aviso_email", "notificacao_email"];
  const chavesExclusivasTarefa = ["caminho", "pasta", "status", "prioridade", "pomodoro", "pomodoros", "pomodoros_estimados", "pomodoro_estimado", "pomodoros_realizados", "pomodoro_realizado", "pomodoro_fraturado", "PomodoroFraturado", "fraturados", "estimativa", "c", "indicador", "metas"];

  const todasAsChaves = Array.from(new Set([...Object.keys(camposFixos), ...Object.keys(dados)]))
    .filter(k => {
      if ([
        "titulo", "tipo", "atualizado", "atualizado_em", "criado", "autor", "criado_em", "criado_por", "ultima_edicao", "id", "esquema", "_visibilidade", "_coresTags", "_rotulos", "c", "pomodoro", "pomodoros", "pomodoros_estimados", "pomodoro_estimado", "pomodoros_realizados", "pomodoro_realizado", "pomodoro_fraturado", "PomodoroFraturado", "fraturados", "estimativa", "porque", "anotacoes"
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
    if (chave === "impacto") return "Impacto / Resultado";
    if (chave === "elogio") return "Elogio / Feedback";
    if (chave === "autor_elogio" || chave === "autorElogio") return "Autor do Elogio";
    if (chave === "colaboracao" || chave === "equipe") return "Colaboração & Equipe";
    
    // Fallback limpo: transforma snake_case em Title Case
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

  function remover(chave: string) {
    if (camposFixos[chave]) return;
    const novos: Record<string, any> = { ...dados };
    delete novos[chave];
    if (novos.esquema) delete (novos.esquema as any)[chave];
    if (novos._visibilidade) delete (novos._visibilidade as any)[chave];
    if (novos._rotulos) delete (novos._rotulos as any)[chave];
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

  // Separa propriedades visíveis das ocultas
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
      chave === "relacionamentos" || chave === "relacao" ? "relation" :
      chave === "criado_por" ? "criado_por" :
      chave === "criado_em" || chave === "criado" ? "criado_em" :
      chave === "ultima_edicao" || chave === "atualizado" || chave === "atualizado_em" ? "ultima_edicao" :
      chave === "aviso_inbox" || chave === "aviso_telegram" || chave === "aviso_email" ? "checkbox" :
      chave === "data" || chave === "prazo" ? "data" :
      fixo?.tipo || esquema[chave] || (Array.isArray(valor) ? "multiselect" : typeof valor === "boolean" ? "checkbox" : "texto");
    const idPopover = `val-${chave}`;

    if (tipo === "status" || chave === "status") {
      return renderizarBadgeStatus(valor || "a-fazer");
    }

    if (chave === "prioridade") {
      return renderizarBadgePrioridade(valor);
    }

    if (tipo === "criado_por" || chave === "criado_por") {
      // O valor gravado no frontmatter manda, quando existe: um item pode ter
      // vindo de outra pessoa num repositório compartilhado. Só na ausência
      // dele é que assumimos que foi quem está com o app aberto.
      const autor =
        (typeof valor === "string" && valor.trim()) || nomeDoUsuario(lerConfig());
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

    if (tipo === "numero") {
      if (chave === "estimativa" || chave === "Pomodoro" || chave === "pomodoro") {
        const val = typeof valor === "number" ? Math.min(Math.max(0, valor), 5) : 0;
        return (
          <div className="flex items-center gap-1.5 ml-2 py-1 select-none">
            {Array.from({ length: 5 }).map((_, idx) => {
              const ativo = idx < val;
              return (
                <Tooltip key={idx} conteudo={`Definir esforço como ${idx + 1} ${idx + 1 === 1 ? "prisma" : "prismas"}`}>
                  <button
                    type="button"
                    onClick={() => {
                      const novoVal = idx + 1;
                      atualizar(chave, val === novoVal ? undefined : novoVal);
                    }}
                    className="focus:outline-none cursor-pointer transform active:scale-95 transition-transform"
                    aria-label={`Definir esforço como ${idx + 1}`}
                  >
                    <svg
                      width={16}
                      height={16}
                      viewBox="0 0 20 20"
                      className={ativo ? "drop-shadow-[0_0_4px_rgba(99,102,241,0.4)]" : ""}
                    >
                      <polygon
                        points="10,2 17,6 17,14 10,18 3,14 3,6"
                        className={cn(
                          "stroke-[1.5] stroke-linejoin-round transition-all duration-200",
                          ativo 
                            ? "fill-indigo-500/80 stroke-indigo-400" 
                            : "fill-muted/20 stroke-muted-foreground/30 hover:stroke-muted-foreground/50"
                        )}
                      />
                    </svg>
                  </button>
                </Tooltip>
              );
            })}
            {val > 0 && (
              <span className="text-[10px] text-muted-foreground ml-2 font-medium select-none">
                {val} {val === 1 ? "prisma" : "prismas"}
              </span>
            )}
          </div>
        );
      }
      return (
        <input
          type="number"
          value={valor ?? ""}
          onChange={(e) =>
            atualizar(
              chave,
              e.target.value === "" ? undefined : Number(e.target.value),
            )
          }
          placeholder="Vazio"
          className="flex-1 bg-transparent border-none outline-none h-7 px-2 text-xs text-foreground/80 placeholder:text-muted-foreground focus:ring-0"
        />
      );
    }

    if (chave === "autor_elogio" || chave === "autorElogio" || (tipo as string) === "contato") {
      const contatoAtual = contatosDisponiveis.find(
        (c) => c.titulo.toLowerCase().trim() === (valor || "").toLowerCase().trim()
      );
      const contatosFiltrados = contatosDisponiveis.filter((c) =>
        c.titulo.toLowerCase().includes(buscaContato.toLowerCase()) ||
        (c.cargo && c.cargo.toLowerCase().includes(buscaContato.toLowerCase())) ||
        (c.empresa && c.empresa.toLowerCase().includes(buscaContato.toLowerCase()))
      );
      const existeContatoExato = contatosDisponiveis.some(
        (c) => c.titulo.toLowerCase().trim() === buscaContato.toLowerCase().trim()
      );

      return (
        <div className="flex items-center gap-1.5 flex-wrap py-1 min-h-7">
          {valor ? (
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-card border border-border/80 shadow-2xs hover:border-primary/40 transition-colors group">
              <div
                className={cn(
                  "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border shrink-0",
                  corDoAvatar(valor)
                )}
              >
                {obterIniciais(valor)}
              </div>
              <div
                className="flex flex-col min-w-0 cursor-pointer"
                onClick={() => setMenuAberto(idPopover)}
              >
                <span className="text-xs font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                  {valor}
                </span>
                {(contatoAtual?.cargo || contatoAtual?.empresa) && (
                  <span className="text-[10px] text-muted-foreground truncate leading-tight">
                    {[contatoAtual.cargo, contatoAtual.empresa].filter(Boolean).join(" • ")}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-0.5 ml-1">
                <Tooltip conteudo="Editar dados deste contato">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setContatoParaEditar(contatoAtual || { titulo: valor, caminho: "", sha: "" });
                      setChaveAtivaContato(chave);
                      setModalContatoAberto(true);
                    }}
                    className="p-1 text-muted-foreground hover:text-foreground rounded hover:bg-accent transition-colors cursor-pointer"
                  >
                    <Pencil size={11} />
                  </button>
                </Tooltip>
                <Tooltip conteudo="Remover autor">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      atualizar(chave, "");
                    }}
                    className="p-1 text-muted-foreground hover:text-destructive rounded hover:bg-accent transition-colors cursor-pointer"
                  >
                    <X size={11} />
                  </button>
                </Tooltip>
              </div>
            </div>
          ) : null}

          <Popover
            open={menuAberto === idPopover}
            onOpenChange={(open) => {
              setMenuAberto(open ? idPopover : null);
              if (!open) setBuscaContato("");
            }}
          >
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                id={`prop-btn-${chave}`}
                className={cn(
                  "h-7 px-2 text-xs font-normal text-muted-foreground hover:text-foreground flex items-center gap-1.5 border border-dashed border-border/80 rounded-lg",
                  valor && "h-6 px-1.5 text-[11px] border-none hover:bg-accent"
                )}
              >
                {!valor && <User size={13} className="text-blue-500" />}
                <span>{valor ? "Trocar autor" : "+ Selecionar ou criar autor"}</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className="w-[300px] sm:w-[340px] p-2.5 shadow-2xl border-border flex flex-col gap-2 rounded-xl"
              align="start"
              onInteractOutside={() => setMenuAberto(null)}
            >
              {/* Barra de busca de contato */}
              <div className="relative">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/70" />
                <input
                  type="text"
                  placeholder="Buscar contato..."
                  value={buscaContato}
                  onChange={(e) => setBuscaContato(e.target.value)}
                  autoFocus
                  className="w-full bg-accent/40 border border-border text-xs pl-8 pr-2.5 py-1.5 rounded-lg outline-none focus:ring-1 focus:ring-primary/50 text-foreground"
                />
              </div>

              {/* Lista de contatos existentes */}
              <div className="max-h-56 overflow-y-auto space-y-0.5 pr-0.5">
                {contatosFiltrados.map((c) => {
                  const selecionado = (valor || "").toLowerCase().trim() === c.titulo.toLowerCase().trim();
                  return (
                    <div
                      key={c.caminho || c.id || c.titulo}
                      onClick={() => {
                        atualizar(chave, c.titulo);
                        setMenuAberto(null);
                      }}
                      className={cn(
                        "w-full flex items-center justify-between gap-2 p-1.5 rounded-lg text-left transition-colors cursor-pointer group",
                        selecionado ? "bg-primary/10 text-primary font-medium" : "hover:bg-accent text-foreground"
                      )}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <div
                          className={cn(
                            "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border shrink-0",
                            corDoAvatar(c.titulo)
                          )}
                        >
                          {obterIniciais(c.titulo)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium truncate">{c.titulo}</p>
                          {(c.cargo || c.empresa) && (
                            <p className="text-[10px] text-muted-foreground truncate leading-tight">
                              {[c.cargo, c.empresa].filter(Boolean).join(" • ")}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {selecionado && <Check size={13} className="text-primary" />}
                        <Tooltip conteudo="Editar dados deste contato">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setMenuAberto(null);
                              setContatoParaEditar(c);
                              setChaveAtivaContato(chave);
                              setModalContatoAberto(true);
                            }}
                            className="p-1 text-muted-foreground opacity-40 group-hover:opacity-100 hover:text-foreground rounded hover:bg-muted transition-all cursor-pointer"
                          >
                            <Pencil size={11} />
                          </button>
                        </Tooltip>
                      </div>
                    </div>
                  );
                })}

                {contatosFiltrados.length === 0 && !buscaContato.trim() && (
                  <div className="py-4 text-center text-xs text-muted-foreground">
                    Nenhum contato cadastrado ainda.
                  </div>
                )}
              </div>

              {/* Ações de criação rápida */}
              <div className="pt-1.5 border-t border-border/50 flex flex-col gap-1">
                {buscaContato.trim() && !existeContatoExato && (
                  <button
                    type="button"
                    onClick={() => {
                      setMenuAberto(null);
                      setContatoParaEditar({ titulo: buscaContato.trim() });
                      setChaveAtivaContato(chave);
                      setModalContatoAberto(true);
                    }}
                    className="w-full text-left px-2.5 py-1.5 text-xs text-primary hover:bg-primary/10 rounded-lg flex items-center gap-2 font-medium cursor-pointer transition-colors"
                  >
                    <Plus size={13} />
                    <span className="truncate">Criar contato "{buscaContato.trim()}"</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setMenuAberto(null);
                    setContatoParaEditar(null);
                    setChaveAtivaContato(chave);
                    setModalContatoAberto(true);
                  }}
                  className="w-full text-left px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg flex items-center gap-2 cursor-pointer transition-colors font-medium"
                >
                  <UserPlus size={13} className="text-primary" />
                  <span>+ Criar novo contato completo</span>
                </button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      );
    }

    if (tipo === "select") {
      const opcoes = fixo?.opcoes || (valor ? [valor] : []);
      return (
        <Popover open={menuAberto === idPopover} onOpenChange={(open) => setMenuAberto(open ? idPopover : null)}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 px-2 text-left justify-start font-normal text-foreground/80 hover:text-foreground">
              {valor ? renderizarBadgeTag(valor) : <span className="text-muted-foreground text-xs">Vazio</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[240px] p-2 shadow-xl border-border" align="start" onInteractOutside={() => setMenuAberto(null)}>
            <Command>
              <CommandInput placeholder="Buscar ou criar opção..." onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                if (e.key === "Enter") {
                  atualizar(chave, e.currentTarget.value.trim());
                  setMenuAberto(null);
                }
              }} />
              <CommandList className="max-h-52">
                <CommandEmpty>Digite e aperte Enter para selecionar.</CommandEmpty>
                <CommandGroup>
                  {opcoes.map((opcao: string) => (
                    <CommandItem key={opcao} onSelect={() => {
                      atualizar(chave, opcao);
                      setMenuAberto(null);
                    }}>
                      {renderizarBadgeTag(opcao)}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      );
    }

    if (tipo === "data") {
      let inicioStr = typeof valor === "string" ? valor.split("→")[0]?.trim() : valor?.inicio || "";
      let fimStr = typeof valor === "string" && valor.includes("→") ? valor.split("→")[1]?.trim() : valor?.fim || "";

      if (!fimStr && dados.endDate && typeof dados.endDate === "string") {
        fimStr = dados.endDate.trim();
      }

      const parseData = (str: string) => {
        if (!str) return undefined;
        const d = new Date(`${str}T00:00:00`);
        return isNaN(d.getTime()) ? undefined : d;
      };

      const inicioObj = parseData(inicioStr);
      const fimObj = parseData(fimStr);

      const textoFormatado = inicioObj
        ? fimObj
          ? `${format(inicioObj, "dd 'de' MMM", { locale: ptBR })} → ${format(fimObj, "dd 'de' MMM 'de' yyyy", { locale: ptBR })}`
          : format(inicioObj, "dd 'de' MMM 'de' yyyy", { locale: ptBR })
        : null;

      const temRange = !!(inicioObj && fimObj);

      const aoClicarDia = (d: Date | undefined) => {
        if (!d) return;
        const dataClicada = format(d, "yyyy-MM-dd");

        if (!inicioStr || (inicioStr && fimStr)) {
          atualizar(chave, dataClicada);
          if (dados.endDate) {
            const novos = { ...dados, [chave]: dataClicada };
            delete novos.endDate;
            onChange(novos);
          }
          return;
        }

        if (inicioStr && !fimStr) {
          if (dataClicada === inicioStr) {
            return;
          }
          const [menor, maior] = [inicioStr, dataClicada].sort();
          atualizar(chave, `${menor} → ${maior}`);
        }
      };

      return (
        <Popover open={menuAberto === idPopover} onOpenChange={(open) => setMenuAberto(open ? idPopover : null)}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 px-2 text-left justify-start font-normal text-foreground/80 hover:text-foreground">
              {textoFormatado ? (
                <span className="font-medium text-foreground text-xs">{textoFormatado}</span>
              ) : (
                <span className="text-muted-foreground text-xs">Vazio</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-3 shadow-xl border-border" align="start" onInteractOutside={() => setMenuAberto(null)}>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
                <span>{temRange ? "Intervalo selecionado" : inicioStr ? "Data selecionada" : "Definir data"}</span>
                {(inicioStr || fimStr) && (
                  <button 
                    onClick={() => {
                      atualizar(chave, undefined);
                      if (dados.endDate) {
                        const novos = { ...dados };
                        delete novos[chave];
                        delete novos.endDate;
                        onChange(novos);
                      }
                    }} 
                    className="text-destructive hover:underline text-[11px] cursor-pointer"
                  >
                    Limpar data
                  </button>
                )}
              </div>

              <p className="text-[10px] text-muted-foreground/70 leading-relaxed">
                {temRange
                  ? "Clique em uma nova data para reiniciar."
                  : inicioStr
                    ? "Clique em outra data para formar um intervalo (range)."
                    : "1º clique define a data. 2º clique cria o intervalo."}
              </p>

              <Calendar
                mode="range"
                selected={{
                  from: inicioObj,
                  to: fimObj || undefined,
                }}
                onDayClick={aoClicarDia}
                className="w-full"
                locale={ptBR}
                autoFocus
              />
            </div>
          </PopoverContent>
        </Popover>
      );
    }

    if (tipo === "multiselect" || chave === "paleta" || chave === "tags") {
      const tags = Array.isArray(valor) ? valor : valor ? [valor] : [];
      const ehPaleta = chave === "paleta" || tags.every((t: string) => /^#[0-9a-fA-F]{6}$/.test(t));
      
      if (ehPaleta && tags.length > 0) {
        return (
          <div className="flex items-center gap-1.5 flex-wrap py-1">
            {tags.map((hex: string) => {
              const ehCopiado = copiado === hex;
              return (
                <Tooltip key={hex} conteudo={`Clique para copiar ${hex}`}>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(hex);
                      setCopiado(hex);
                      setTimeout(() => setCopiado(null), 1500);
                    }}
                    className="group flex items-center gap-1 px-2.5 py-1 rounded-full border text-xs font-mono transition-all active:scale-95 hover:opacity-90 cursor-pointer"
                    style={{ backgroundColor: hex, color: parseInt(hex.replace('#',''), 16) > 0xffffff/2 ? '#000' : '#fff' }}
                    aria-label={`Copiar cor ${hex}`}
                  >
                    <span>{ehCopiado ? "Copiado!" : hex}</span>
                  </button>
                </Tooltip>
              );
            })}
          </div>
        );
      }

      const tagsDisponiveis = obterOpcoesDaPropriedade(chave, tags, fixo?.opcoes, coresMap);
      const tagsFiltradas = tagsDisponiveis.filter(t => t.toLowerCase().includes(buscaTag.toLowerCase()));
      const existeExata = tagsDisponiveis.some(t => t.toLowerCase() === buscaTag.toLowerCase().trim());

      const processarCriarTag = (nomeNovaTag: string) => {
        const nomeLimpo = nomeNovaTag.trim().replace(/^@+/, "");
        if (!nomeLimpo) return;
        const novasTags = Array.from(new Set([...tags, nomeLimpo]));
        atualizar(chave, novasTags);
        
        // Salva na lista de opções específicas desta chave
        const todasOpcoesChave = Array.from(new Set([...tagsDisponiveis, nomeLimpo]));
        salvarOpcoesPropriedadeLocal(chave, todasOpcoesChave);

        if (chave === "tags" && !coresMap[nomeLimpo]) {
          atualizarCorTag(nomeLimpo, "azul");
        }
        setBuscaTag("");
      };

      return (
        <div className="flex items-center gap-1.5 flex-wrap py-1 min-h-7">
          {tags.map((t: string) => (
            <div key={t} className="group relative flex items-center">
              {renderizarBadgeTag(t)}
              <Tooltip conteudo="Remover deste item">
                <button
                  onClick={() => atualizar(chave, tags.filter((x: string) => x !== t))}
                  className="ml-0.5 text-muted-foreground hover:text-destructive opacity-50 hover:opacity-100 transition-all cursor-pointer"
                  aria-label="Remover deste item"
                >
                  <X size={11} />
                </button>
              </Tooltip>
            </div>
          ))}

          <Popover open={menuAberto === idPopover} onOpenChange={(open) => {
            setMenuAberto(open ? idPopover : null);
            if (!open) {
              setBuscaTag("");
            }
          }}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                id={`prop-btn-${chave}`}
                className="h-6 px-1.5 text-[11px] font-normal text-muted-foreground hover:text-foreground flex items-center gap-1 border border-dashed border-border/80 rounded"
              >
                <Plus size={11} />
                <span>{nomeExibido(chave)}</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[240px] p-2 flex flex-col gap-2 shadow-xl border-border" align="start" onInteractOutside={() => setMenuAberto(null)}>
              <input
                type="text"
                placeholder="Buscar ou selecionar..."
                value={buscaTag}
                onChange={(e) => setBuscaTag(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && buscaTag.trim() && !existeExata) {
                    processarCriarTag(buscaTag);
                  }
                }}
                autoFocus
                className="w-full bg-accent/40 border border-border text-xs px-2.5 py-1.5 rounded-md outline-none"
              />

              <div className="max-h-48 overflow-y-auto flex flex-col gap-0.5">
                {tagsFiltradas.map((tag) => {
                  const selecionada = tags.includes(tag);
                  return (
                    <button
                      key={tag}
                      onClick={() => {
                        if (selecionada) {
                          atualizar(chave, tags.filter((t: string) => t !== tag));
                        } else {
                          atualizar(chave, [...tags, tag]);
                        }
                      }}
                      className="w-full flex items-center justify-between rounded-md hover:bg-accent px-2 py-1.5 transition-colors cursor-pointer text-left"
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <input
                          type="checkbox"
                          checked={selecionada}
                          readOnly
                          className="w-3.5 h-3.5 rounded border-border text-primary focus:ring-0 cursor-pointer shrink-0"
                        />
                        <div className="truncate flex-1">
                          {renderizarBadgeTag(tag)}
                        </div>
                      </div>
                    </button>
                  );
                })}

                {buscaTag.trim() && !existeExata && (
                  <button
                    onClick={() => processarCriarTag(buscaTag)}
                    className="w-full text-left px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-accent rounded-md flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus size={12} />
                    <span>Adicionar "{buscaTag.trim()}"</span>
                  </button>
                )}

                {tagsFiltradas.length === 0 && !buscaTag.trim() && (
                  <span className="text-[11px] text-muted-foreground p-2 text-center">
                    Nenhuma opção cadastrada
                  </span>
                )}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      );
    }

    if (tipo === "relation" || chave === "relacionamentos" || chave === "relacao") {
      const relacoes = Array.isArray(valor) ? valor : typeof valor === "string" && valor ? [valor] : [];
      const textoMencoes = extrairMencoesTexto(corpoTexto || "", opcoesRelacionamento.map(o => o.titulo));
      const todasRelacoes = Array.from(new Set([...relacoes, ...textoMencoes.map(m => `@${m.replace(/^@+/, "").trim()}`)]));
      
      const obterEstiloRel = (rel: string) => {
        const nomePuro = rel.replace(/^@/, "").trim();
        const rLower = nomePuro.toLowerCase();

        const itemAlvo = opcoesRelacionamento.find((o) => {
          const t = o.titulo.toLowerCase().trim();
          return t === rLower || o.caminho.toLowerCase().includes(rLower);
        });

        const c = itemAlvo?.caminho?.toLowerCase() || "";

        if (
          c.startsWith("pdi/metas/") ||
          c.startsWith("metas/") ||
          c.startsWith("pdi/entregas/") ||
          c.startsWith("entregas/") ||
          rLower.includes("meta") ||
          rLower.includes("entrega") ||
          rLower.includes("conquista") ||
          rLower.includes("brag") ||
          rLower.includes("pdi")
        ) {
          return {
            tipo: "meta",
            icone: <Target size={11} className="text-emerald-500 shrink-0" />,
            classeBadge: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25 hover:bg-emerald-500/20",
            itemAlvo,
            nomePuro,
          };
        }

        if (c.startsWith("tarefas/") || rLower.includes("tarefa")) {
          return {
            tipo: "tarefa",
            icone: <CheckSquare size={11} className="text-blue-500 shrink-0" />,
            classeBadge: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/25 hover:bg-blue-500/20",
            itemAlvo,
            nomePuro,
          };
        }

        if (c.startsWith("notas/") || rLower.includes("nota")) {
          return {
            tipo: "nota",
            icone: <FileText size={11} className="text-amber-500 shrink-0" />,
            classeBadge: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25 hover:bg-amber-500/20",
            itemAlvo,
            nomePuro,
          };
        }

        if (c.startsWith("contatos/") || rLower.includes("contato") || rLower.includes("pessoa")) {
          return {
            tipo: "contato",
            icone: <Users size={11} className="text-teal-500 shrink-0" />,
            classeBadge: "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/25 hover:bg-teal-500/20",
            itemAlvo,
            nomePuro,
          };
        }

        if (c.startsWith("referencias/") || rLower.includes("referencia")) {
          return {
            tipo: "referencia",
            icone: <Bookmark size={11} className="text-rose-500 shrink-0" />,
            classeBadge: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/25 hover:bg-rose-500/20",
            itemAlvo,
            nomePuro,
          };
        }

        if (c.startsWith("lousas/") || rLower.includes("lousa") || rLower.includes("mapa")) {
          return {
            tipo: "lousa",
            icone: <Layout size={11} className="text-indigo-500 shrink-0" />,
            classeBadge: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30 hover:bg-indigo-500/25",
            itemAlvo,
            nomePuro,
          };
        }

        return {
          tipo: "outro",
          icone: <LinkIcon size={10} className="text-blue-500 shrink-0" />,
          classeBadge: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 hover:bg-blue-500/20",
          itemAlvo,
          nomePuro,
        };
      };

      return (
        <Popover open={menuAberto === idPopover} onOpenChange={(open) => setMenuAberto(open ? idPopover : null)}>
          <PopoverTrigger asChild>
            <div className="flex items-center gap-1.5 flex-wrap py-1 min-h-7 cursor-pointer">
              {todasRelacoes.length === 0 ? (
                <span className="text-muted-foreground text-xs px-1">Vazio</span>
              ) : (
                todasRelacoes.map((rel: string) => {
                  const est = obterEstiloRel(rel);
                  return (
                    <span
                      key={rel}
                      className={cn(
                        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border transition-colors",
                        est.classeBadge
                      )}
                    >
                      {est.icone}
                      <span>{est.nomePuro}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          atualizar(chave, relacoes.filter((r: string) => r !== rel));
                        }}
                        className="opacity-50 hover:opacity-100 hover:text-destructive cursor-pointer ml-0.5"
                      >
                        <X size={10} />
                      </button>
                    </span>
                  );
                })
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-1.5 text-[11px] font-normal text-muted-foreground hover:text-foreground flex items-center gap-1 border border-dashed border-border/80 rounded"
              >
                <Plus size={11} />
                <span>Vincular</span>
              </Button>
            </div>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-0 shadow-xl border-border" align="start" onInteractOutside={() => setMenuAberto(null)}>
            <Command>
              <CommandInput placeholder="Buscar documento..." />
              <CommandList className="max-h-60">
                <CommandEmpty>Nenhum documento encontrado.</CommandEmpty>
                <CommandGroup heading="Documentos no Segundo Cérebro">
                  {opcoesRelacionamento.map((opcao) => {
                    const est = obterEstiloRel(opcao.titulo);
                    const jaRelacionado = relacoes.includes(`@${opcao.titulo}`) || relacoes.includes(opcao.titulo);
                    return (
                      <CommandItem
                        key={opcao.caminho}
                        onSelect={() => {
                          const tagFormatada = `@${opcao.titulo}`;
                          if (jaRelacionado) {
                            atualizar(chave, relacoes.filter((r: string) => r !== tagFormatada && r !== opcao.titulo));
                          } else {
                            atualizar(chave, [...relacoes, tagFormatada]);
                          }
                        }}
                        className="flex items-center justify-between gap-2 cursor-pointer"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {est.icone}
                          <span className="truncate text-xs">{opcao.titulo}</span>
                        </div>
                        {jaRelacionado && <Check size={12} className="text-primary shrink-0" />}
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      );
    }

    if (chave === "caminho") {
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

  function renderizarMenuPropriedade(chave: string, fixo?: any) {
    const tipoAtual = 
      chave === "status" ? "status" :
      chave === "prioridade" ? "select" :
      chave === "caminho" ? "texto" :
      chave === "criado_por" ? "criado_por" :
      chave === "criado_em" || chave === "criado" ? "criado_em" :
      chave === "ultima_edicao" || chave === "atualizado" || chave === "atualizado_em" ? "ultima_edicao" :
      chave === "aviso_inbox" || chave === "aviso_telegram" || chave === "aviso_email" ? "checkbox" :
      chave === "data" || chave === "prazo" ? "data" :
      fixo?.tipo || esquema[chave] || "texto";

    const IconeAtual = 
      chave === "prioridade" ? Flag :
      chave === "caminho" ? Folder :
      chave === "aviso_inbox" ? InboxIcon :
      chave === "aviso_telegram" ? SendIcon :
      chave === "aviso_email" ? MailIcon :
      chave === "horario" || chave === "hora" ? Clock :
      chave === "data" || chave === "prazo" ? CalendarIcon :
      fixo?.icone ? () => <>{fixo.icone}</> : 
      ICONES_TIPO[tipoAtual as TipoPropriedade] || Type;
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

    const salvarListaOpcoes = (novas: string[]) => {
      salvarOpcoesPropriedadeLocal(chave, novas);
    };

    return (
      <Popover open={menuAberto === idMenu} onOpenChange={(open) => {
        if (open) {
          setMenuAberto(idMenu);
          setRenomearPara(rotuloAtual);
        } else {
          setMenuAberto(null);
          setEditandoTag(null);
        }
      }}>
        <PopoverTrigger asChild>
          <button className="w-28 sm:w-36 shrink-0 flex items-center gap-1.5 sm:gap-2 text-muted-foreground px-1.5 sm:px-2 py-1 -ml-1 sm:-ml-2 rounded hover:bg-accent/60 transition-colors text-left group/prop">
            <IconeAtual className="h-3.5 w-3.5 sm:h-4 sm:w-4 opacity-60 shrink-0" />
            <span className="truncate flex-1 font-medium text-xs">{rotuloAtual}</span>
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-[280px] p-3 flex flex-col gap-2 shadow-xl border-border max-h-[85vh] overflow-y-auto" align="start" onInteractOutside={() => setMenuAberto(null)}>
          <div>
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Nome da Propriedade</span>
            <input 
              value={renomearPara}
              onChange={(e) => setRenomearPara(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") renomear(chave, renomearPara);
              }}
              onBlur={() => renomear(chave, renomearPara)}
              className="bg-accent/50 border border-border outline-none text-xs px-2.5 py-1.5 rounded-md focus:ring-2 focus:ring-primary w-full"
            />
          </div>

          <div className="border-t border-border pt-2 mt-1">
            <span className="text-[11px] font-semibold text-muted-foreground px-1 uppercase tracking-wider block mb-1">Visibilidade</span>
            <div className="flex flex-col gap-0.5">
              {[
                { id: "sempre", label: "Sempre mostrar", icon: Eye },
                { id: "vazia", label: "Esconder se vazia", icon: EyeOff },
                { id: "esconder", label: "Sempre esconder", icon: EyeOff },
              ].map((v) => (
                <button
                  key={v.id}
                  onClick={() => {
                    atualizarVisibilidade(chave, v.id as OpcaoVisibilidade);
                    setMenuAberto(null);
                  }}
                  className={cn(
                    "w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs text-left transition-colors hover:bg-accent",
                    visAtual === v.id ? "bg-accent font-semibold text-foreground" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <v.icon className="h-4 w-4 opacity-75 shrink-0" />
                  <span>{v.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-border pt-2 mt-1">
            <span className="text-[11px] font-semibold text-muted-foreground px-1 uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
              <SlidersHorizontal size={12} className="text-primary" />
              <span>Configurações da Propriedade</span>
            </span>

            {(tipoAtual === "multiselect" || tipoAtual === "select" || chave === "tags" || chave === "colaboracao" || fixo?.opcoes) && (
              <div className="space-y-2 p-2 bg-secondary/30 rounded-lg border border-border/40 text-xs">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-muted-foreground font-medium">Opções Pré-cadastradas:</span>
                  <span className="text-[10px] text-muted-foreground">{opcoesCadastradas.length} cadastradas</span>
                </div>

                <div className="max-h-40 overflow-y-auto flex flex-col gap-1.5 pt-1">
                  {opcoesCadastradas.map((op) => {
                    const estaEditando = editandoTag === op;
                    const corAtual = coresMap[op] || "azul";
                    return (
                      <div key={op} className="flex items-center justify-between gap-1.5 p-1 rounded bg-card border border-border/60 text-xs">
                        {estaEditando ? (
                          <div className="flex items-center gap-1 flex-1">
                            <input
                              type="text"
                              value={novoNomeTag}
                              onChange={(e) => setNovoNomeTag(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  const nomeLimpo = novoNomeTag.trim();
                                  if (nomeLimpo && nomeLimpo !== op) {
                                    const novas = opcoesCadastradas.map(x => x === op ? nomeLimpo : x);
                                    salvarListaOpcoes(novas);
                                    if (chave === "tags") {
                                      const novasCores = { ...globalConfig.coresTags };
                                      delete novasCores[op];
                                      novasCores[nomeLimpo] = corAtual;
                                      salvarConfigPropriedadesGlobais(undefined, novasCores);
                                      setGlobalConfig(lerConfigPropriedadesGlobais());
                                    }
                                  }
                                  setEditandoTag(null);
                                }
                                if (e.key === "Escape") setEditandoTag(null);
                              }}
                              autoFocus
                              className="flex-1 bg-accent/40 border border-border text-[11px] px-1.5 py-0.5 rounded outline-none"
                            />
                            <button
                              onClick={() => {
                                const nomeLimpo = novoNomeTag.trim();
                                if (nomeLimpo && nomeLimpo !== op) {
                                  const novas = opcoesCadastradas.map(x => x === op ? nomeLimpo : x);
                                  salvarListaOpcoes(novas);
                                  if (chave === "tags") {
                                    const novasCores = { ...globalConfig.coresTags };
                                    delete novasCores[op];
                                    novasCores[nomeLimpo] = corAtual;
                                    salvarConfigPropriedadesGlobais(undefined, novasCores);
                                    setGlobalConfig(lerConfigPropriedadesGlobais());
                                  }
                                }
                                setEditandoTag(null);
                              }}
                              className="text-[10px] text-primary font-semibold px-1"
                            >
                              OK
                            </button>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center gap-1.5 min-w-0 flex-1">
                              {renderizarBadgeTag(op)}
                            </div>

                            <div className="flex items-center gap-0.5 shrink-0">
                              <Popover>
                                <PopoverTrigger asChild>
                                  <button
                                    type="button"
                                    title="Alterar cor da opção"
                                    className="p-1 text-muted-foreground hover:text-foreground rounded hover:bg-accent cursor-pointer"
                                  >
                                    <Palette size={11} />
                                  </button>
                                </PopoverTrigger>
                                <PopoverContent className="w-48 p-2" align="end">
                                  <span className="text-[10px] font-semibold text-muted-foreground block mb-1">Escolher Cor</span>
                                  <div className="grid grid-cols-3 gap-1">
                                    {Object.entries(CORES_NOTION).map(([nomeCor, est]) => (
                                      <button
                                        key={nomeCor}
                                        type="button"
                                        onClick={() => atualizarCorTag(op, nomeCor)}
                                        className={cn(
                                          "px-1.5 py-1 rounded text-[10px] font-medium border text-center transition-colors cursor-pointer",
                                          est.bg,
                                          est.text,
                                          est.border,
                                          corAtual === nomeCor && "ring-1 ring-primary font-bold"
                                        )}
                                      >
                                        {est.nome}
                                      </button>
                                    ))}
                                  </div>
                                </PopoverContent>
                              </Popover>

                              <button
                                type="button"
                                onClick={() => {
                                  setEditandoTag(op);
                                  setNovoNomeTag(op);
                                }}
                                title="Renomear opção"
                                className="p-1 text-muted-foreground hover:text-foreground rounded hover:bg-accent cursor-pointer"
                              >
                                <Pencil size={11} />
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  const novas = opcoesCadastradas.filter(x => x !== op);
                                  salvarListaOpcoes(novas);
                                  if (chave === "tags") {
                                    const novasCores = { ...globalConfig.coresTags };
                                    delete novasCores[op];
                                    salvarConfigPropriedadesGlobais(undefined, novasCores);
                                    setGlobalConfig(lerConfigPropriedadesGlobais());
                                  }
                                  toast(`Opção "${op}" removida das pré-cadastradas.`);
                                }}
                                title="Excluir opção"
                                className="p-1 text-muted-foreground hover:text-destructive rounded hover:bg-destructive/10 cursor-pointer"
                              >
                                <Trash2 size={11} />
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="pt-2 border-t border-border/40 flex items-center gap-1">
                  <input
                    type="text"
                    placeholder="Nova opção pré-cadastrada..."
                    value={buscaTag}
                    onChange={(e) => setBuscaTag(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && buscaTag.trim()) {
                        const nova = buscaTag.trim();
                        const novas = Array.from(new Set([...opcoesCadastradas, nova]));
                        salvarListaOpcoes(novas);
                        if (chave === "tags") {
                          atualizarCorTag(nova, "azul");
                        }
                        setBuscaTag("");
                        toast(`Opção "${nova}" cadastrada.`);
                      }
                    }}
                    className="flex-1 bg-card border border-border text-[11px] px-2 py-1 rounded outline-none"
                  />
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={!buscaTag.trim()}
                    onClick={() => {
                      if (buscaTag.trim()) {
                        const nova = buscaTag.trim();
                        const novas = Array.from(new Set([...opcoesCadastradas, nova]));
                        salvarListaOpcoes(novas);
                        if (chave === "tags") {
                          atualizarCorTag(nova, "azul");
                        }
                        setBuscaTag("");
                        toast(`Opção "${nova}" cadastrada.`);
                      }
                    }}
                    className="h-6 text-[10px] px-2"
                  >
                    Adicionar
                  </Button>
                </div>
              </div>
            )}

            {(chave === "Pomodoro" || chave === "pomodoro" || chave === "estimativa") && (
              <div className="p-2.5 bg-secondary/30 rounded-lg border border-border/40 space-y-2.5 text-xs">
                <div className="flex items-center gap-1.5 font-semibold text-foreground">
                  <Timer size={13} className="text-indigo-500 shrink-0" />
                  <span>Configurações de Pomodoro</span>
                </div>
                
                <div className="space-y-2 pt-1 border-t border-border/40">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] text-muted-foreground font-medium">Pomodoros Estimados:</span>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min="0"
                        max="99"
                        value={dados.pomodoros_estimados ?? dados.Pomodoro ?? dados.pomodoro ?? ""}
                        onChange={(e) => {
                          const val = e.target.value === "" ? undefined : Number(e.target.value);
                          const novos = { ...dados, pomodoros_estimados: val, Pomodoro: val, pomodoro: val };
                          onChange(novos);
                        }}
                        placeholder="0"
                        className="w-16 bg-card border border-border text-xs px-2 py-1 rounded text-center outline-none focus:ring-1 focus:ring-primary"
                      />
                      <span className="text-[10px] text-muted-foreground">pomos</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] text-muted-foreground font-medium">Pomodoros Realizados:</span>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min="0"
                        max="99"
                        value={dados.pomodoros_realizados ?? dados.fraturados ?? ""}
                        onChange={(e) => {
                          const val = e.target.value === "" ? undefined : Number(e.target.value);
                          const novos = { ...dados, pomodoros_realizados: val, fraturados: val };
                          onChange(novos);
                        }}
                        placeholder="0"
                        className="w-16 bg-card border border-border text-xs px-2 py-1 rounded text-center outline-none focus:ring-1 focus:ring-primary"
                      />
                      <span className="text-[10px] text-muted-foreground">pomos</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {tipoAtual === "numero" && chave !== "Pomodoro" && chave !== "pomodoro" && chave !== "estimativa" && (
              <div className="p-2 bg-secondary/30 rounded-lg border border-border/40 space-y-1.5 text-xs">
                <span className="text-[11px] text-muted-foreground block font-medium">Formato do Número:</span>
                <div className="grid grid-cols-2 gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      const novoEsq = { ...esquema, [chave]: "numero" as TipoPropriedade };
                      onChange({ ...dados, esquema: novoEsq });
                      toast("Formato: Número Simples.");
                    }}
                    className="py-1 px-2 text-[10px] rounded bg-card border border-border hover:bg-accent text-center cursor-pointer font-medium"
                  >
                    Simples
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      renomear(chave, "Pomodoro");
                      toast("Formato: Prismas de Esforço.");
                    }}
                    className="py-1 px-2 text-[10px] rounded bg-card border border-border hover:bg-accent text-center cursor-pointer font-medium"
                  >
                    Prismas (1-5)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      toast("Formato moeda ativado.");
                    }}
                    className="py-1 px-2 text-[10px] rounded bg-card border border-border hover:bg-accent text-center cursor-pointer font-medium"
                  >
                    Moeda (R$)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      toast("Formato porcentagem ativado.");
                    }}
                    className="py-1 px-2 text-[10px] rounded bg-card border border-border hover:bg-accent text-center cursor-pointer font-medium"
                  >
                    Porcentagem (%)
                  </button>
                </div>
              </div>
            )}

            {tipoAtual === "data" && (
              <div className="p-2 bg-secondary/30 rounded-lg border border-border/40 space-y-1.5 text-xs">
                <span className="text-[11px] text-muted-foreground block font-medium">Formato da Data:</span>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-muted-foreground">Padrão:</span>
                  <span className="text-[10px] font-semibold text-primary">DD/MM/AAAA (Brasil)</span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-muted-foreground">Fuso horário:</span>
                  <span className="text-[10px] text-muted-foreground font-mono">GMT-3</span>
                </div>
              </div>
            )}

            {tipoAtual === "texto" && (
              <div className="p-2 bg-secondary/30 rounded-lg border border-border/40 space-y-1.5 text-xs">
                <span className="text-[11px] text-muted-foreground block font-medium">Tipo de Entrada:</span>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-muted-foreground">Comportamento:</span>
                  <span className="text-[10px] font-semibold text-primary">Texto Curto Dinâmico</span>
                </div>
              </div>
            )}
          </div>

          {!fixo && (
            <div className="border-t border-border pt-2 mt-1">
              <span className="text-[11px] font-semibold text-muted-foreground px-1 uppercase tracking-wider block mb-1">Tipo de Propriedade</span>
              <div className="flex flex-col gap-0.5 max-h-48 overflow-y-auto pr-1">
                {(Object.entries(ICONES_TIPO) as [TipoPropriedade, React.ElementType][]).map(([t, Icon]) => (
                  <button 
                    key={t}
                    onClick={() => {
                      atualizarEsquema(chave, t);
                      setMenuAberto(null);
                    }}
                    className={cn(
                      "w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs text-left transition-colors hover:bg-accent",
                      tipoAtual === t ? "bg-accent font-semibold text-foreground" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4 opacity-75 shrink-0" />
                    <span>{NOMES_TIPO[t]}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {!fixo && (
            <div className="border-t border-border pt-2 mt-1">
              <button
                onClick={() => {
                  remover(chave);
                  setMenuAberto(null);
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
              >
                <Trash2 className="h-4 w-4 shrink-0" />
                <span>Excluir propriedade</span>
              </button>
            </div>
          )}
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <div className="flex flex-col gap-1.5 w-full">
      {/* Banner de Homologação de Sugestão da IA */}
      {Boolean(dados.ia_sugeriu) && (
        <div className="mb-2 p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/25 flex items-center justify-between gap-2 text-xs text-purple-700 dark:text-purple-300">
          <div className="flex items-center gap-1.5 min-w-0">
            <Sparkles size={14} className="shrink-0 text-purple-600 dark:text-purple-400" />
            <span className="truncate">Sugerido por IA. Confira as informações deste item.</span>
          </div>
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
      )}

      {/* Lista de Propriedades Visíveis */}
      {chavesVisiveis.map((chave) => {
        const fixo = camposFixos[chave];
        return (
          <div key={chave} className="flex min-h-8 items-center gap-2 sm:gap-4 text-xs group">
            {renderizarMenuPropriedade(chave, fixo)}
            <div className="flex-1 flex items-center min-h-8 min-w-0">
              {renderizarValor(chave)}
            </div>
          </div>
        );
      })}

      {/* Botão de Adicionar Nova Propriedade perfeitamente alinhado acima das ocultas */}
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
                        "w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs text-left transition-colors hover:bg-accent",
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

      {/* Gaveta de Propriedades Ocultas na parte inferior */}
      {chavesOcultas.length > 0 && (
        <div className="mt-1 border-t border-border/40 pt-1">
          <button
            onClick={() => setMostrandoOcultas(!mostrandoOcultas)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-1 py-0.5 font-medium"
          >
            {mostrandoOcultas ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
            <span>{chavesOcultas.length} propriedade{chavesOcultas.length > 1 ? "s" : ""} oculta{chavesOcultas.length > 1 ? "s" : ""}</span>
          </button>

          {mostrandoOcultas && (
            <div className="flex flex-col gap-1.5 mt-1.5 pl-2 border-l border-border/60">
              {chavesOcultas.map((chave) => {
                const fixo = camposFixos[chave];
                return (
                  <div key={chave} className="flex min-h-8 items-center gap-2 sm:gap-4 text-xs group opacity-75 hover:opacity-100">
                    {renderizarMenuPropriedade(chave, fixo)}
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

      {/* Modal de Criação / Edição Rápida de Contato */}
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
