import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Plus,
  Tag,
  FileText,
  FolderOpen,
  FolderPlus,
  ChevronRight,
  Trash2,
  X,
  LayoutGrid,
  List,
  Columns,
} from "lucide-react";
import { Masonry } from "react-plock";
import {
  obterModeloPadrao,
  type TemplateItem,
} from "@/lib/templates";
import { lerConfig, configCompleta } from "@/lib/settings";
import { useItemRepo } from "@/lib/useItemRepo";
import { useSalvar } from "@/lib/useSalvar";
import { PASTAS } from "@/lib/tipos";
import { comoNota, notaParaArquivo, dataDoNome } from "@/lib/entidades";
import { montarIndice, mencoesA, alvosUnicos } from "@/lib/links";
import { invalidarCache } from "@/lib/repo";
import { dispararAtualizacaoAcervo } from "@/lib/eventos";
import { planejarRefatoracao, type PlanoRefatoracao } from "@/lib/refatorarLinks";
import { ModalRefatorarLinks } from "@/components/ModalRefatorarLinks";
import {
  escreverMarkdown,
  tituloProvavel,
  nomeLivre,
  type Frontmatter,
} from "@/lib/markdown";
import { lerParametroAbrir, lerParametroCriar, correspondeBusca, formatarNomeAmigavel, cn } from "@/lib/utils";
import {
  Botao,
  Aviso,
  Vazio,
  Carregando,
  ModalConfirmacao,
} from "@/components/ui";
import { CabecalhoPagina } from "@/components/CabecalhoPagina";
import { BarraFerramentas } from "@/components/BarraFerramentas";
import { AlternadorVisao } from "@/components/AlternadorVisao";
import { SeloStatus } from "@/components/SeloStatus";
import { BarraFiltrosAvancados, filtrarItensPorRegras, type DefinicaoPropriedade, type RegraFiltro } from "@/components/BarraFiltrosAvancados";
import { DropdownNovoViaModelo } from "@/components/DropdownNovoViaModelo";
import { CartaoNotaVisual } from "@/components/CartaoNotaVisual";
import { PainelNotionBase, type ModoVisaoNotion } from "@/components/PainelNotionBase";
import { useItemFlutuante } from "@/components/ItemFlutuanteContext";
import { MenuContextoNotas, type AcaoMenuContexto } from "@/components/MenuContextoNotas";
import { toast } from "@/lib/toast";

import type { Nota } from "@/lib/tipos";

