import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Plus,
  Tag,
  FileText,
  FolderOpen,
  FolderPlus,
  ChevronRight,
  Settings2,
  Trash2,
  X,
} from "lucide-react";
import {
  obterTodosModelos,
  obterModeloPadrao,
  type TemplateItem,
} from "@/lib/templates";
import { lerConfig, configCompleta } from "@/lib/settings";
import { useItemRepo } from "@/lib/useItemRepo";
import { useSalvar } from "@/lib/useSalvar";
import { PASTAS } from "@/lib/tipos";
import { comoNota, notaParaArquivo, dataDoNome } from "@/lib/entidades";
import { montarIndice, mencoesA, alvosUnicos } from "@/lib/links";
import {
  escreverMarkdown,
  tituloProvavel,
  nomeLivre,
  type Frontmatter,
} from "@/lib/markdown";
import { lerParametroAbrir, lerParametroCriar, correspondeBusca, formatarNomeAmigavel } from "@/lib/utils";
import {
  Botao,
  Aviso,
  Vazio,
  Carregando,
  ModalConfirmacao,
} from "@/components/ui";
import { CabecalhoPagina } from "@/components/CabecalhoPagina";
import { BarraFerramentas } from "@/components/BarraFerramentas";
import { CartaoItem } from "@/components/CartaoItem";
import { TagChip } from "@/components/TagChip";
import { PainelNotionBase, type ModoVisaoNotion } from "@/components/PainelNotionBase";
import { useItemFlutuante } from "@/components/ItemFlutuanteContext";
import { ModalGerenciarModelos } from "@/components/ModalGerenciarModelos";
import { MenuContextoNotas, type AcaoMenuContexto } from "@/components/MenuContextoNotas";
import { toast } from "@/lib/toast";
import type { Nota } from "@/lib/tipos";

type NotaAberta = Nota & {
  original: { titulo: string; corpo: string; bruto?: Frontmatter };
};

type FiltroData = "qualquer" | "hoje" | "7dias" | "mes";

