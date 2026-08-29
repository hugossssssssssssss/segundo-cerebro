import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  CheckSquare,
  FileText,
  Target,
  Sparkles,
  Bell,
  Check,
  Clock,
  ChevronDown,
  ChevronUp,
  WifiOff,
  RotateCcw,
  Trash2,
  ExternalLink,
  Calendar,
  AlertTriangle,
  RefreshCw,
  MoreVertical,
  Edit3,
  Copy,
} from "lucide-react";
import { lerConfig, configCompleta } from "@/lib/settings";
import { carregarRepo, type ItemRepo, invalidarCache } from "@/lib/repo";
import { useSalvar } from "@/lib/useSalvar";
import { lerMarkdown, escreverMarkdown, tituloProvavel, nomeLivre } from "@/lib/markdown";
import { toast } from "@/lib/toast";
import {
  obterRascunhosLocais,
  removerRascunhoLocal,
  limparTodosRascunhosLocais,
  sincronizarFilaOffline,
  forcarResolverConflitoRascunho,
  type RascunhoOffline,
} from "@/lib/offlineQueue";
import { PainelNotionBase, type ModoVisaoNotion } from "@/components/PainelNotionBase";
import { Carregando, ModalConfirmacao } from "@/components/ui";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn, formatarNomeAmigavel } from "@/lib/utils";
import { format, startOfWeek, endOfWeek, addDays, addWeeks, subWeeks, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";

export interface CompromissoSemana {
  id: string;
  tipo: "tarefa" | "nota" | "meta" | "entrega" | "lembrete";
  titulo: string;
  dataIso: string; // YYYY-MM-DD
  dataBr: string; // DD/MM/AAAA
  hora?: string;
  caminho: string;
  sha: string;
  corpo: string;
  dados: Record<string, any>;
  concluido?: boolean;
  atrasado?: boolean;
}

type AbaInbox = "agenda" | "rascunhos";

const ESTILOS_TIPO: Record<string, { border: string; bg: string; text: string; badgeBg: string; rotulo: string }> = {
  tarefa: {
    border: "border-blue-500/30 hover:border-blue-500/60",
    bg: "bg-blue-500/5",
    text: "text-blue-600 dark:text-blue-400",
    badgeBg: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    rotulo: "Tarefa",
  },
  meta: {
    border: "border-violet-500/30 hover:border-violet-500/60",
    bg: "bg-violet-500/5",
    text: "text-violet-600 dark:text-violet-400",
    badgeBg: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
    rotulo: "Meta PDI",
  },
  entrega: {
    border: "border-emerald-500/30 hover:border-emerald-500/60",
    bg: "bg-emerald-500/5",
    text: "text-emerald-600 dark:text-emerald-400",
    badgeBg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    rotulo: "Entrega",
  },
  nota: {
    border: "border-amber-500/30 hover:border-amber-500/60",
    bg: "bg-amber-500/5",
    text: "text-amber-600 dark:text-amber-400",
    badgeBg: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    rotulo: "Nota",
  },
  lembrete: {
    border: "border-sky-500/30 hover:border-sky-500/60",
    bg: "bg-sky-500/5",
    text: "text-sky-600 dark:text-sky-400",
    badgeBg: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
    rotulo: "Lembrete",
  },
};

function MenuAcoesCompromisso({
  onEditar,
  onDuplicar,
  onExcluir,
}: {
  onEditar: () => void;
  onDuplicar: () => void;
  onExcluir: () => void;
}) {
  const [aberto, setAberto] = useState(false);

  return (
    <Popover open={aberto} onOpenChange={setAberto}>
      <PopoverTrigger asChild>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
          }}
          className="p-1 rounded-md text-muted-foreground/70 hover:text-foreground hover:bg-muted/80 transition-colors shrink-0 cursor-pointer"
          title="Opções do documento"
          aria-label="Opções do documento"
        >
          <MoreVertical size={14} />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={4}
        className="w-40 p-1.5 shadow-lg border border-border bg-popover rounded-xl z-50 select-none"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col gap-0.5 text-xs">
          <button
            type="button"
            onClick={() => {
              setAberto(false);
              onEditar();
            }}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-accent text-foreground transition-colors cursor-pointer text-left w-full font-medium"
          >
            <Edit3 size={13} className="text-blue-500 shrink-0" />
            <span>Editar</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setAberto(false);
              onDuplicar();
            }}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-accent text-foreground transition-colors cursor-pointer text-left w-full font-medium"
          >
            <Copy size={13} className="text-amber-500 shrink-0" />
            <span>Duplicar</span>
          </button>

          <hr className="my-1 border-border/50" />

          <button
            type="button"
            onClick={() => {
              setAberto(false);
              onExcluir();
            }}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-destructive/10 text-destructive transition-colors cursor-pointer text-left w-full font-medium"
          >
            <Trash2 size={13} className="shrink-0" />
            <span>Excluir</span>
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default function Inbox() {
  const cfg = lerConfig();
  const pronto = configCompleta(cfg);
  const { salvarTexto, apagarItem } = useSalvar(cfg);

  const [abaAtiva, setAbaAtiva] = useState<AbaInbox>("agenda");
  const [carregando, setCarregando] = useState(true);
  const [acervo, setAcervo] = useState<ItemRepo[]>([]);
  const [dataReferencia, setDataReferencia] = useState<Date>(new Date());
  const [mostrarPendencias, setMostrarPendencias] = useState(false);

  // Estados de Drag and Drop e Exclusão
  const [itemArrastando, setItemArrastando] = useState<CompromissoSemana | null>(null);
  const itemArrastandoRef = useRef<CompromissoSemana | null>(null);
  const [diaSobHover, setDiaSobHover] = useState<string | null>(null);
  const [itemParaExcluir, setItemParaExcluir] = useState<CompromissoSemana | null>(null);

  // Rascunhos Offline
  const [rascunhos, setRascunhos] = useState<RascunhoOffline[]>([]);
  const [sincronizandoTudo, setSincronizandoTudo] = useState(false);

  // Estado do Painel Notion para Novo Lembrete / Edição de Documento
  const [itemAberto, setItemAberto] = useState<CompromissoSemana | null>(null);
  const [modoVisaoNotion, setModoVisaoNotion] = useState<ModoVisaoNotion>("lado");
  const [tituloEditor, setTituloEditor] = useState("");
  const [corpoEditor, setCorpoEditor] = useState("");
  const [dadosPropsEditor, setDadosPropsEditor] = useState<Record<string, any>>({});
  const [salvandoItem, setSalvandoItem] = useState(false);
  const [temMudancasItem, setTemMudancasItem] = useState(false);

  // Atualiza rascunhos locais
  const atualizarRascunhos = useCallback(() => {
    setRascunhos(obterRascunhosLocais());
  }, []);

  // Carrega repositório
  const carregar = useCallback(async () => {
    if (!pronto) return;
    try {
      setAcervo((prev) => {
        if (prev.length === 0) setCarregando(true);
        return prev;
      });
      const todos = await carregarRepo(cfg);
      setAcervo(todos);
      atualizarRascunhos();
    } catch {
      // Erro tratado silenciosamente
    } finally {
      setCarregando(false);
    }
  }, [pronto, cfg, atualizarRascunhos]);

  useEffect(() => {
    carregar();
    const aoAtualizarAcervo = () => {
      carregar();
    };
    window.addEventListener("acervo-atualizado", aoAtualizarAcervo);
    return () => window.removeEventListener("acervo-atualizado", aoAtualizarAcervo);
  }, [carregar]);

  // Formata data ISO para DD/MM/AAAA com barras
  const formatarBr = (iso: string) => {
    if (!iso) return "";
    const partes = iso.split("-");
    if (partes.length === 3) {
      return `${partes[2]}/${partes[1]}/${partes[0]}`;
    }
    return iso;
  };

  // ── Compilação Abrangente de Todos os Compromissos ────────────────────────
  const todosCompromissos = useMemo<CompromissoSemana[]>(() => {
    const hojeStr = new Date().toISOString().split("T")[0];
    const lista: CompromissoSemana[] = [];

    for (const item of acervo) {
      if (!item.texto) continue;
      const doc = lerMarkdown(item.texto);
      const tituloDoc = tituloProvavel(doc, item.nome);
      const dados = doc.dados || {};

      // 1. Tarefas ou Lembretes na pasta tarefas/
      if (item.caminho.startsWith("tarefas/")) {
        const ehLembrete = dados.tipo === "lembrete" || item.nome.startsWith("lembrete-");
        const prazo = (dados.prazo as string) || (dados.data_fim as string) || (dados.data_inicio as string) || (dados.data as string);
        if (prazo && typeof prazo === "string") {
          const match = prazo.match(/\d{4}-\d{2}-\d{2}/);
          if (match) {
            const dataIso = match[0];
            const concluido = dados.status === "feito";
            const atrasado = !concluido && dataIso < hojeStr;

            if (ehLembrete) {
              lista.push({
                id: `lembrete-${item.caminho}`,
                tipo: "lembrete",
                titulo: tituloDoc,
                dataIso,
                dataBr: formatarBr(dataIso),
                hora: (dados.horario as string) || (dados.hora as string),
                caminho: item.caminho,
                sha: item.sha,
                corpo: doc.corpo,
                dados,
                atrasado,
              });
            } else {
              lista.push({
                id: `tarefa-${item.caminho}`,
                tipo: "tarefa",
                titulo: tituloDoc,
                dataIso,
                dataBr: formatarBr(dataIso),
                caminho: item.caminho,
                sha: item.sha,
                corpo: doc.corpo,
                dados,
                concluido,
                atrasado,
              });
            }
          }
        }
      }

      // 2. Metas do PDI (pdi/metas/)
      else if (item.caminho.startsWith("pdi/metas/")) {
        const prazo = dados.prazo as string;
        if (prazo && typeof prazo === "string") {
          const match = prazo.match(/\d{4}-\d{2}-\d{2}/);
          if (match) {
            const dataIso = match[0];
            const concluido = dados.status === "concluida";
            const atrasado = !concluido && dataIso < hojeStr;

            lista.push({
              id: `meta-${item.caminho}`,
              tipo: "meta",
              titulo: `Meta: ${tituloDoc}`,
              dataIso,
              dataBr: formatarBr(dataIso),
              caminho: item.caminho,
              sha: item.sha,
              corpo: doc.corpo,
              dados,
              concluido,
              atrasado,
            });
          }
        }
      }

      // 3. Entregas do PDI (pdi/entregas/)
      else if (item.caminho.startsWith("pdi/entregas/")) {
        const data = (dados.data as string) || (dados.prazo as string);
        if (data && typeof data === "string") {
          const match = data.match(/\d{4}-\d{2}-\d{2}/);
          if (match) {
            const dataIso = match[0];
            lista.push({
              id: `entrega-${item.caminho}`,
              tipo: "entrega",
              titulo: `Entrega: ${tituloDoc}`,
              dataIso,
              dataBr: formatarBr(dataIso),
              caminho: item.caminho,
              sha: item.sha,
              corpo: doc.corpo,
              dados,
              concluido: true,
            });
          }
        }
      }

      // 4. Notas com Data (notas/)
      else if (item.caminho.startsWith("notas/")) {
        const dataNota = (dados.data as string) || (dados.prazo as string) || (dados.data_reuniao as string);
        let dataEncontrada: string | null = null;

        if (dataNota && typeof dataNota === "string") {
          const match = dataNota.match(/\d{4}-\d{2}-\d{2}/);
          if (match) dataEncontrada = match[0];
        } else {
          // Checa data no nome do arquivo (ex: 2026-08-27-titulo.md)
          const matchNome = item.nome.match(/^(\d{4}-\d{2}-\d{2})/);
          if (matchNome) dataEncontrada = matchNome[1];
        }

        if (dataEncontrada) {
          lista.push({
            id: `nota-${item.caminho}`,
            tipo: "nota",
            titulo: tituloDoc,
            dataIso: dataEncontrada,
            dataBr: formatarBr(dataEncontrada),
            caminho: item.caminho,
            sha: item.sha,
            corpo: doc.corpo,
            dados,
          });
        }
      }

      // 5. Lembretes inline no texto [⏰ Lembrete: Título | YYYY-MM-DD HH:mm]
      const matches = item.texto.matchAll(/\[⏰\s*Lembrete:\s*([^|]+)\|\s*([\d\s\-:T]+)\]/gi);
      for (const m of matches) {
        const tit = m[1]?.trim();
        const dh = m[2]?.trim();
        if (tit && dh) {
          const partes = dh.split(" ");
          const dataIso = partes[0] || "";
          const hora = partes[1] || "";

          if (/^\d{4}-\d{2}-\d{2}/.test(dataIso)) {
            lista.push({
              id: `lembrete-${item.caminho}-${tit}`,
              tipo: "lembrete",
              titulo: `Lembrete: ${tit}`,
              dataIso,
              dataBr: formatarBr(dataIso),
              hora,
              caminho: item.caminho,
              sha: item.sha,
              corpo: doc.corpo,
              dados,
              atrasado: dataIso < hojeStr,
            });
          }
        }
      }
    }

    return lista;
  }, [acervo]);

  // ── Dias da Semana Atual (Segunda a Domingo) ──────────────────────────────
  const inicioSemana = useMemo(() => {
    return startOfWeek(dataReferencia, { weekStartsOn: 1 }); // Começa na segunda-feira
  }, [dataReferencia]);

  const diasDaSemana = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(inicioSemana, i));
  }, [inicioSemana]);

  const fimSemana = useMemo(() => {
    return endOfWeek(dataReferencia, { weekStartsOn: 1 });
  }, [dataReferencia]);

  // Compromissos Atrasados: APENAS o que venceu antes de hoje
  const hojeRealIso = useMemo(() => new Date().toISOString().split("T")[0], []);

  const atrasadosReais = useMemo(() => {
    return todosCompromissos.filter((c) => c.dataIso < hojeRealIso && !c.concluido);
  }, [todosCompromissos, hojeRealIso]);

  // ── Ações de Sincronização e Rascunhos ─────────────────────────────────────
  const aoSincronizarFila = async () => {
    if (!pronto) return;
    setSincronizandoTudo(true);
    try {
      const res = await sincronizarFilaOffline(cfg);
      atualizarRascunhos();
      if (res.concluidos > 0) {
        toast(`${res.concluidos} arquivo(s) sincronizado(s) com o GitHub!`);
        carregar();
      } else if (res.falhas > 0) {
        toast(`${res.falhas} falha(s) na sincronização. Verifique os conflitos abaixo.`, { tipo: "erro" });
      } else {
        toast("Nenhum rascunho pendente na fila.");
      }
    } catch (err: any) {
      toast(`Erro ao sincronizar: ${err?.message || err}`, { tipo: "erro" });
    } finally {
      setSincronizandoTudo(false);
    }
  };

  const aoResolverConflito = async (id: string) => {
    try {
      await forcarResolverConflitoRascunho(cfg, id);
      toast("Conflito resolvido e gravado no GitHub!");
      atualizarRascunhos();
      carregar();
    } catch (err: any) {
      toast(`Erro ao resolver conflito: ${err?.message || err}`, { tipo: "erro" });
    }
  };

  const aoDescartarRascunho = (id: string) => {
    removerRascunhoLocal(id);
    atualizarRascunhos();
    toast("Rascunho descartado localmente.");
  };

  const aoLimparTodosRascunhos = () => {
    if (window.confirm("Deseja realmente limpar todos os rascunhos offline locais?")) {
      limparTodosRascunhosLocais();
      atualizarRascunhos();
      toast("Fila de rascunhos limpa.");
    }
  };

  // ── Abertura do Painel Notion ─────────────────────────────────────────────
  const abrirDocumento = (c: CompromissoSemana) => {
    setItemAberto(c);
    setTituloEditor(c.titulo);
    setCorpoEditor(c.corpo);
    setDadosPropsEditor(c.dados);
    setTemMudancasItem(false);
  };

  const abrirRascunhoNoNotion = (r: RascunhoOffline) => {
    const doc = lerMarkdown(r.texto);
    const tit = tituloProvavel(doc, r.caminho.split("/").pop() || "Rascunho");
    setItemAberto({
      id: r.id,
      tipo: "nota",
      titulo: tit,
      dataIso: "",
      dataBr: "",
      caminho: r.caminho,
      sha: r.sha || "",
      corpo: doc.corpo,
      dados: doc.dados || {},
    });
    setTituloEditor(tit);
    setCorpoEditor(doc.corpo);
    setDadosPropsEditor(doc.dados || {});
    setTemMudancasItem(false);
  };

  const abrirNovoLembrete = () => {
    const hojeStr = new Date().toISOString().split("T")[0];
    const novoRascunho: CompromissoSemana = {
      id: "novo-lembrete",
      tipo: "lembrete",
      titulo: "Novo Lembrete",
      dataIso: hojeStr,
      dataBr: formatarBr(hojeStr),
      caminho: "",
      sha: "",
      corpo: "",
      dados: {
        titulo: "Novo Lembrete",
        prazo: hojeStr,
        horario: "09:00",
        aviso_inbox: true,
        aviso_telegram: true,
        aviso_email: false,
        tags: [],
        criado: hojeStr,
        esquema: {
          prazo: "data",
          horario: "texto",
          aviso_inbox: "checkbox",
          aviso_telegram: "checkbox",
          aviso_email: "checkbox",
          tags: "multiselect",
        },
        _rotulos: {
          prazo: "Data do Lembrete",
          horario: "Horário",
          aviso_inbox: "Avisar na Caixa de Entrada",
          aviso_telegram: "Avisar no Telegram",
          aviso_email: "Avisar por E-mail",
        },
      },
    };

    setItemAberto(novoRascunho);
    setTituloEditor(novoRascunho.titulo);
    setCorpoEditor(novoRascunho.corpo);
    setDadosPropsEditor(novoRascunho.dados);
    setTemMudancasItem(true);
  };

  const salvarEdicaoItem = async () => {
    if (!itemAberto) return;
    setSalvandoItem(true);

    const hojeStr = new Date().toISOString().split("T")[0];
    const ehLembrete = itemAberto.tipo === "lembrete";
    const caminhosExistentes = acervo.map((i) => i.caminho);
    const caminhoReal =
      itemAberto.caminho ||
      (ehLembrete
        ? nomeLivre("tarefas", `lembrete-${tituloEditor}`, caminhosExistentes)
        : nomeLivre("tarefas", tituloEditor, caminhosExistentes));

    const novosDados = {
      ...dadosPropsEditor,
      tipo: ehLembrete ? "lembrete" : (dadosPropsEditor.tipo || itemAberto.tipo),
      titulo: tituloEditor,
      atualizado: hojeStr,
    };

    const textoFormatado = escreverMarkdown({
      dados: novosDados,
      corpo: corpoEditor,
    });

    try {
      const novoSha = await salvarTexto(
        caminhoReal,
        textoFormatado,
        itemAberto.sha || undefined,
        `salvar documento: ${tituloEditor}`
      );
      invalidarCache();
      setItemAberto({
        ...itemAberto,
        caminho: caminhoReal,
        sha: novoSha,
        titulo: tituloEditor,
        corpo: corpoEditor,
        dados: novosDados,
      });
      setTemMudancasItem(false);
      toast("Salvo com sucesso!");
      window.dispatchEvent(new CustomEvent("acervo-atualizado"));
      carregar();
    } catch (err: any) {
      toast(`Erro ao salvar: ${err?.message || err}`, { tipo: "erro" });
    } finally {
      setSalvandoItem(false);
    }
  };

  const alternarConclusaoTarefa = async (c: CompromissoSemana) => {
    if (c.tipo !== "tarefa") return;
    const novoStatus = c.concluido ? "a-fazer" : "feito";

    const novosDados = { ...c.dados, status: novoStatus };
    const textoFormatado = escreverMarkdown({ dados: novosDados, corpo: c.corpo });

    try {
      await salvarTexto(c.caminho, textoFormatado, c.sha, `atualizar status: ${c.titulo} (${novoStatus})`);
      invalidarCache();
      toast(novoStatus === "feito" ? `"${c.titulo}" concluída!` : `"${c.titulo}" reaberta.`);
      window.dispatchEvent(new CustomEvent("acervo-atualizado"));
      carregar();
    } catch (err: any) {
      toast(`Erro ao salvar tarefa: ${err?.message || err}`, { tipo: "erro" });
    }
  };

  const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  const mudarDataDocumento = async (item: CompromissoSemana, novaDataIso: string) => {
    try {
      const arquivoOriginal = acervo.find((a) => a.caminho === item.caminho);
      if (!arquivoOriginal) {
        toast("Arquivo original não encontrado para atualizar data.", { tipo: "erro" });
        return;
      }

      const doc = lerMarkdown(arquivoOriginal.texto);
      const dadosAtuais = doc.dados || {};
      let novoCorpo = doc.corpo;

      // Se for lembrete inline no corpo [⏰ Lembrete: Título | ...]
      if (item.id.startsWith("lembrete-") && item.id.includes("-") && item.titulo.startsWith("Lembrete: ")) {
        const titLembrete = item.titulo.replace(/^Lembrete:\s*/, "").trim();
        const regexLembrete = new RegExp(
          `\\[⏰\\s*Lembrete:\\s*${escapeRegex(titLembrete)}\\|\\s*([\\d\\s\\-\\:T]+)\\]`,
          "gi"
        );
        const match = regexLembrete.exec(novoCorpo);
        if (match) {
          const dhAntigo = match[1]?.trim() || "";
          const partesDh = dhAntigo.split(" ");
          const horaAntiga = partesDh[1] || "";
          const novoDh = horaAntiga ? `${novaDataIso} ${horaAntiga}` : novaDataIso;
          novoCorpo = novoCorpo.replace(match[0], `[⏰ Lembrete: ${titLembrete} | ${novoDh}]`);
        }
      }

      // Atualiza frontmatter
      const novosDados: Record<string, any> = { ...dadosAtuais };
      if (item.caminho.startsWith("tarefas/")) {
        novosDados.prazo = novaDataIso;
        if (novosDados.data) novosDados.data = novaDataIso;
        if (novosDados.data_fim) novosDados.data_fim = novaDataIso;
        if (novosDados.data_inicio) novosDados.data_inicio = novaDataIso;
      } else if (item.caminho.startsWith("pdi/metas/")) {
        novosDados.prazo = novaDataIso;
      } else if (item.caminho.startsWith("pdi/entregas/")) {
        novosDados.data = novaDataIso;
        if (novosDados.prazo) novosDados.prazo = novaDataIso;
      } else if (item.caminho.startsWith("notas/")) {
        novosDados.data = novaDataIso;
        if (novosDados.prazo) novosDados.prazo = novaDataIso;
        if (novosDados.data_reuniao) novosDados.data_reuniao = novaDataIso;
      } else {
        novosDados.data = novaDataIso;
      }

      const novoTexto = escreverMarkdown({ dados: novosDados, corpo: novoCorpo });
      const shaNovo = await salvarTexto(item.caminho, novoTexto, arquivoOriginal.sha, `mover data: ${item.titulo} para ${novaDataIso}`);
      const novoDoc = lerMarkdown(novoTexto);
      
      // Atualiza estado local do acervo imediatamente para que o card se mova na hora!
      setAcervo((prev) =>
        prev.map((a) =>
          a.caminho === item.caminho
            ? { ...a, texto: novoTexto, sha: shaNovo, doc: novoDoc, tamanho: new TextEncoder().encode(novoTexto).length }
            : a
        )
      );
      toast(`Data alterada para ${formatarBr(novaDataIso)}!`, { tipo: "sucesso" });
    } catch (err: any) {
      toast(`Erro ao alterar data: ${err?.message || err}`, { tipo: "erro" });
    }
  };

  const duplicarDocumento = async (item: CompromissoSemana) => {
    try {
      const arquivoOriginal = acervo.find((a) => a.caminho === item.caminho);
      if (!arquivoOriginal) {
        toast("Arquivo original não encontrado para duplicar.", { tipo: "erro" });
        return;
      }

      const doc = lerMarkdown(arquivoOriginal.texto);
      const tituloLimpo = item.titulo.replace(/^Meta:\s*|^Entrega:\s*|^Lembrete:\s*/i, "").trim();
      const novoTitulo = `${tituloLimpo} (Cópia)`;
      const pasta = item.caminho.includes("/") ? item.caminho.substring(0, item.caminho.lastIndexOf("/")) : "notas";
      const caminhosExistentes = acervo.map((a) => a.caminho);

      // Preserva prefixo de data no nome do arquivo se o original continha
      const nomeOriginal = item.caminho.split("/").pop() || "";
      const matchDataNome = nomeOriginal.match(/^(\d{4}-\d{2}-\d{2})-(.*)$/);
      let nomeBaseParaLivre = novoTitulo;
      if (matchDataNome) {
        nomeBaseParaLivre = `${matchDataNome[1]}-${novoTitulo}`;
      }
      const novoCaminho = nomeLivre(pasta, nomeBaseParaLivre, caminhosExistentes);

      const novosDados: Record<string, any> = {
        ...doc.dados,
        titulo: novoTitulo,
      };
      delete novosDados.id;

      // Preserva exatamente a data original da tarefa/documento
      if (item.dataIso) {
        if (item.caminho.startsWith("tarefas/")) {
          novosDados.prazo = doc.dados.prazo || item.dataIso;
          if (doc.dados.data) novosDados.data = doc.dados.data;
          if (doc.dados.data_fim) novosDados.data_fim = doc.dados.data_fim;
          if (doc.dados.data_inicio) novosDados.data_inicio = doc.dados.data_inicio;
        } else if (item.caminho.startsWith("pdi/metas/")) {
          novosDados.prazo = doc.dados.prazo || item.dataIso;
        } else if (item.caminho.startsWith("pdi/entregas/")) {
          novosDados.data = doc.dados.data || item.dataIso;
        } else if (item.caminho.startsWith("notas/")) {
          novosDados.data = doc.dados.data || item.dataIso;
          if (doc.dados.prazo) novosDados.prazo = doc.dados.prazo;
        }
      }
      if (doc.dados.criado_em || doc.dados.criado) {
        novosDados.criado_em = doc.dados.criado_em || doc.dados.criado;
      }

      const novoTexto = escreverMarkdown({ dados: novosDados, corpo: doc.corpo });
      const shaNovo = await salvarTexto(novoCaminho, novoTexto, undefined, `duplicar: ${novoTitulo}`);
      const novoDoc = lerMarkdown(novoTexto);

      // Atualiza o estado local imediatamente
      const novoItemRepo: ItemRepo = {
        caminho: novoCaminho,
        nome: novoCaminho.split("/").pop() || novoTitulo,
        sha: shaNovo,
        texto: novoTexto,
        tamanho: new TextEncoder().encode(novoTexto).length,
        doc: novoDoc,
      };
      setAcervo((prev) => [novoItemRepo, ...prev]);
      toast(`"${novoTitulo}" duplicado com sucesso!`, { tipo: "sucesso" });
    } catch (err: any) {
      toast(`Erro ao duplicar: ${err?.message || err}`, { tipo: "erro" });
    }
  };

  const excluirDocumento = async (item: CompromissoSemana) => {
    try {
      const arquivoOriginal = acervo.find((a) => a.caminho === item.caminho);
      if (!arquivoOriginal) {
        toast("Arquivo não encontrado para exclusão.", { tipo: "erro" });
        return;
      }

      // Se for lembrete inline no corpo
      if (item.id.startsWith("lembrete-") && item.id.includes("-") && item.titulo.startsWith("Lembrete: ")) {
        const titLembrete = item.titulo.replace(/^Lembrete:\s*/, "").trim();
        const regexLembrete = new RegExp(
          `\\n?\\[⏰\\s*Lembrete:\\s*${escapeRegex(titLembrete)}\\|\\s*([\\d\\s\\-\\:T]+)\\]`,
          "gi"
        );
        const novoTexto = arquivoOriginal.texto.replace(regexLembrete, "");
        const shaNovo = await salvarTexto(item.caminho, novoTexto, arquivoOriginal.sha, `remover lembrete: ${titLembrete}`);
        const novoDoc = lerMarkdown(novoTexto);
        setAcervo((prev) =>
          prev.map((a) =>
            a.caminho === item.caminho
              ? { ...a, texto: novoTexto, sha: shaNovo, doc: novoDoc, tamanho: new TextEncoder().encode(novoTexto).length }
              : a
          )
        );
        toast("Lembrete removido com sucesso!", { tipo: "sucesso" });
        return;
      }

      // Caso contrário, apaga o arquivo do repositório de forma silenciosa para evitar aviso duplicado
      await apagarItem(item.caminho, item.sha, true);
      setAcervo((prev) => prev.filter((a) => a.caminho !== item.caminho));
      toast(`"${item.titulo}" excluído com sucesso!`, { tipo: "sucesso" });
    } catch (err: any) {
      toast(`Erro ao excluir: ${err?.message || err}`, { tipo: "erro" });
    }
  };

  const hoje = new Date();
  const [diaSelecionadoMobile, setDiaSelecionadoMobile] = useState<string | "todos">("todos");

  // Dividindo os dias em dias úteis (Seg-Qui) e fim da semana (Sex-Dom) para grade ampla balanceada
  const diasLinha1 = diasDaSemana.slice(0, 4); // Seg, Ter, Qua, Qui
  const diasLinha2 = diasDaSemana.slice(4, 7); // Sex, Sáb, Dom

  return (
    <div className="space-y-5 w-full max-w-none pb-16 animate-in fade-in duration-150">
      {/* 1. Cabeçalho Minimalista da Agenda Semanal & Rascunhos */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-border/40">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Seletor de Abas: Agenda Semanal vs Rascunhos Offline */}
          <div className="flex items-center gap-1 bg-card border border-border rounded-xl p-1 shadow-2xs">
            <button
              type="button"
              onClick={() => setAbaAtiva("agenda")}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer",
                abaAtiva === "agenda"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Calendar size={13} />
              <span>Agenda da Semana</span>
            </button>

            <button
              type="button"
              onClick={() => setAbaAtiva("rascunhos")}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer",
                abaAtiva === "rascunhos"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <WifiOff size={13} />
              <span>Rascunhos Offline</span>
              {rascunhos.length > 0 && (
                <span
                  className={cn(
                    "px-1.5 py-0.2 rounded-full text-[10px] font-bold font-mono",
                    abaAtiva === "rascunhos"
                      ? "bg-primary-foreground text-primary"
                      : "bg-primary/15 text-primary"
                  )}
                >
                  {rascunhos.length}
                </span>
              )}
            </button>
          </div>

          {/* Tag Minimalista de Pendências Anteriores */}
          {abaAtiva === "agenda" && atrasadosReais.length > 0 && (
            <button
              type="button"
              onClick={() => setMostrarPendencias(!mostrarPendencias)}
              className={cn(
                "text-xs font-medium px-2.5 py-1 rounded-lg border transition-colors flex items-center gap-1.5 cursor-pointer",
                mostrarPendencias
                  ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30"
                  : "bg-secondary/40 text-muted-foreground border-border/60 hover:text-foreground"
              )}
            >
              <Clock size={12} className={mostrarPendencias ? "text-amber-500" : ""} />
              <span>
                {atrasadosReais.length} pendência{atrasadosReais.length === 1 ? "" : "s"} anterior{atrasadosReais.length === 1 ? "" : "es"}
              </span>
              {mostrarPendencias ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
          )}

          {/* Alerta sutil quando houver rascunho offline com pendência ou erro */}
          {abaAtiva === "agenda" && rascunhos.length > 0 && (
            <button
              type="button"
              onClick={() => setAbaAtiva("rascunhos")}
              className="text-xs font-medium px-2.5 py-1 rounded-lg border border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw size={12} className="animate-spin" />
              <span>{rascunhos.length} rascunho(s) para sincronizar</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {abaAtiva === "agenda" ? (
            <>
              {/* Navegação Semanal Clara */}
              <div className="flex items-center gap-1 bg-card border border-border rounded-xl p-1 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setDataReferencia((d) => subWeeks(d, 1))}
                  className="px-2 py-1 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer flex items-center gap-1"
                  title="Semana anterior"
                >
                  <ChevronLeft size={14} />
                  <span className="hidden sm:inline">Anterior</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDataReferencia(new Date())}
                  className={cn(
                    "px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer",
                    isSameDay(inicioSemana, startOfWeek(hoje, { weekStartsOn: 1 }))
                      ? "bg-secondary text-foreground font-bold"
                      : "text-primary hover:bg-primary/10"
                  )}
                  title="Ir para a semana atual"
                >
                  Semana Atual
                </button>

                <button
                  type="button"
                  onClick={() => setDataReferencia((d) => addWeeks(d, 1))}
                  className="px-2 py-1 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer flex items-center gap-1"
                  title="Próxima semana"
                >
                  <span className="hidden sm:inline">Próxima</span>
                  <ChevronRight size={14} />
                </button>
              </div>

              {/* Botão + Novo Lembrete */}
              <Button
                size="sm"
                onClick={abrirNovoLembrete}
                className="text-xs font-semibold h-8 rounded-xl gap-1.5 shadow-2xs cursor-pointer"
              >
                <Plus size={13} />
                <span>Novo Lembrete</span>
              </Button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={aoLimparTodosRascunhos}
                disabled={rascunhos.length === 0}
                className="text-xs h-8 rounded-xl gap-1.5 cursor-pointer text-muted-foreground hover:text-destructive"
              >
                <Trash2 size={13} />
                <span>Limpar Fila</span>
              </Button>

              <Button
                size="sm"
                onClick={aoSincronizarFila}
                disabled={sincronizandoTudo || rascunhos.length === 0}
                className="text-xs font-semibold h-8 rounded-xl gap-1.5 cursor-pointer shadow-2xs"
              >
                <RotateCcw size={13} className={sincronizandoTudo ? "animate-spin" : ""} />
                <span>{sincronizandoTudo ? "Sincronizando..." : "Sincronizar Tudo"}</span>
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* 2. Gaveta Minimalista de Pendências Anteriores (Expansível sob demanda) */}
      {abaAtiva === "agenda" && mostrarPendencias && atrasadosReais.length > 0 && (
        <div className="p-3.5 rounded-xl border border-border/70 bg-secondary/15 space-y-2 animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold">
            <span>Compromissos pendentes com data anterior a hoje:</span>
            <button
              type="button"
              onClick={() => setMostrarPendencias(false)}
              className="text-[11px] hover:text-foreground cursor-pointer"
            >
              Ocultar
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {atrasadosReais.map((c) => {
              const estilo = ESTILOS_TIPO[c.tipo] || ESTILOS_TIPO.lembrete;
              return (
                <div
                  key={c.id}
                  draggable={true}
                  onDragStart={(e) => {
                    itemArrastandoRef.current = c;
                    setItemArrastando(c);
                    e.dataTransfer.setData("text/plain", c.id);
                    e.dataTransfer.effectAllowed = "move";
                  }}
                  onDragEnd={() => {
                    itemArrastandoRef.current = null;
                    setItemArrastando(null);
                    setDiaSobHover(null);
                  }}
                  onClick={() => abrirDocumento(c)}
                  className={cn(
                    "p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2 text-xs shadow-2xs select-none",
                    estilo.bg,
                    estilo.border,
                    itemArrastando?.id === c.id && "opacity-30 scale-95 ring-2 ring-primary border-primary"
                  )}
                >
                  <div className="min-w-0 flex-1 cursor-grab active:cursor-grabbing">
                    <p className="font-semibold text-foreground truncate">{c.titulo}</p>
                    <p className="text-[10px] text-muted-foreground">Prazo: {c.dataBr}</p>
                  </div>
                  <MenuAcoesCompromisso
                    onEditar={() => abrirDocumento(c)}
                    onDuplicar={() => duplicarDocumento(c)}
                    onExcluir={() => setItemParaExcluir(c)}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. ABA 1: Conteúdo da Agenda Semanal em Grade Ampla Balanceada */}
      {abaAtiva === "agenda" && (
        carregando ? (
          <Carregando texto="Carregando compromissos..." />
        ) : (
          <div className="space-y-3.5">
            {/* Seletor de Dias em Pílulas / Carrossel no Mobile */}
            <div className="flex sm:hidden items-center gap-1.5 p-1 bg-card rounded-2xl border border-border/80 shadow-2xs overflow-x-auto select-none snap-x snap-mandatory">
              <button
                type="button"
                onClick={() => setDiaSelecionadoMobile("todos")}
                className={cn(
                  "py-1.5 px-3 text-xs font-semibold rounded-xl transition-all whitespace-nowrap shrink-0 snap-start cursor-pointer",
                  diaSelecionadoMobile === "todos"
                    ? "bg-primary text-primary-foreground font-bold shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Todos ({todosCompromissos.length})
              </button>

              {diasDaSemana.map((dia) => {
                const diaIso = format(dia, "yyyy-MM-dd");
                const diaAbrev = format(dia, "EEE", { locale: ptBR });
                const diaNum = format(dia, "d");
                const ehHoje = isSameDay(dia, hoje);
                const qtd = todosCompromissos.filter((c) => c.dataIso === diaIso).length;
                const ativo = diaSelecionadoMobile === diaIso;

                return (
                  <button
                    key={diaIso}
                    type="button"
                    onClick={() => setDiaSelecionadoMobile(diaIso)}
                    className={cn(
                      "py-1.5 px-2.5 text-xs font-semibold rounded-xl transition-all whitespace-nowrap shrink-0 flex items-center gap-1.5 snap-start cursor-pointer",
                      ativo
                        ? "bg-primary text-primary-foreground font-bold shadow-xs"
                        : ehHoje
                        ? "bg-primary/10 text-primary border border-primary/30"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <span className="capitalize">{diaAbrev}</span>
                    <span className="font-bold">{diaNum}</span>
                    {qtd > 0 && (
                      <span
                        className={cn(
                          "text-[10px] px-1.5 py-0.2 rounded-full",
                          ativo
                            ? "bg-primary-foreground/20 text-primary-foreground"
                            : "bg-secondary text-foreground"
                        )}
                      >
                        {qtd}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Linha 1: Segunda, Terça, Quarta, Quinta (4 Colunas Largas) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {diasLinha1.map((dia) => {
                const diaIso = format(dia, "yyyy-MM-dd");
                const diaNome = format(dia, "EEEE", { locale: ptBR });
                const diaFormatadoBr = format(dia, "dd/MM/yyyy");
                const ehHoje = isSameDay(dia, hoje);

                const ocultarNoMobile = diaSelecionadoMobile !== "todos" && diaSelecionadoMobile !== diaIso;
                if (ocultarNoMobile) return null;

                const itensDoDia = todosCompromissos.filter((c) => c.dataIso === diaIso);
                const estaSobHover = diaSobHover === diaIso;

                return (
                  <div
                    key={diaIso}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = "move";
                      if (diaSobHover !== diaIso) {
                        setDiaSobHover(diaIso);
                      }
                    }}
                    onDragEnter={(e) => {
                      e.preventDefault();
                      if (diaSobHover !== diaIso) {
                        setDiaSobHover(diaIso);
                      }
                    }}
                    onDragLeave={(e) => {
                      if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                      if (diaSobHover === diaIso) {
                        setDiaSobHover(null);
                      }
                    }}
                    onDrop={async (e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setDiaSobHover(null);
                      const itemId = e.dataTransfer.getData("text/plain");
                      const item = itemArrastandoRef.current || todosCompromissos.find((x) => x.id === itemId);
                      itemArrastandoRef.current = null;
                      setItemArrastando(null);
                      if (item && item.dataIso !== diaIso) {
                        await mudarDataDocumento(item, diaIso);
                      }
                    }}
                    className={cn(
                      "flex flex-col rounded-2xl border transition-all duration-150 overflow-hidden min-h-[260px]",
                      ehHoje
                        ? "bg-card border-primary/50 shadow-md ring-1 ring-primary/20"
                        : "bg-card/70 border-border/70",
                      estaSobHover && "ring-2 ring-primary border-primary bg-primary/5 shadow-md"
                    )}
                  >
                    {/* Topo do Dia */}
                    <div
                      className={cn(
                        "p-3 border-b text-xs flex items-center justify-between",
                        ehHoje
                          ? "bg-primary/10 border-primary/25 text-primary font-bold"
                          : "bg-secondary/20 border-border/40 text-foreground font-semibold"
                      )}
                    >
                      <span className="capitalize">{diaNome}</span>
                      <span className="font-mono text-[11px] text-muted-foreground">
                        {diaFormatadoBr}
                      </span>
                    </div>

                    {/* Lista de Compromissos do Dia */}
                    <div className="p-2.5 space-y-2 flex-1 overflow-y-auto">
                      {itensDoDia.length === 0 ? (
                        <p className="text-[11px] text-muted-foreground/40 text-center py-6">
                          Livre
                        </p>
                      ) : (
                        itensDoDia.map((c) => {
                          const estilo = ESTILOS_TIPO[c.tipo] || ESTILOS_TIPO.lembrete;
                          const Icone =
                            c.tipo === "tarefa"
                              ? CheckSquare
                              : c.tipo === "meta"
                              ? Target
                              : c.tipo === "entrega"
                              ? Sparkles
                              : c.tipo === "nota"
                              ? FileText
                              : Bell;

                          return (
                            <div
                              key={c.id}
                              draggable={true}
                              onDragStart={(e) => {
                                itemArrastandoRef.current = c;
                                setItemArrastando(c);
                                e.dataTransfer.setData("text/plain", c.id);
                                e.dataTransfer.effectAllowed = "move";
                              }}
                              onDragEnd={() => {
                                itemArrastandoRef.current = null;
                                setItemArrastando(null);
                                setDiaSobHover(null);
                              }}
                              onClick={() => abrirDocumento(c)}
                              className={cn(
                                "group p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2.5 shadow-2xs text-xs select-none",
                                estilo.bg,
                                estilo.border,
                                c.concluido && "opacity-60 hover:opacity-100",
                                itemArrastando?.id === c.id && "opacity-30 scale-95 ring-2 ring-primary border-primary",
                                itemArrastando && itemArrastando.id !== c.id && "pointer-events-none"
                              )}
                            >
                              <div className="flex items-center gap-2 min-w-0 flex-1 cursor-grab active:cursor-grabbing">
                                {c.tipo === "tarefa" ? (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      alternarConclusaoTarefa(c);
                                    }}
                                    className={cn(
                                      "h-4 w-4 rounded border flex items-center justify-center transition-colors cursor-pointer shrink-0",
                                      c.concluido
                                        ? "bg-primary border-primary text-primary-foreground"
                                        : "border-border hover:border-foreground bg-card"
                                    )}
                                  >
                                    {c.concluido && <Check size={10} strokeWidth={3} />}
                                  </button>
                                ) : (
                                  <Icone size={13} className={cn("shrink-0", estilo.text)} />
                                )}

                                <div className="min-w-0 flex-1">
                                  <p
                                    className={cn(
                                      "font-semibold text-foreground truncate group-hover:text-primary transition-colors",
                                      c.concluido && "line-through opacity-50"
                                    )}
                                  >
                                    {c.titulo}
                                  </p>
                                  <span className="text-[10px] text-muted-foreground">
                                    {c.hora ? c.hora : c.dataBr}
                                  </span>
                                </div>
                              </div>

                              <MenuAcoesCompromisso
                                onEditar={() => abrirDocumento(c)}
                                onDuplicar={() => duplicarDocumento(c)}
                                onExcluir={() => setItemParaExcluir(c)}
                              />
                            </div>
                          );
                        })
                      )}
                      {estaSobHover && (
                        <div className="rounded-xl border-2 border-dashed border-primary/50 bg-primary/10 p-2 text-center text-[11px] font-semibold text-primary animate-pulse select-none">
                          Solte aqui para mover para {diaNome}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Linha 2: Sexta, Sábado, Domingo + Painel de Visão Geral (4 Colunas) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {diasLinha2.map((dia) => {
                const diaIso = format(dia, "yyyy-MM-dd");
                const diaNome = format(dia, "EEEE", { locale: ptBR });
                const diaFormatadoBr = format(dia, "dd/MM/yyyy");
                const ehHoje = isSameDay(dia, hoje);

                const ocultarNoMobile = diaSelecionadoMobile !== "todos" && diaSelecionadoMobile !== diaIso;
                if (ocultarNoMobile) return null;

                const itensDoDia = todosCompromissos.filter((c) => c.dataIso === diaIso);
                const estaSobHover = diaSobHover === diaIso;

                return (
                  <div
                    key={diaIso}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = "move";
                      if (diaSobHover !== diaIso) {
                        setDiaSobHover(diaIso);
                      }
                    }}
                    onDragEnter={(e) => {
                      e.preventDefault();
                      if (diaSobHover !== diaIso) {
                        setDiaSobHover(diaIso);
                      }
                    }}
                    onDragLeave={(e) => {
                      if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                      if (diaSobHover === diaIso) {
                        setDiaSobHover(null);
                      }
                    }}
                    onDrop={async (e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setDiaSobHover(null);
                      const itemId = e.dataTransfer.getData("text/plain");
                      const item = itemArrastandoRef.current || todosCompromissos.find((x) => x.id === itemId);
                      itemArrastandoRef.current = null;
                      setItemArrastando(null);
                      if (item && item.dataIso !== diaIso) {
                        await mudarDataDocumento(item, diaIso);
                      }
                    }}
                    className={cn(
                      "flex flex-col rounded-2xl border transition-all duration-150 overflow-hidden min-h-[260px]",
                      ehHoje
                        ? "bg-card border-primary/50 shadow-md ring-1 ring-primary/20"
                        : "bg-card/70 border-border/70",
                      estaSobHover && "ring-2 ring-primary border-primary bg-primary/5 shadow-md"
                    )}
                  >
                    {/* Topo do Dia */}
                    <div
                      className={cn(
                        "p-3 border-b text-xs flex items-center justify-between",
                        ehHoje
                          ? "bg-primary/10 border-primary/25 text-primary font-bold"
                          : "bg-secondary/20 border-border/40 text-foreground font-semibold"
                      )}
                    >
                      <span className="capitalize">{diaNome}</span>
                      <span className="font-mono text-[11px] text-muted-foreground">
                        {diaFormatadoBr}
                      </span>
                    </div>

                    {/* Lista de Compromissos */}
                    <div className="p-2.5 space-y-2 flex-1 overflow-y-auto">
                      {itensDoDia.length === 0 ? (
                        <p className="text-[11px] text-muted-foreground/40 text-center py-6">
                          Livre
                        </p>
                      ) : (
                        itensDoDia.map((c) => {
                          const estilo = ESTILOS_TIPO[c.tipo] || ESTILOS_TIPO.lembrete;
                          const Icone =
                            c.tipo === "tarefa"
                              ? CheckSquare
                              : c.tipo === "meta"
                              ? Target
                              : c.tipo === "entrega"
                              ? Sparkles
                              : c.tipo === "nota"
                              ? FileText
                              : Bell;

                          return (
                            <div
                              key={c.id}
                              draggable={true}
                              onDragStart={(e) => {
                                itemArrastandoRef.current = c;
                                setItemArrastando(c);
                                e.dataTransfer.setData("text/plain", c.id);
                                e.dataTransfer.effectAllowed = "move";
                              }}
                              onDragEnd={() => {
                                itemArrastandoRef.current = null;
                                setItemArrastando(null);
                                setDiaSobHover(null);
                              }}
                              onClick={() => abrirDocumento(c)}
                              className={cn(
                                "group p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2.5 shadow-2xs text-xs select-none",
                                estilo.bg,
                                estilo.border,
                                c.concluido && "opacity-60 hover:opacity-100",
                                itemArrastando?.id === c.id && "opacity-30 scale-95 ring-2 ring-primary border-primary",
                                itemArrastando && itemArrastando.id !== c.id && "pointer-events-none"
                              )}
                            >
                              <div className="flex items-center gap-2 min-w-0 flex-1 cursor-grab active:cursor-grabbing">
                                {c.tipo === "tarefa" ? (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      alternarConclusaoTarefa(c);
                                    }}
                                    className={cn(
                                      "h-4 w-4 rounded border flex items-center justify-center transition-colors cursor-pointer shrink-0",
                                      c.concluido
                                        ? "bg-primary border-primary text-primary-foreground"
                                        : "border-border hover:border-foreground bg-card"
                                    )}
                                  >
                                    {c.concluido && <Check size={10} strokeWidth={3} />}
                                  </button>
                                ) : (
                                  <Icone size={13} className={cn("shrink-0", estilo.text)} />
                                )}

                                <div className="min-w-0 flex-1">
                                  <p
                                    className={cn(
                                      "font-semibold text-foreground truncate group-hover:text-primary transition-colors",
                                      c.concluido && "line-through opacity-50"
                                    )}
                                  >
                                    {c.titulo}
                                  </p>
                                  <span className="text-[10px] text-muted-foreground">
                                    {c.hora ? c.hora : c.dataBr}
                                  </span>
                                </div>
                              </div>

                              <MenuAcoesCompromisso
                                onEditar={() => abrirDocumento(c)}
                                onDuplicar={() => duplicarDocumento(c)}
                                onExcluir={() => setItemParaExcluir(c)}
                              />
                            </div>
                          );
                        })
                      )}
                      {estaSobHover && (
                        <div className="rounded-xl border-2 border-dashed border-primary/50 bg-primary/10 p-2 text-center text-[11px] font-semibold text-primary animate-pulse select-none">
                          Solte aqui para mover para {diaNome}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* 4ª Coluna da Linha 2: Resumo Rápido da Semana */}
              <div
                className={cn(
                  "flex flex-col rounded-2xl border border-dashed border-border/80 bg-secondary/10 p-4 justify-between min-h-[260px]",
                  diaSelecionadoMobile !== "todos" && "hidden sm:flex"
                )}
              >
                <div className="space-y-2">
                  <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Sparkles size={13} className="text-primary" />
                    <span>Resumo da Semana</span>
                  </span>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Todos os seus compromissos, entregas e tarefas da semana permanecem sincronizados aqui.
                  </p>
                </div>

                <div className="space-y-1.5 pt-2 border-t border-border/40 text-xs">
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>Total de eventos:</span>
                    <span className="font-semibold font-mono text-foreground">
                      {todosCompromissos.filter((c) => {
                        const dIni = format(inicioSemana, "yyyy-MM-dd");
                        const dFim = format(fimSemana, "yyyy-MM-dd");
                        return c.tipo !== "lembrete" && c.dataIso >= dIni && c.dataIso <= dFim;
                      }).length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>Pendências anteriores:</span>
                    <span className="font-semibold font-mono text-foreground">
                      {atrasadosReais.length}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      )}

      {/* 4. ABA 2: Rascunhos Offline & Fila de Sincronização */}
      {abaAtiva === "rascunhos" && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl border border-border/70 bg-card/60 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <WifiOff size={16} className="text-primary" />
                  <span>Fila de Rascunhos e Sincronização Local</span>
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Arquivos criados ou editados no dispositivo que aguardam envio ao repositório GitHub.
                </p>
              </div>
            </div>

            {rascunhos.length === 0 ? (
              <div className="text-center py-12 space-y-2">
                <div className="h-10 w-10 rounded-full bg-emerald-500/10 text-emerald-500 mx-auto flex items-center justify-center">
                  <Check size={20} strokeWidth={3} />
                </div>
                <p className="text-xs font-bold text-foreground">Tudo sincronizado!</p>
                <p className="text-[11px] text-muted-foreground max-w-sm mx-auto">
                  Não há rascunhos pendentes. Suas alterações mais recentes foram gravadas com sucesso no GitHub.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border/40">
                {rascunhos.map((r) => {
                  const nomeDoc = formatarNomeAmigavel(r.caminho);
                  const dataCriacaoBr = r.criadoEm
                    ? new Date(r.criadoEm).toLocaleString("pt-BR")
                    : "Data desconhecida";

                  const ehConflito = r.status === "conflito";
                  const ehErro = r.status === "erro";
                  const ehSincronizando = r.status === "sincronizando";

                  return (
                    <div
                      key={r.id}
                      className="py-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-xs text-foreground">{nomeDoc}</span>
                          <span className="text-[10px] font-mono text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">
                            {r.caminho}
                          </span>
                          <Badge
                            variant={
                              ehConflito
                                ? "destructive"
                                : ehErro
                                ? "destructive"
                                : ehSincronizando
                                ? "default"
                                : "outline"
                            }
                            className="text-[9px] h-4 uppercase px-1.5"
                          >
                            {ehSincronizando
                              ? "Sincronizando..."
                              : ehConflito
                              ? "Conflito 409"
                              : ehErro
                              ? "Erro"
                              : "Pendente"}
                          </Badge>
                        </div>

                        <p className="text-[11px] text-muted-foreground">
                          Salvo em: {dataCriacaoBr} • Ação: {r.acao === "apagar" ? "Exclusão" : "Gravação"}
                        </p>

                        {r.ultimoErro && (
                          <div className="p-2 rounded-lg bg-destructive/10 border border-destructive/20 text-[11px] text-destructive flex items-start gap-1.5 mt-1">
                            <AlertTriangle size={13} className="shrink-0 mt-0.5" />
                            <span>{r.ultimoErro}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {ehConflito && (
                          <Button
                            size="sm"
                            onClick={() => aoResolverConflito(r.id)}
                            className="text-xs h-7 px-2.5 rounded-lg font-semibold gap-1 bg-amber-600 hover:bg-amber-700 text-white cursor-pointer"
                          >
                            <RefreshCw size={11} />
                            <span>Resolver & Gravar</span>
                          </Button>
                        )}

                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => abrirRascunhoNoNotion(r)}
                          className="text-xs h-7 px-2.5 rounded-lg gap-1 cursor-pointer"
                        >
                          <ExternalLink size={11} />
                          <span>Ver</span>
                        </Button>

                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => aoDescartarRascunho(r.id)}
                          className="text-xs h-7 px-2 rounded-lg text-muted-foreground hover:text-destructive cursor-pointer"
                          title="Descartar rascunho local"
                        >
                          <Trash2 size={13} />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5. Painel Notion Padrão para Visualizar, Criar e Editar Lembretes / Documentos */}
      {itemAberto && (
        <PainelNotionBase
          rotuloTipo={itemAberto.tipo.toUpperCase()}
          modoVisao={modoVisaoNotion}
          setModoVisao={setModoVisaoNotion}
          titulo={tituloEditor}
          setTitulo={(t) => {
            setTituloEditor(t);
            setTemMudancasItem(true);
          }}
          corpo={corpoEditor}
          setCorpo={(c) => {
            setCorpoEditor(c);
            setTemMudancasItem(true);
          }}
          dadosProps={dadosPropsEditor}
          onChangeProps={(novos) => {
            setDadosPropsEditor(novos);
            setTemMudancasItem(true);
          }}
          caminhoItem={itemAberto.caminho}
          salvando={salvandoItem}
          temMudancas={temMudancasItem}
          aoSalvar={salvarEdicaoItem}
          aoRemover={
            itemAberto.caminho
              ? async () => {
                  await apagarItem(itemAberto.caminho, itemAberto.sha);
                  setItemAberto(null);
                  toast("Lembrete removido com sucesso!");
                  window.dispatchEvent(new CustomEvent("acervo-atualizado"));
                  carregar();
                }
              : undefined
          }
          aoFechar={() => setItemAberto(null)}
        />
      )}

      {/* Modal de Confirmação de Exclusão de Documento */}
      <ModalConfirmacao
        aberto={Boolean(itemParaExcluir)}
        aoCancelar={() => setItemParaExcluir(null)}
        aoConfirmar={async () => {
          if (itemParaExcluir) {
            const item = itemParaExcluir;
            setItemParaExcluir(null);
            await excluirDocumento(item);
          }
        }}
        titulo="Excluir documento"
        descricao={`Tem certeza que deseja excluir "${itemParaExcluir?.titulo}"? Esta ação removerá o arquivo permanentemente.`}
        textoConfirmar="Excluir"
        varianteConfirmar="perigo"
      />
    </div>
  );
}