type NotaAberta = Nota & {
  original: { titulo: string; corpo: string; bruto?: Frontmatter };
};

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

  type ModoLayoutNotas = "grade" | "lista" | "mural";
  const [modoLayout, setModoLayout] = useState<ModoLayoutNotas>(() => {
    const salvo = localStorage.getItem("klaus_modo_layout_notas");
    return (salvo as ModoLayoutNotas) || "grade";
  });
  useEffect(() => {
    localStorage.setItem("klaus_modo_layout_notas", modoLayout);
  }, [modoLayout]);

  const [aberta, setAberta] = useState<NotaAberta | null>(null);
  const [refatoracaoPendente, setRefatoracaoPendente] = useState<{
    plano: PlanoRefatoracao;
    tituloAntigo: string;
    tituloNovo: string;
  } | null>(null);

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
  const [clipboard, setClipboard] = useState<{
    acao: "copiar" | "recortar";
    caminhos: string[];
  } | null>(null);

  // Reset de filtros locais ao mudar de rota
  useEffect(() => {
    setRegrasFiltro([]);
    setPastaAtual("");
    setSelecionadas(new Set());
  }, [location.pathname]);

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
  }, [location.pathname, location.search, location.hash, acervo, pastaAtual, todasNotas]);

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
  }, [aberta !== null, fecharNota]);

  useEffect(() => {
    const aoAbrirItem = (e: Event) => {
      const detalhe = (e as CustomEvent)?.detail;
      const caminho = detalhe?.caminho;
      if (!caminho || !caminho.startsWith(`${PASTAS.notas}/`)) return;
      const alvo = acervo.find((a) => a.caminho === caminho);
      if (alvo) {
        const nota = comoNota(alvo.doc, alvo.caminho, alvo.sha, tituloProvavel(alvo.doc, alvo.nome));
        setAberta({ ...nota, original: { titulo: nota.titulo, corpo: nota.corpo, bruto: nota.bruto } });
      }
    };
    window.addEventListener("klaus-abrir-item", aoAbrirItem);
    return () => window.removeEventListener("klaus-abrir-item", aoAbrirItem);
  }, [acervo]);

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

  function nova(template?: TemplateItem, pastaDestino?: string) {
    const tmpl = template || obterModeloPadrao();
    const titulo = tmpl?.titulo || "Nova Nota";
    
    let caminho = "";
    const pastaReal = pastaDestino ?? pastaAtual;
    if (pastaReal) {
      caminho = nomeLivre(
        `${PASTAS.notas}/${pastaReal}`,
        titulo,
        todasNotas.map((a) => a.caminho),
      );
    }

    const notaVazia: NotaAberta = {
      bruto: tmpl ? { ...tmpl.frontmatter } : {},
      caminho,
      sha: "",
      titulo,
      tipo: (tmpl?.frontmatter?.tipo as any) || "nota",
      tags: tmpl?.frontmatter?.tags || [],
      corpo: tmpl?.corpoPadrao || "",
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

    const tituloOriginal = n.original?.titulo?.trim();
    const novaSha = await salvarTexto(caminho, texto, n.sha || undefined);

    setAberta((atual) => {
      if (!atual || (atual.caminho !== caminho && atual.caminho !== "")) return atual;
      return { ...atual, caminho, sha: novaSha, titulo, original: { titulo, corpo, bruto: dados } };
    });

    recarregar();

    // Se houve renomeação de um arquivo pré-existente, verifica se outros arquivos o mencionam
    if (tituloOriginal && tituloOriginal !== titulo && n.caminho) {
      const plano = planejarRefatoracao(acervo, tituloOriginal, titulo, n.caminho, caminho);
      if (plano.totalArquivos > 0) {
        setRefatoracaoPendente({
          plano,
          tituloAntigo: tituloOriginal,
          tituloNovo: titulo,
        });
      }
    }
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

  // Resolve notas e pastas selecionadas para uma lista de operações individuais em notas
  function obterOperacoesParaItens(ids: string[], pastaDestino: string): { caminhoOrigem: string; caminhoDestino: string; nota: Nota }[] {
    const operacoes: { caminhoOrigem: string; caminhoDestino: string; nota: Nota }[] = [];
    const prefixoDestino = pastaDestino ? `${PASTAS.notas}/${pastaDestino}` : PASTAS.notas;
    
    for (const id of ids) {
      if (id.startsWith("folder:")) {
        const caminhoPasta = id.slice(7); // e.g. "my-folder"
        const prefixoPastaOrigem = `${PASTAS.notas}/${caminhoPasta}/`;
        
        // Nome da pasta que está sendo movida
        const nomePasta = caminhoPasta.split("/").pop() || "";
        
        // A pasta de destino terá esta pasta adicionada a ela
        const pastaDestinoFinal = pastaDestino ? `${pastaDestino}/${nomePasta}` : nomePasta;
        const prefixoPastaDestino = `${PASTAS.notas}/${pastaDestinoFinal}`;
        
        // Encontra todas as notas contidas nesta pasta recursivamente
        const notasFilhas = todasNotas.filter(n => n.caminho.startsWith(prefixoPastaOrigem));
        
        for (const nota of notasFilhas) {
          const caminhoRelativo = nota.caminho.slice(prefixoPastaOrigem.length);
          const caminhoDestino = `${prefixoPastaDestino}/${caminhoRelativo}`;
          operacoes.push({ caminhoOrigem: nota.caminho, caminhoDestino, nota });
        }
      } else {
        const nota = todasNotas.find(n => n.caminho === id);
        if (nota) {
          const nomeArquivo = id.split("/").pop() || "";
          const caminhoDestino = `${prefixoDestino}/${nomeArquivo}`;
          operacoes.push({ caminhoOrigem: id, caminhoDestino, nota });
        }
      }
    }
    return operacoes;
  }

  async function executarColar() {
    if (!clipboard || clipboard.caminhos.length === 0) return;
    
    const { acao, caminhos } = clipboard;
    const operacoes = obterOperacoesParaItens(caminhos, pastaAtual);
    
    if (operacoes.length === 0) {
      toast("Nenhum arquivo encontrado para colar", { tipo: "aviso" });
      return;
    }
    
    let sucesso = 0;
    let falhas = 0;
    
    toast(acao === "recortar" ? "Movendo arquivos..." : "Copiando arquivos...", { tipo: "info" });
    
    try {
      await Promise.all(
        operacoes.map(async (op) => {
          let caminhoDestino = op.caminhoDestino;
          
          if (acao === "copiar" && caminhoDestino === op.caminhoOrigem) {
            const extensao = op.caminhoOrigem.split(".").pop();
            const nomeSemExt = op.caminhoOrigem.slice(0, op.caminhoOrigem.lastIndexOf("."));
            caminhoDestino = `${nomeSemExt}-copia.${extensao}`;
          }
          
          if (caminhoDestino === op.caminhoOrigem) {
            return;
          }
          
          try {
            const { dados, corpo } = notaParaArquivo(op.nota);
            const texto = escreverMarkdown({ dados, corpo });
            await salvarTexto(caminhoDestino, texto, undefined, `${acao}: ${op.caminhoOrigem.split("/").pop()} para ${pastaAtual || "raiz"}`, true);
            
            if (acao === "recortar") {
              await apagarItem(op.caminhoOrigem, op.nota.sha, true);
            }
            sucesso++;
          } catch (err) {
            console.error(err);
            falhas++;
          }
        })
      );
      
      // Espera o GitHub processar os commits antes de forçar o recarregamento unificado
      await new Promise((r) => setTimeout(r, 800));
      invalidarCache();
      dispararAtualizacaoAcervo(PASTAS.notas);

      if (falhas > 0) {
        toast(`${sucesso} item(ns) colado(s), ${falhas} falha(s)`, { tipo: "aviso" });
      } else if (sucesso > 0) {
        toast(`${sucesso} item(ns) colado(s) com sucesso`, { tipo: "sucesso" });
        if (acao === "recortar") {
          setClipboard(null);
        }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast(`Ocorreu um erro ao colar os arquivos: ${msg}`, { tipo: "erro" });
    } finally {
      limparSelecao();
      recarregar();
    }
  }

  async function executarExcluir() {
    if (selecionadas.size === 0) return;
    
    let sucesso = 0;
    let falhas = 0;
    
    const resolved = obterOperacoesParaItens(Array.from(selecionadas), pastaAtual);
    if (resolved.length === 0) return;
    
    toast("Excluindo arquivos...", { tipo: "info" });
    
    try {
      await Promise.all(
        resolved.map(async (op) => {
          try {
            await apagarItem(op.caminhoOrigem, op.nota.sha, true);
            sucesso++;
          } catch {
            falhas++;
          }
        })
      );
      
      // Espera o GitHub processar a deleção antes de forçar o recarregamento unificado
      await new Promise((r) => setTimeout(r, 800));
      invalidarCache();
      dispararAtualizacaoAcervo(PASTAS.notas);

      if (falhas > 0) {
        toast(`${sucesso} excluída(s), ${falhas} falha(s)`, { tipo: "aviso" });
      } else if (sucesso > 0) {
        toast(`${sucesso} nota(s) excluída(s)`, { tipo: "sucesso" });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast(`Erro ao excluir notas: ${msg}`, { tipo: "erro" });
    } finally {
      limparSelecao();
      recarregar();
    }
  }

  useEffect(() => {
    const aoTecla = async (e: KeyboardEvent) => {
      if (
        document.activeElement &&
        (document.activeElement.tagName === "INPUT" ||
          document.activeElement.tagName === "TEXTAREA" ||
          document.activeElement.getAttribute("contenteditable") === "true" ||
          document.activeElement.closest(".bn-editor") ||
          document.activeElement.closest("input, textarea"))
      ) {
        return;
      }
      
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "c") {
        if (selecionadas.size > 0) {
          e.preventDefault();
          setClipboard({ acao: "copiar", caminhos: Array.from(selecionadas) });
          toast(`${selecionadas.size} item(ns) copiado(s)`, { tipo: "sucesso" });
        }
      }
      
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "x") {
        if (selecionadas.size > 0) {
          e.preventDefault();
          setClipboard({ acao: "recortar", caminhos: Array.from(selecionadas) });
          toast(`${selecionadas.size} item(ns) recortado(s)`, { tipo: "sucesso" });
        }
      }
      
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "v") {
        if (clipboard && clipboard.caminhos.length > 0) {
          e.preventDefault();
          await executarColar();
        }
      }
      
      if (e.key === "Delete" || e.key === "Backspace") {
        if (selecionadas.size > 0) {
          e.preventDefault();
          await executarExcluir();
        }
      }
    };

    window.addEventListener("keydown", aoTecla);
    return () => {
      window.removeEventListener("keydown", aoTecla);
    };
  }, [selecionadas, clipboard, pastaAtual, todasNotas]);

  // Mover nota por drag and drop ou menu
  async function moverNotaParaPasta(caminhoNota: string, pastaDestino: string, silenciarToast = false): Promise<boolean> {
    const nota = todasNotas.find((a) => a.caminho === caminhoNota);
    if (!nota) return false;
    const nomeArquivo = caminhoNota.split("/").pop()!;
    const prefixoDestino = pastaDestino ? `${PASTAS.notas}/${pastaDestino}` : PASTAS.notas;
    const novoCaminho = `${prefixoDestino}/${nomeArquivo}`;
    if (novoCaminho === caminhoNota) return false;
    
    try {
      const { dados, corpo } = notaParaArquivo(nota);
      const texto = escreverMarkdown({ dados, corpo });
      await salvarTexto(novoCaminho, texto, undefined, `mover: ${nomeArquivo} para ${pastaDestino || "raiz"}`, true);
      await apagarItem(caminhoNota, nota.sha, true);
      
      // Espera o GitHub processar a movimentação antes de forçar o recarregamento unificado
      await new Promise((r) => setTimeout(r, 800));
      invalidarCache();
      dispararAtualizacaoAcervo(PASTAS.notas);

      if (!silenciarToast) toast(`Nota movida para "${pastaDestino || "Notas"}"`, { tipo: "sucesso" });
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (!silenciarToast) toast(`Erro ao mover a nota: ${msg}`, { tipo: "erro" });
      return false;
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
        const operacoes = obterOperacoesParaItens(Array.from(selecionadas), destino);
        if (operacoes.length === 0) return;
        
        let sucesso = 0;
        let falhas = 0;
        toast("Movendo arquivos...", { tipo: "info" });
        
        try {
          await Promise.all(
            operacoes.map(async (op) => {
              if (op.caminhoDestino === op.caminhoOrigem) return;
              try {
                const { dados, corpo } = notaParaArquivo(op.nota);
                const texto = escreverMarkdown({ dados, corpo });
                await salvarTexto(op.caminhoDestino, texto, undefined, `mover: ${op.caminhoOrigem.split("/").pop()} para ${destino || "raiz"}`, true);
                await apagarItem(op.caminhoOrigem, op.nota.sha, true);
                sucesso++;
              } catch {
                falhas++;
              }
            })
          );
          
          // Espera o GitHub processar a movimentação em lote antes de forçar o recarregamento unificado
          await new Promise((r) => setTimeout(r, 800));
          invalidarCache();
          dispararAtualizacaoAcervo(PASTAS.notas);

          if (falhas > 0) {
            toast(`${sucesso} movida(s), ${falhas} falha(s)`, { tipo: "aviso" });
          } else if (sucesso > 0) {
            toast(`${sucesso} nota(s) movida(s) para "${destino || "Notas"}"`, { tipo: "sucesso" });
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          toast(`Erro ao mover notas: ${msg}`, { tipo: "erro" });
        } finally {
          limparSelecao();
          recarregar();
        }
        break;
      }
      case "excluir": {
        await executarExcluir();
        break;
      }
      case "copiar": {
        if (selecionadas.size > 0) {
          setClipboard({ acao: "copiar", caminhos: Array.from(selecionadas) });
          toast(`${selecionadas.size} item(ns) copiado(s)`, { tipo: "sucesso" });
        }
        break;
      }
      case "recortar": {
        if (selecionadas.size > 0) {
          setClipboard({ acao: "recortar", caminhos: Array.from(selecionadas) });
          toast(`${selecionadas.size} item(ns) recortado(s)`, { tipo: "sucesso" });
        }
        break;
      }
      case "colar": {
        await executarColar();
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

  const [regrasFiltro, setRegrasFiltro] = useState<RegraFiltro[]>([]);

  const todasTags = useMemo(() => {
    const set = new Set<string>();
    for (const a of todasNotas) {
      for (const t of a.tags) set.add(t);
    }
    return [...set].sort();
  }, [todasNotas]);

  const propriedadesDisponiveis = useMemo<DefinicaoPropriedade[]>(() => {
    return [
      { id: "titulo", rotulo: "Título / Nome", tipo: "texto" },
      { id: "tags", rotulo: "Tags", tipo: "tags", opcoes: todasTags },
      { id: "criado_em", rotulo: "Criado em", tipo: "data" },
      { id: "atualizado_em", rotulo: "Última edição em", tipo: "data" },
      { id: "criado_por", rotulo: "Criado por", tipo: "texto" },
      { id: "caminho", rotulo: "Pasta / Caminho", tipo: "texto" },
    ];
  }, [todasTags]);

  const visiveis = useMemo(() => {
    let lista = naPasta.filter((a) => {
      const titulo = titulos[a.caminho] ?? a.titulo ?? a.caminho;
      return correspondeBusca(titulo, busca) || correspondeBusca(a.corpo, busca);
    });

    lista = filtrarItensPorRegras(lista, regrasFiltro, (item, propId) => {
      if (propId === "titulo" || propId === "nome") return titulos[item.caminho] ?? item.titulo ?? item.caminho;
      if (propId === "tags") return item.tags || [];
      if (propId === "criado_em") return item.bruto?.criado || item.bruto?.criado_em || dataDoNome(item.caminho);
      if (propId === "atualizado_em") return item.atualizado || item.bruto?.atualizado;
      if (propId === "criado_por") return item.bruto?.autor || item.bruto?.criado_por;
      if (propId === "caminho") return item.caminho;
      return (item as any)[propId] || item.bruto?.[propId];
    });

    return lista;
  }, [naPasta, titulos, busca, regrasFiltro]);

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
  const filtroAtivo = busca.trim() !== "" || regrasFiltro.length > 0;

  const contagemPorSubpasta = useMemo(() => {
    const contagens: Record<string, number> = {};
    for (const pasta of subpastas) {
      const prefixo = pastaAtual ? `${pastaAtual}/${pasta}` : pasta;
      const qtd = todasNotas.filter((n) => {
        const partes = n.caminho.split("/").slice(1, -1).join("/");
        return partes === prefixo || partes.startsWith(`${prefixo}/`);
      }).length;
      contagens[pasta] = qtd;
    }
    return contagens;
  }, [subpastas, pastaAtual, todasNotas]);

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

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <CabecalhoPagina
        titulo="Notas"
        descricao="Anotações e rascunhos em Markdown armazenados no seu repositório."
        icone={<FileText size={20} />}
        corIcone="bg-amber-500/10 text-amber-600 dark:text-amber-400"
        badge={
          <SeloStatus
            rotulo={`${visiveis.length} ${visiveis.length === 1 ? "nota" : "notas"}`}
            tom="primario"
          />
        }
        acoes={
          <>
            <Botao
              variante="neutro"
              onClick={() => setMenuContexto({ x: window.innerWidth / 2 - 120, y: 96, emCartao: false })}
            >
              <FolderPlus size={16} />
              Nova Pasta
            </Botao>

            <DropdownNovoViaModelo
              rotuloPrincipal="Nova Nota"
              iconePrincipal={<Plus size={16} />}
              aoCriarNovo={() => nova()}
              aoCriarComTemplate={(t) => nova(t)}
              aoEditarTemplate={(tmpl) => {
                setAberta({
                  caminho: tmpl.caminho || `.klaus/templates/${tmpl.id}.md`,
                  sha: tmpl.sha || "",
                  tipo: "nota",
                  titulo: tmpl.titulo,
                  corpo: tmpl.corpoPadrao,
                  tags: tmpl.frontmatter?.tags || [],
                  atualizado: "",
                  bruto: tmpl.frontmatter || {},
                  original: {
                    titulo: tmpl.titulo,
                    corpo: tmpl.corpoPadrao,
                    bruto: tmpl.frontmatter || {},
                  },
                });
              }}
            />
          </>
        }
      />

      {pastaAtual && (
        <div className="flex items-center gap-1.5 flex-wrap text-xs bg-card/60 p-2 px-3 rounded-2xl border border-border/60 shadow-2xs">
          <button
            type="button"
            onClick={() => setPastaAtual("")}
            className="flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors font-medium cursor-pointer"
          >
            <FolderOpen size={14} className="text-amber-500" />
            Notas
          </button>
          {partesPasta.map((parte, i) => {
            const caminhoParcial = partesPasta.slice(0, i + 1).join("/");
            const ehUltimo = i === partesPasta.length - 1;
            return (
              <span key={caminhoParcial} className="flex items-center gap-1.5">
                <ChevronRight size={12} className="text-muted-foreground/50" />
                <button
                  type="button"
                  onClick={() => setPastaAtual(caminhoParcial)}
                  className={cn(
                    "rounded-xl px-2.5 py-1 transition-colors font-medium cursor-pointer",
                    ehUltimo
                      ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 font-bold border border-amber-500/20"
                      : "text-foreground hover:bg-accent"
                  )}
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
          placeholderBusca="Buscar nota por título ou conteúdo..."
          filtros={
            <BarraFiltrosAvancados
              propriedadesDisponiveis={propriedadesDisponiveis}
              regras={regrasFiltro}
              aoMudarRegras={setRegrasFiltro}
            />
          }
          acoes={
            <AlternadorVisao<ModoLayoutNotas>
              valorAtivo={modoLayout}
              aoAlternar={setModoLayout}
              opcoes={[
                { id: "grade", rotulo: "Grade", icone: <LayoutGrid size={14} /> },
                { id: "lista", rotulo: "Lista", icone: <List size={14} /> },
                { id: "mural", rotulo: "Mural", icone: <Columns size={14} /> },
              ]}
            />
          }
        />
      )}

      {selecionadas.size > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary/30 bg-primary/5 px-4 py-2.5 animate-in fade-in duration-150 backdrop-blur-md">
          <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
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
              className="rounded-xl border border-border bg-card px-2.5 py-1.5 text-[11px] font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer shadow-2xs"
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
              className="rounded-xl border border-border bg-card px-2.5 py-1.5 text-[11px] font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-ring w-28 shadow-2xs"
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

      {/* Seção Visual de Subpastas */}
      {subpastas.length > 0 && (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <FolderOpen size={13} className="text-amber-500" />
              Pastas ({subpastas.length})
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
            {subpastas.map((pasta) => {
              const caminhoPasta = pastaAtual ? `${pastaAtual}/${pasta}` : pasta;
              const pastaId = `folder:${caminhoPasta}`;
              const estaPastaSelecionada = selecionadas.has(pastaId);
              const qtdNotas = contagemPorSubpasta[pasta] ?? 0;
              const ehAlvo = pastaAlvo === caminhoPasta;

              return (
                <div
                  key={`pasta-${caminhoPasta}`}
                  data-cartao
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "move";
                    setPastaAlvo(caminhoPasta);
                  }}
                  onDragLeave={() => {
                    if (notaArrastada) setPastaAlvo(null);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    const caminhoNota = e.dataTransfer.getData("text/plain") || notaArrastada;
                    if (caminhoNota) {
                      if (selecionadas.has(caminhoNota)) {
                        processarAcaoMenu({ tipo: "mover_para", pasta: caminhoPasta });
                      } else {
                        moverNotaParaPasta(caminhoNota, caminhoPasta);
                      }
                      setNotaArrastada(null);
                      setPastaAlvo(null);
                    }
                  }}
                  onContextMenu={(e) => {
                    e.stopPropagation();
                    abrirMenuContexto(e, true);
                  }}
                  ref={(el) => {
                    if (el) {
                      cartoesRef.current.set(pastaId, el.getBoundingClientRect());
                    } else {
                      cartoesRef.current.delete(pastaId);
                    }
                  }}
                  onClick={() => {
                    if (selecionadas.size > 0) {
                      alternarSelecao(pastaId);
                    } else {
                      setPastaAtual(caminhoPasta);
                    }
                  }}
                  className={cn(
                    "group relative flex items-center gap-3 p-3 rounded-2xl border transition-colors duration-150 cursor-pointer select-none",
                    "bg-card hover:bg-accent/40 border-border/80 hover:border-border",
                    estaPastaSelecionada && "border-primary bg-primary/10 ring-2 ring-primary/30",
                    ehAlvo && "border-amber-500 bg-amber-500/10 ring-2 ring-amber-500/40"
                  )}
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 transition-colors">
                    <FolderOpen size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="font-bold text-xs text-foreground truncate">
                      {pasta}
                    </h4>
                    <span className="text-[10px] text-muted-foreground font-medium">
                      {qtdNotas} {qtdNotas === 1 ? "nota" : "notas"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {carregando ? (
        <Carregando texto="Buscando suas notas…" />
      ) : todasNotas.length === 0 && pastasCriadas.length === 0 ? (
        <Vazio
          icone={<FileText size={24} />}
          titulo="Nenhuma nota criada ainda"
          descricao="Crie a primeira nota. Ela vira um arquivo .md no seu repositório — que você pode abrir em qualquer lugar."
          acao={<Botao onClick={() => nova()}>Criar primeira nota</Botao>}
        />
      ) : naPasta.length === 0 && pastaAtual ? (
        <Vazio
          icone={<FolderOpen size={24} />}
          titulo={`Pasta "${pastaAtual}" vazia`}
          descricao="Esta pasta ainda não tem notas. Crie a primeira nota dentro dela."
          acao={
            <div className="flex items-center gap-2">
              <Botao onClick={() => nova(undefined, pastaAtual)}>
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
          className="relative select-none min-h-[50vh] pb-24"
        >
          {modoLayout === "grade" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-3.5">
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
                  <CartaoNotaVisual
                    key={nota.caminho}
                    nota={nota}
                    tituloNota={tituloNota}
                    subtitulo={subtitulo}
                    selecionado={estaSelecionada}
                    visao="grade"
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
                    onClick={() => {
                      if (selecionadas.size > 0) {
                        alternarSelecao(nota.caminho);
                      } else {
                        abrir(nota);
                      }
                    }}
                  />
                );
              })}
            </div>
          ) : modoLayout === "lista" ? (
            <div className="flex flex-col gap-2">
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
                  <CartaoNotaVisual
                    key={nota.caminho}
                    nota={nota}
                    tituloNota={tituloNota}
                    subtitulo={subtitulo}
                    selecionado={estaSelecionada}
                    visao="lista"
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
                    onClick={() => {
                      if (selecionadas.size > 0) {
                        alternarSelecao(nota.caminho);
                      } else {
                        abrir(nota);
                      }
                    }}
                  />
                );
              })}
            </div>
          ) : (
            <Masonry
              items={visiveis}
              config={{
                columns: [1, 2, 3, 4, 5],
                gap: [14, 14, 14, 14, 14],
                media: [640, 768, 1024, 1440, 1920],
              }}
              render={(nota) => {
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
                  <CartaoNotaVisual
                    key={nota.caminho}
                    nota={nota}
                    tituloNota={tituloNota}
                    subtitulo={subtitulo}
                    selecionado={estaSelecionada}
                    visao="mural"
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
                    onClick={() => {
                      if (selecionadas.size > 0) {
                        alternarSelecao(nota.caminho);
                      } else {
                        abrir(nota);
                      }
                    }}
                  />
                );
              }}
            />
          )}

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
        temClipboard={clipboard !== null && clipboard.caminhos.length > 0}
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
          erro={erroSalvar}
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

      {refatoracaoPendente && (
        <ModalRefatorarLinks
          aberto={Boolean(refatoracaoPendente)}
          onFechar={() => setRefatoracaoPendente(null)}
          tituloAntigo={refatoracaoPendente.tituloAntigo}
          tituloNovo={refatoracaoPendente.tituloNovo}
          plano={refatoracaoPendente.plano}
          aoConcluir={() => {
            setRefatoracaoPendente(null);
            recarregar();
          }}
        />
      )}
    </div>
  );
}