export default function Notas() {
  const cfg = lerConfig();
  const pronto = configCompleta(cfg);
  const location = useLocation();
  const navegar = useNavigate();
  const { abrirFlutuante, focarFlutuante } = useItemFlutuante();

  const { itens: arquivos, acervo, titulos, carregando, erro: erroCarregar, ilegiveis, recarregar } =
    useItemRepo(cfg, PASTAS.notas, (item) =>
      comoNota(item.doc, item.caminho, item.sha, tituloProvavel(item.doc, item.nome)),
    );

  const { salvarTexto, apagarItem, salvando, erro: erroSalvar, limparErro } = useSalvar(cfg);
  const erro = erroCarregar || erroSalvar;

  const [busca, setBusca] = useState("");
  const [modoVisao, setModoVisao] = useState<ModoVisaoNotion>(() => {
    const salvo = localStorage.getItem('klaus_modo_visao_notas');
    return (salvo as ModoVisaoNotion) || 'popup';
  });
  useEffect(() => {
    localStorage.setItem('klaus_modo_visao_notas', modoVisao);
  }, [modoVisao]);

  const [aberta, setAberta] = useState<NotaAberta | null>(null);

  const [pastaAtual, setPastaAtual] = useState("");
  const [pastasCriadas, setPastasCriadas] = useState<string[]>([]);

  const [selecionadas, setSelecionadas] = useState<Set<string>>(new Set());
  const [marquee, setMarquee] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [arrastando, setArrastando] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);
  const inicioArrastoRef = useRef<{ x: number; y: number } | null>(null);
  const cartoesRef = useRef<Map<string, DOMRect>>(new Map());

  const [menuContexto, setMenuContexto] = useState<{
    x: number;
    y: number;
    emCartao: boolean;
  } | null>(null);

  // Drag and drop: nota arrastada sobre pasta
  const [notaArrastada, setNotaArrastada] = useState<string | null>(null);
  const [pastaAlvo, setPastaAlvo] = useState<string | null>(null);

  const [tagsFiltro, setTagsFiltro] = useState<string[]>([]);
  const [filtroData, setFiltroData] = useState<FiltroData>("qualquer");

  const [modalModelosAberto, setModalModelosAberto] = useState(false);
  const [modelos, setModelos] = useState<TemplateItem[]>(obterTodosModelos());
  const [modeloPadrao, setModeloPadrao] = useState<TemplateItem | undefined>(obterModeloPadrao());

  const indice = useMemo(() => montarIndice(acervo), [acervo]);
  const opcoesRelacionamento = useMemo(() =>
    alvosUnicos(indice)
      .map(a => ({ titulo: a.titulo, caminho: a.caminho }))
      .sort((a, b) => a.titulo.localeCompare(b.titulo)),
    [indice],
  );
  const mencoesNotaAberta = useMemo(() => {
    if (!aberta?.caminho) return [];
    return mencoesA(aberta.caminho, acervo, indice);
  }, [aberta?.caminho, acervo, indice]);

  // Todas as notas de notas/ incluindo subpastas
  const todasNotas = useMemo(() => {
    const prefixo = `${PASTAS.notas}/`;
    return acervo
      .filter((i) => i.caminho.startsWith(prefixo))
      .map((item) =>
        comoNota(item.doc, item.caminho, item.sha, tituloProvavel(item.doc, item.nome)),
      );
  }, [acervo]);

  const processouUrlRef = useRef<string | null>(null);
  useEffect(() => {
    const urlAtual = `${location.pathname}${location.search}${location.hash}`;
    if (processouUrlRef.current === urlAtual) return;

    if (lerParametroCriar(location, ["nova", "novo"])) {
      processouUrlRef.current = urlAtual;
      const caminhoNovo = nomeLivre(pastaAtual ? `${PASTAS.notas}/${pastaAtual}` : PASTAS.notas, "Nova Nota", todasNotas.map((a) => a.caminho));
      const n = comoNota({ dados: { titulo: "Nova Nota", tipo: "nota" }, corpo: "" }, caminhoNovo, "", "Nova Nota");
      setAberta({ ...n, original: { titulo: n.titulo, corpo: n.corpo, bruto: n.bruto } });
      return;
    }

    const abrirCaminho = lerParametroAbrir(location);
    if (!abrirCaminho) return;
    if (acervo.length > 0) {
      if (focarFlutuante(abrirCaminho)) return;
      const alvo = acervo.find((a) => a.caminho === abrirCaminho);
      if (alvo) {
        processouUrlRef.current = urlAtual;
        const nota = comoNota(alvo.doc, alvo.caminho, alvo.sha, tituloProvavel(alvo.doc, alvo.nome));
        setAberta({ ...nota, original: { titulo: nota.titulo, corpo: nota.corpo, bruto: nota.bruto } });
      }
    }
  }, [location.pathname, location.search, location.hash, acervo.length > 0, pastaAtual, todasNotas]);

  const mudou = aberta
    ? aberta.titulo !== aberta.original.titulo ||
    aberta.corpo !== aberta.original.corpo ||
    JSON.stringify(aberta.bruto) !== JSON.stringify(aberta.original.bruto)
    : false;

  const mudouRef = useRef(mudou);
  mudouRef.current = mudou;

  const [mostrarConfirmacaoDescarte, setMostrarConfirmacaoDescarte] = useState(false);

  useEffect(() => {
    if (!aberta) return;
    history.pushState({ editor: true }, "");
    const aoVoltar = () => {
      if (mudouRef.current) {
        setMostrarConfirmacaoDescarte(true);
        history.pushState({ editor: true }, "");
        return;
      }
      fecharNota();
    };
    addEventListener("popstate", aoVoltar);
    return () => removeEventListener("popstate", aoVoltar);
  }, [aberta !== null]);

  useEffect(() => {
    if (!mudou) return;
    const aoSair = (e: BeforeUnloadEvent) => e.preventDefault();
    addEventListener("beforeunload", aoSair);
    return () => removeEventListener("beforeunload", aoSair);
  }, [mudou]);

  useEffect(() => {
    if (modoVisao === "flutuante" && aberta) {
      const notaOriginal = { ...aberta };
      abrirFlutuante({
        id: notaOriginal.caminho,
        rotuloTipo: notaOriginal.caminho ? "Nota" : "Nova nota",
        titulo: notaOriginal.titulo,
        corpo: notaOriginal.corpo,
        dadosProps: notaOriginal.bruto,
        camposFixosProps: {
          tipo: { icone: <FileText className="h-4 w-4 opacity-50 text-orange-500" />, tipo: "select", opcoes: ["nota", "referencia", "rascunho"] },
          tags: { icone: <Tag className="h-4 w-4 opacity-50 text-amber-500" />, tipo: "multiselect" },
        },
        caminho: notaOriginal.caminho,
        sha: notaOriginal.sha,
        temMudancas: mudou,
        salvando,
        erro,
        mencoes: mencoesNotaAberta,
        opcoesRelacionamento,
        aoSalvar: async (itemFlutuanteAtual) => {
          const titulo = itemFlutuanteAtual.titulo.trim() || "Sem título";
          const notaAtualizada: Nota = {
            caminho: itemFlutuanteAtual.caminho,
            sha: itemFlutuanteAtual.sha,
            bruto: itemFlutuanteAtual.dadosProps || {},
            titulo,
            tipo: (itemFlutuanteAtual.dadosProps.tipo as any) || "nota",
            tags: itemFlutuanteAtual.dadosProps.tags || [],
            corpo: itemFlutuanteAtual.corpo,
          };
          const { dados, corpo } = notaParaArquivo(notaAtualizada);
          const texto = escreverMarkdown({ dados, corpo });
          const caminho = itemFlutuanteAtual.caminho || nomeLivre(pastaAtual ? `${PASTAS.notas}/${pastaAtual}` : PASTAS.notas, titulo, todasNotas.map((a) => a.caminho));
          await salvarTexto(caminho, texto, itemFlutuanteAtual.sha || undefined);
          recarregar();
        },
        aoRemover: notaOriginal.caminho ? async () => {
          await apagarItem(notaOriginal.caminho, notaOriginal.sha);
          recarregar();
        } : undefined,
      });
      setAberta(null);
      setModoVisao("popup");
    }
  }, [modoVisao, aberta]);

  function fecharNota() {
    setAberta(null);
    limparErro();
    navegar(location.pathname, { replace: true });
  }

  const { fecharFlutuante, estaAbertoFlutuante } = useItemFlutuante();

  function abrir(nota: Nota) {
    if (estaAbertoFlutuante(nota.caminho)) {
      fecharFlutuante();
    }
    if (aberta && aberta.caminho !== nota.caminho && mudou) {
      salvar(aberta).catch((err) => {
        toast(`Erro ao salvar alterações da nota anterior: ${err?.message || "Falha na gravação"}`, { tipo: "erro" });
      });
    }
    setAberta({ ...nota, original: { titulo: nota.titulo, corpo: nota.corpo, bruto: nota.bruto } });
    window.history.replaceState(null, "", `?abrir=${encodeURIComponent(nota.caminho)}`);
  }

  function nova(template?: TemplateItem) {
    const notaVazia: NotaAberta = {
      bruto: template ? { ...template.frontmatter } : {},
      caminho: "",
      sha: "",
      titulo: template ? template.titulo : "",
      tipo: (template?.frontmatter?.tipo as any) || "nota",
      tags: template?.frontmatter?.tags || [],
      corpo: template ? template.corpoPadrao : "",
      original: { titulo: "", corpo: "", bruto: {} },
    };
    setAberta(notaVazia);
  }

  function novaComPadrao() {
    nova(modeloPadrao);
  }

  // Ao criar a partir de uma pasta, o caminho já nasce definido. Isso evita
  // depender de `pastaAtual` quando o painel for fechado e salvo.
  function novaNaPasta(pasta: string, template?: TemplateItem) {
    const titulo = template?.titulo || "Nova Nota";
    const caminho = nomeLivre(
      `${PASTAS.notas}/${pasta}`,
      titulo,
      todasNotas.map((a) => a.caminho),
    );
    const notaVazia: NotaAberta = {
      bruto: template ? { ...template.frontmatter } : {},
      caminho,
      sha: "",
      titulo,
      tipo: (template?.frontmatter?.tipo as any) || "nota",
      tags: template?.frontmatter?.tags || [],
      corpo: template?.corpoPadrao || "",
      original: { titulo: "", corpo: "", bruto: {} },
    };
    setAberta(notaVazia);
  }

  async function salvar(alvo?: NotaAberta) {
    const n = alvo || aberta;
    if (!n) return;
    const titulo = n.titulo.trim() || "Sem título";
    const notaAtualizada: Nota = { ...n, titulo };
    const { dados, corpo } = notaParaArquivo(notaAtualizada);
    const texto = escreverMarkdown({ dados, corpo });
    const caminho = n.caminho || nomeLivre(pastaAtual ? `${PASTAS.notas}/${pastaAtual}` : PASTAS.notas, titulo, todasNotas.map((a) => a.caminho));

    const novaSha = await salvarTexto(caminho, texto, n.sha || undefined);

    setAberta((atual) => {
      if (!atual || (atual.caminho !== caminho && atual.caminho !== "")) return atual;
      return { ...atual, caminho, sha: novaSha, titulo, original: { titulo, corpo, bruto: dados } };
    });

    recarregar();
  }

  async function remover() {
    if (!aberta?.caminho) return;
    await apagarItem(aberta.caminho, aberta.sha);
    fecharNota();
    recarregar();
  }

  function alternarSelecao(caminho: string) {
    setSelecionadas((atual) => {
      const novo = new Set(atual);
      if (novo.has(caminho)) novo.delete(caminho);
      else novo.add(caminho);
      return novo;
    });
  }

  function limparSelecao() {
    setSelecionadas(new Set());
  }

  function iniciarArrasto(e: React.MouseEvent) {
    if (e.button !== 0) return;
    if (e.target instanceof HTMLElement && e.target.closest("button, a, input, select, textarea")) return;
    if (e.target instanceof HTMLElement && e.target.closest("[data-cartao]")) return;

    const rect = gridRef.current?.getBoundingClientRect();
    if (!rect) return;

    inicioArrastoRef.current = { x: e.clientX, y: e.clientY };
    setArrastando(true);
    setMarquee({ x: e.clientX - rect.left, y: e.clientY - rect.top, w: 0, h: 0 });
  }

  useEffect(() => {
    if (!arrastando) return;

    const aoMover = (e: MouseEvent) => {
      const inicio = inicioArrastoRef.current;
      const rect = gridRef.current?.getBoundingClientRect();
      if (!inicio || !rect) return;

      const x = Math.min(inicio.x, e.clientX) - rect.left;
      const y = Math.min(inicio.y, e.clientY) - rect.top;
      const w = Math.abs(e.clientX - inicio.x);
      const h = Math.abs(e.clientY - inicio.y);
      setMarquee({ x, y, w, h });

      const novoSelecionadas = new Set<string>();
      for (const [caminho, r] of cartoesRef.current) {
        const intersecta =
          r.left < Math.max(inicio.x, e.clientX) &&
          r.right > Math.min(inicio.x, e.clientX) &&
          r.top < Math.max(inicio.y, e.clientY) &&
          r.bottom > Math.min(inicio.y, e.clientY);
        if (intersecta) novoSelecionadas.add(caminho);
      }
      setSelecionadas(novoSelecionadas);
    };

    const aoSoltar = () => {
      setArrastando(false);
      setMarquee(null);
      inicioArrastoRef.current = null;
    };

    document.addEventListener("mousemove", aoMover);
    document.addEventListener("mouseup", aoSoltar);
    return () => {
      document.removeEventListener("mousemove", aoMover);
      document.removeEventListener("mouseup", aoSoltar);
    };
  }, [arrastando]);

  function abrirMenuContexto(e: React.MouseEvent, emCartao: boolean) {
    e.preventDefault();
    setMenuContexto({ x: e.clientX, y: e.clientY, emCartao });
  }

  // Mover nota por drag and drop
  async function moverNotaParaPasta(caminhoNota: string, pastaDestino: string) {
    const nota = todasNotas.find((a) => a.caminho === caminhoNota);
    if (!nota) return;
    const nomeArquivo = caminhoNota.split("/").pop()!;
    const novoCaminho = `${PASTAS.notas}/${pastaDestino}/${nomeArquivo}`;
    if (novoCaminho === caminhoNota) return;
    try {
      const { dados, corpo } = notaParaArquivo(nota);
      const texto = escreverMarkdown({ dados, corpo });
      await salvarTexto(novoCaminho, texto, undefined, `mover: ${nomeArquivo} para ${pastaDestino}`);
      await apagarItem(caminhoNota, nota.sha);
      toast(`Nota movida para "${pastaDestino}"`, { tipo: "sucesso" });
      recarregar();
    } catch {
      toast("Erro ao mover a nota", { tipo: "erro" });
    }
  }

  async function processarAcaoMenu(acao: AcaoMenuContexto) {
    switch (acao.tipo) {
      case "criar_pasta": {
        const nome = acao.nome.replace(/[^a-zA-Z0-9\s-]/g, "").trim().replace(/\s+/g, "-").toLowerCase();
        if (!nome) return;
        const novaPasta = pastaAtual ? `${pastaAtual}/${nome}` : nome;
        setPastasCriadas((atual) => [...new Set([...atual, novaPasta])]);
        setPastaAtual(novaPasta);
        toast(`Pasta "${nome}" criada`, { tipo: "sucesso" });
        break;
      }
      case "criar_nota": {
        nova();
        break;
      }
      case "mover_para": {
        if (selecionadas.size === 0) return;
        const destino = acao.pasta;
        let sucesso = 0;
        let falhas = 0;
        for (const caminho of selecionadas) {
          const nota = todasNotas.find((a) => a.caminho === caminho);
          if (!nota) continue;
          const nomeArquivo = caminho.split("/").pop()!;
          const novoCaminho = `${PASTAS.notas}/${destino}/${nomeArquivo}`;
          if (novoCaminho === caminho) continue;
          try {
            const { dados, corpo } = notaParaArquivo(nota);
            const texto = escreverMarkdown({ dados, corpo });
            await salvarTexto(novoCaminho, texto, undefined, `mover: ${nomeArquivo} para ${destino}`);
            await apagarItem(caminho, nota.sha);
            sucesso++;
          } catch {
            falhas++;
          }
        }
        if (falhas > 0) {
          toast(`${sucesso} movida(s), ${falhas} falha(s)`, { tipo: "aviso" });
        } else if (sucesso > 0) {
          toast(`${sucesso} nota(s) movida(s) para "${destino}"`, { tipo: "sucesso" });
        }
        limparSelecao();
        recarregar();
        break;
      }
      case "excluir": {
        if (selecionadas.size === 0) return;
        let sucesso = 0;
        let falhas = 0;
        for (const caminho of selecionadas) {
          const nota = todasNotas.find((a) => a.caminho === caminho);
          if (!nota) continue;
          try {
            await apagarItem(caminho, nota.sha);
            sucesso++;
          } catch {
            falhas++;
          }
        }
        if (falhas > 0) {
          toast(`${sucesso} excluída(s), ${falhas} falha(s)`, { tipo: "aviso" });
        } else if (sucesso > 0) {
          toast(`${sucesso} nota(s) excluída(s)`, { tipo: "sucesso" });
        }
        limparSelecao();
        recarregar();
        break;
      }
      case "adicionar_tags": {
        if (selecionadas.size === 0) return;
        let sucesso = 0;
        let falhas = 0;
        for (const caminho of selecionadas) {
          const nota = todasNotas.find((a) => a.caminho === caminho);
          if (!nota) continue;
          const tagsNovas = [...new Set([...nota.tags, ...acao.tags])];
          const notaAtualizada = { ...nota, tags: tagsNovas };
          const { dados, corpo } = notaParaArquivo(notaAtualizada);
          const texto = escreverMarkdown({ dados, corpo });
          try {
            await salvarTexto(caminho, texto, nota.sha);
            sucesso++;
          } catch {
            falhas++;
          }
        }
        if (falhas > 0) {
          toast(`${sucesso} atualizada(s), ${falhas} falha(s)`, { tipo: "aviso" });
        } else if (sucesso > 0) {
          toast(`Tags adicionadas a ${sucesso} nota(s)`, { tipo: "sucesso" });
        }
        limparSelecao();
        recarregar();
        break;
      }
    }
  }

  function alternarTagFiltro(tag: string) {
    setTagsFiltro((atual) =>
      atual.includes(tag) ? atual.filter((t) => t !== tag) : [...atual, tag],
    );
  }

  function filtrarPorData(nota: Nota): boolean {
    if (filtroData === "qualquer") return true;
    const data = dataDoNome(nota.caminho) || nota.atualizado || "";
    if (!data) return true;
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const dataNota = new Date(`${data}T00:00:00`);
    if (Number.isNaN(dataNota.getTime())) return true;

    if (filtroData === "hoje") {
      return dataNota.getTime() === hoje.getTime();
    }
    if (filtroData === "7dias") {
      const limite = hoje.getTime() - 7 * 86_400_000;
      return dataNota.getTime() >= limite;
    }
    if (filtroData === "mes") {
      return dataNota.getMonth() === hoje.getMonth() && dataNota.getFullYear() === hoje.getFullYear();
    }
    return true;
  }

  if (!pronto) {
    return (
      <Vazio
        titulo="Falta conectar sua conta"
        descricao="Para guardar suas anotações, preencha sua conta do GitHub e o token na aba de Ajustes."
        acao={
          <Link to="/config">
            <Botao>Ir para Ajustes</Botao>
          </Link>
        }
      />
    );
  }

  const naPasta = todasNotas.filter((a) => {
    const partes = a.caminho.split("/");
    const pastaDoItem = partes.slice(1, -1).join("/");
    return pastaDoItem === pastaAtual;
  });

  const subpastas = useMemo(() => {
    const set = new Set<string>();
    for (const a of todasNotas) {
      const partes = a.caminho.split("/");
      if (partes.length > 2) {
        const pastaDoItem = partes.slice(1, -1).join("/");
        if (pastaDoItem.startsWith(pastaAtual ? `${pastaAtual}/` : "")) {
          const resto = pastaDoItem.slice(pastaAtual ? pastaAtual.length + 1 : 0);
          const primeira = resto.split("/")[0];
          if (primeira) set.add(primeira);
        }
      }
    }
    for (const p of pastasCriadas) {
      if (pastaAtual) {
        if (p.startsWith(`${pastaAtual}/`)) {
          const resto = p.slice(pastaAtual.length + 1);
          const primeira = resto.split("/")[0];
          if (primeira) set.add(primeira);
        }
      } else {
        const primeira = p.split("/")[0];
        if (primeira) set.add(primeira);
      }
    }
    return [...set].sort();
  }, [todasNotas, pastaAtual, pastasCriadas]);

  const visiveis = naPasta.filter((a) => {
    const titulo = titulos[a.caminho] ?? a.titulo ?? a.caminho;
    const correspondeBuscaTexto =
      correspondeBusca(titulo, busca) || correspondeBusca(a.corpo, busca);
    if (!correspondeBuscaTexto) return false;

    if (tagsFiltro.length > 0) {
      const temTodas = tagsFiltro.every((t) => a.tags.includes(t));
      if (!temTodas) return false;
    }

    return filtrarPorData(a);
  });

  const todasTags = useMemo(() => {
    const set = new Set<string>();
    for (const a of todasNotas) {
      for (const t of a.tags) set.add(t);
    }
    return [...set].sort();
  }, [todasNotas]);

  // `subpastas` serve só para desenhar a pasta atual. Para mover, porém,
  // precisamos oferecer também as pastas mais profundas e as que acabaram de
  // ser criadas nesta sessão.
  const pastasExistentes = useMemo(() => {
    const pastas = new Set(pastasCriadas);
    for (const nota of todasNotas) {
      const partes = nota.caminho.split("/").slice(1, -1);
      for (let i = 1; i <= partes.length; i++) {
        pastas.add(partes.slice(0, i).join("/"));
      }
    }
    return [...pastas].filter(Boolean).sort((a, b) => a.localeCompare(b));
  }, [todasNotas, pastasCriadas]);

  const partesPasta = pastaAtual ? pastaAtual.split("/") : [];
  const filtroAtivo = busca.trim() !== "" || tagsFiltro.length > 0 || filtroData !== "qualquer";

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <CabecalhoPagina
        titulo="Notas"
        descricao="Anotações e rascunhos em Markdown armazenados no seu repositório."
        icone={<FileText size={20} />}
        corIcone="bg-amber-500/10 text-amber-600 dark:text-amber-400"
        acoes={
          <>
            <select
              onChange={(e) => {
                const tmpl = modelos.find((m) => m.id === e.target.value);
                if (tmpl) nova(tmpl);
                e.target.value = "";
              }}
              defaultValue=""
              className="rounded-xl border border-border bg-card px-3 py-2 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer shadow-2xs"
            >
              <option value="" disabled>Usar Modelo...</option>
              {modelos.map((m) => (
                <option key={m.id} value={m.id}>{m.titulo}</option>
              ))}
            </select>
            <Botao
              variante="fantasma"
              tamanho="pequeno"
              onClick={() => setModalModelosAberto(true)}
              title="Gerenciar modelos"
              className="gap-1"
            >
              <Settings2 size={14} />
              Modelos
            </Botao>
            <Botao
              variante="neutro"
              onClick={() => setMenuContexto({ x: window.innerWidth / 2 - 120, y: 96, emCartao: false })}
            >
              <FolderPlus size={16} />
              Nova Pasta
            </Botao>
            <Botao onClick={novaComPadrao}>
              <Plus size={16} />
              Nova Nota
            </Botao>
          </>
        }
      />

      {pastaAtual && (
        <div className="flex items-center gap-1.5 flex-wrap text-xs">
          <button
            type="button"
            onClick={() => setPastaAtual("")}
            className="flex items-center gap-1 rounded-lg px-2 py-1 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <FolderOpen size={13} />
            Notas
          </button>
          {partesPasta.map((parte, i) => {
            const caminhoParcial = partesPasta.slice(0, i + 1).join("/");
            return (
              <span key={caminhoParcial} className="flex items-center gap-1.5">
                <ChevronRight size={12} className="text-muted-foreground/50" />
                <button
                  type="button"
                  onClick={() => setPastaAtual(caminhoParcial)}
                  className="rounded-lg px-2 py-1 text-foreground hover:bg-accent transition-colors"
                >
                  {parte}
                </button>
              </span>
            );
          })}
        </div>
      )}

      {arquivos.length > 0 && (
        <BarraFerramentas
          busca={busca}
          aoMudarBusca={setBusca}
          placeholderBusca="Buscar nota por título..."
          filtros={
            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={filtroData}
                onChange={(e) => setFiltroData(e.target.value as FiltroData)}
                className="rounded-xl border border-border bg-card px-2.5 py-2 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer"
              >
                <option value="qualquer">Qualquer data</option>
                <option value="hoje">Hoje</option>
                <option value="7dias">Últimos 7 dias</option>
                <option value="mes">Este mês</option>
              </select>

              {todasTags.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  {todasTags.slice(0, 8).map((tag) => (
                    <TagChip
                      key={tag}
                      tag={tag}
                      ativa={tagsFiltro.includes(tag)}
                      aoClicar={() => alternarTagFiltro(tag)}
                    />
                  ))}
                  {todasTags.length > 8 && (
                    <span className="text-[10px] text-muted-foreground">
                      +{todasTags.length - 8}
                    </span>
                  )}
                </div>
              )}
            </div>
          }
        />
      )}

      {/* Indicador da pasta atual */}
      {pastaAtual && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-2.5 text-xs font-medium text-foreground animate-in fade-in duration-150">
          <FolderOpen size={14} className="text-amber-500" />
          <span>Criando notas dentro de: <strong>{pastaAtual}</strong></span>
          <button
            type="button"
            onClick={() => setPastaAtual("")}
            className="ml-auto text-[11px] text-muted-foreground hover:text-foreground transition-colors"
          >
            Sair da pasta
          </button>
        </div>
      )}

      {selecionadas.size > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-2.5 animate-in fade-in duration-150">
          <div className="flex items-center gap-2 text-xs font-medium text-foreground">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
              {selecionadas.size}
            </span>
            nota(s) selecionada(s)
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Mover para pasta — dropdown direto */}
            <select
              value=""
              onChange={(e) => {
                const destino = e.target.value;
                if (destino) processarAcaoMenu({ tipo: "mover_para", pasta: destino });
                e.target.value = "";
              }}
              className="rounded-xl border border-border bg-card px-2.5 py-1.5 text-[11px] font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer"
              title="Mover selecionados para pasta"
            >
              <option value="" disabled>Mover para pasta...</option>
              {pastasExistentes.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>

            {/* Adicionar tags — input direto */}
            <input
              type="text"
              placeholder="+ tags..."
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  const tags = (e.target as HTMLInputElement).value
                    .split(",")
                    .map((t) => t.trim().replace(/^#/, ""))
                    .filter(Boolean);
                  if (tags.length > 0) {
                    processarAcaoMenu({ tipo: "adicionar_tags", tags });
                    (e.target as HTMLInputElement).value = "";
                  }
                }
              }}
              className="rounded-xl border border-border bg-card px-2.5 py-1.5 text-[11px] font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-ring w-28"
              title="Digite tags separadas por vírgula e pressione Enter"
            />

            <Botao
              variante="fantasma"
              tamanho="pequeno"
              onClick={() => {
                processarAcaoMenu({ tipo: "excluir" });
              }}
              className="gap-1 text-[11px] text-destructive hover:bg-destructive/10"
            >
              <Trash2 size={13} /> Excluir
            </Botao>
            <Botao
              variante="fantasma"
              tamanho="icone"
              onClick={limparSelecao}
              title="Limpar seleção"
              className="h-7 w-7"
            >
              <X size={13} />
            </Botao>
          </div>
        </div>
      )}

      {erro && <Aviso tom="erro">{erro}</Aviso>}

      {ilegiveis.length > 0 && (
        <Aviso tom="erro">
          {ilegiveis.length === 1 ? "1 arquivo não pôde" : `${ilegiveis.length} arquivos não puderam`}{" "}
          ser lido e está oculto: {ilegiveis.join(", ")}. Ele continua no
          repositório — abra pelo GitHub para conferir.
        </Aviso>
      )}

      {carregando ? (
        <Carregando texto="Buscando suas notas…" />
      ) : arquivos.length === 0 ? (
        <Vazio
          icone={<FileText size={24} />}
          titulo="Nenhuma nota criada ainda"
          descricao="Crie a primeira nota. Ela vira um arquivo .md no seu repositório — que você pode abrir em qualquer lugar."
          acao={<Botao onClick={novaComPadrao}>Criar primeira nota</Botao>}
        />
      ) : naPasta.length === 0 && pastaAtual ? (
        <Vazio
          icone={<FolderOpen size={24} />}
          titulo={`Pasta "${pastaAtual}" vazia`}
          descricao="Esta pasta ainda não tem notas. Crie a primeira nota dentro dela."
          acao={
            <div className="flex items-center gap-2">
              <Botao onClick={() => novaNaPasta(pastaAtual, modeloPadrao)}>
                <Plus size={16} /> Criar nota aqui
              </Botao>
              <Botao variante="neutro" onClick={() => setPastaAtual("")}>
                Voltar para Notas
              </Botao>
            </div>
          }
        />
      ) : visiveis.length === 0 && subpastas.length === 0 ? (
        <Vazio
          icone={<FileText size={24} />}
          titulo="Nenhuma nota encontrada"
          descricao={
            filtroAtivo
              ? "Nenhum resultado corresponde aos filtros atuais."
              : `Nenhum resultado corresponde à busca por "${busca}".`
          }
        />
      ) : (
        <div
          ref={gridRef}
          onMouseDown={iniciarArrasto}
          onContextMenu={(e) => abrirMenuContexto(e, false)}
          className="relative grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 select-none"
        >
          {subpastas.map((pasta) => {
            const caminhoPasta = pastaAtual ? `${pastaAtual}/${pasta}` : pasta;
            return (
              <div
                key={`pasta-${caminhoPasta}`}
                data-cartao
                onDragOver={(e) => {
                  // O estado do React pode ainda não ter sido atualizado no
                  // primeiro evento nativo de arraste. O dataTransfer é a
                  // fonte imediata e funciona inclusive entre componentes.
                  if (notaArrastada || e.dataTransfer.types.includes("text/plain")) {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "move";
                    setPastaAlvo(caminhoPasta);
                  }
                }}
                onDragLeave={() => {
                  if (notaArrastada) setPastaAlvo(null);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  const caminhoNota = e.dataTransfer.getData("text/plain") || notaArrastada;
                  if (caminhoNota) {
                    moverNotaParaPasta(caminhoNota, caminhoPasta);
                    setNotaArrastada(null);
                    setPastaAlvo(null);
                  }
                }}
                onContextMenu={(e) => {
                  e.stopPropagation();
                  abrirMenuContexto(e, true);
                }}
              >
                <CartaoItem
                  icone={<FolderOpen size={18} className="text-primary" />}
                  titulo={pasta}
                  subtitulo="Pasta"
                  className={
                    pastaAlvo === caminhoPasta
                      ? "border-primary bg-primary/10 ring-2 ring-primary/30"
                      : ""
                  }
                  onClick={() => setPastaAtual(caminhoPasta)}
                  acoes={
                    <button
                      type="button"
                      title={`Criar nota em ${caminhoPasta}`}
                      onClick={() => novaNaPasta(caminhoPasta, modeloPadrao)}
                      className="rounded-lg p-1.5 text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
                    >
                      <Plus size={15} />
                    </button>
                  }
                />
              </div>
            );
          })}

          {visiveis.map((nota) => {
            const tituloNota = titulos[nota.caminho] ?? nota.titulo ?? nota.caminho;
            const nomeArquivo = nota.caminho.split("/").pop() || "";
            const estaSelecionada = selecionadas.has(nota.caminho);
            const emSubpasta = nota.caminho.split("/").length > 2;

            const mostrarCaminho = filtroAtivo || emSubpasta;
            const subtitulo = mostrarCaminho
              ? emSubpasta
                ? nota.caminho.split("/").slice(1, -1).join(" / ")
                : formatarNomeAmigavel(nomeArquivo)
              : undefined;

            return (
              <div
                key={nota.caminho}
                data-cartao
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.effectAllowed = "move";
                  e.dataTransfer.setData("text/plain", nota.caminho);
                  setNotaArrastada(nota.caminho);
                }}
                onDragEnd={() => {
                  setNotaArrastada(null);
                  setPastaAlvo(null);
                }}
                ref={(el) => {
                  if (el) {
                    cartoesRef.current.set(nota.caminho, el.getBoundingClientRect());
                  } else {
                    cartoesRef.current.delete(nota.caminho);
                  }
                }}
                onContextMenu={(e) => {
                  e.stopPropagation();
                  abrirMenuContexto(e, true);
                }}
              >
                <CartaoItem
                  icone={<FileText size={18} />}
                  titulo={tituloNota}
                  subtitulo={subtitulo}
                  tags={nota.tags}
                  selecionado={estaSelecionada}
                  acoes={
                    pastasExistentes.length > 0 ? (
                      <select
                        aria-label={`Mover ${tituloNota} para uma pasta`}
                        defaultValue=""
                        onChange={(e) => {
                          const destino = e.target.value;
                          if (destino) moverNotaParaPasta(nota.caminho, destino);
                          e.currentTarget.value = "";
                        }}
                        className="max-w-28 rounded-md border border-border bg-card px-1.5 py-1 text-[10px] text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      >
                        <option value="" disabled>Mover…</option>
                        {pastasExistentes
                          .filter((pasta) => `${PASTAS.notas}/${pasta}` !== nota.caminho.slice(0, nota.caminho.lastIndexOf("/")))
                          .map((pasta) => <option key={pasta} value={pasta}>{pasta}</option>)}
                      </select>
                    ) : undefined
                  }
                  onClick={() => {
                    if (selecionadas.size > 0) {
                      alternarSelecao(nota.caminho);
                    } else {
                      abrir(nota);
                    }
                  }}
                />
              </div>
            );
          })}

          {marquee && (
            <div
              className="pointer-events-none absolute z-10 rounded-lg border-2 border-primary/60 bg-primary/10"
              style={{
                left: marquee.x,
                top: marquee.y,
                width: marquee.w,
                height: marquee.h,
              }}
            />
          )}
        </div>
      )}

      <MenuContextoNotas
        x={menuContexto?.x ?? 0}
        y={menuContexto?.y ?? 0}
        aberto={menuContexto !== null}
        aoFechar={() => setMenuContexto(null)}
        aoAcao={processarAcaoMenu}
        pastasExistentes={pastasExistentes}
        temSelecao={selecionadas.size > 0}
        emCartao={menuContexto?.emCartao ?? false}
      />

      <ModalGerenciarModelos
        aberto={modalModelosAberto}
        aoFechar={() => setModalModelosAberto(false)}
        aoAtualizar={() => {
          setModelos(obterTodosModelos());
          setModeloPadrao(obterModeloPadrao());
        }}
      />

      {aberta !== null && (
        <PainelNotionBase
          rotuloTipo={aberta.caminho ? "Nota" : "Nova nota"}
          modoVisao={modoVisao}
          setModoVisao={setModoVisao}
          titulo={aberta.titulo}
          setTitulo={(t) => setAberta({ ...aberta, titulo: t })}
          corpo={aberta.corpo}
          setCorpo={(c) => setAberta({ ...aberta, corpo: c })}
          caminhoItem={aberta.caminho}
          dadosProps={aberta.bruto}
          onChangeProps={(novosDados) => setAberta({ ...aberta, bruto: novosDados })}
          camposFixosProps={{
            tipo: { icone: <FileText className="h-4 w-4 opacity-50 text-orange-500" />, tipo: "select", opcoes: ["nota", "referencia", "rascunho"] },
            tags: { icone: <Tag className="h-4 w-4 opacity-50 text-amber-500" />, tipo: "multiselect" },
          }}
          salvando={salvando}
          temMudancas={mudou}
          aoFechar={fecharNota}
          aoSalvar={async () => { if (aberta) await salvar(aberta); }}
          aoRemover={aberta.caminho ? async () => { await remover(); } : undefined}
          erro={erro}
          mencoes={mencoesNotaAberta}
          opcoesRelacionamento={opcoesRelacionamento}
        />
      )}

      <ModalConfirmacao
        aberto={mostrarConfirmacaoDescarte}
        titulo="Descartar alterações não salvas?"
        descricao="Você possui edições nesta nota que ainda não foram salvas. Deseja descartar as alterações?"
        textoConfirmar="Descartar Alterações"
        varianteConfirmar="perigo"
        aoConfirmar={() => {
          setMostrarConfirmacaoDescarte(false);
          fecharNota();
        }}
        aoCancelar={() => setMostrarConfirmacaoDescarte(false)}
      />
    </div>
  );
}
