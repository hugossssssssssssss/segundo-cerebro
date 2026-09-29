import { useState, useEffect } from "react";
import {
  X,
  Globe,
  Code2,
  FileText,
  Palette,
  Check,
  Trash2,
} from "lucide-react";
import { Botao, ModalConfirmacao } from "@/components/ui";
import { obterIconePorNome } from "@/lib/icones";
import { GaleriaIconesModal } from "@/components/GaleriaIconesModal";
import {
  type ProjetoExtensao,
  type TipoExtensao,
  type CategoriaExtensao,
  salvarProjetoCustomizado,
  removerProjetoCustomizado,
} from "@/lib/projetosExtensoes";
import { PRESETS_CORES_ICONE } from "@/lib/menuPersonalizado";
import { lerConfig } from "@/lib/settings";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { gerenciadorCamadas, NIVEIS_CAMADAS } from "@/lib/camadas";

interface ModalCriarProjetoExtensaoProps {
  aberto: boolean;
  aoFechar: () => void;
  projetoEdicao?: ProjetoExtensao | null;
  aoSalvar?: (projeto: ProjetoExtensao) => void;
}

export function ModalCriarProjetoExtensao({
  aberto,
  aoFechar,
  projetoEdicao,
  aoSalvar,
}: ModalCriarProjetoExtensaoProps) {
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [categoria, setCategoria] = useState<CategoriaExtensao>("pessoal");
  const [tipo, setTipo] = useState<TipoExtensao>("url_integrada");
  const [icone, setIcone] = useState("FolderGit2");
  const [cor, setCor] = useState("#6366f1");
  const [urlEmbed, setUrlEmbed] = useState("");
  const [codigoHtml, setCodigoHtml] = useState("");
  const [caminhoPastaMarkdown, setCaminhoPastaMarkdown] = useState("");
  const [galeriaAberta, setGaleriaAberta] = useState(false);
  const [confirmarExclusao, setConfirmarExclusao] = useState(false);

  useEffect(() => {
    if (aberto) {
      if (projetoEdicao) {
        setNome(projetoEdicao.nome);
        setDescricao(projetoEdicao.descricao);
        setCategoria(projetoEdicao.categoria);
        setTipo(projetoEdicao.tipo);
        setIcone(projetoEdicao.icone || "FolderGit2");
        setCor(projetoEdicao.cor || "#6366f1");
        setUrlEmbed(projetoEdicao.urlEmbed || "");
        setCodigoHtml(projetoEdicao.codigoHtml || "");
        setCaminhoPastaMarkdown(projetoEdicao.caminhoPastaMarkdown || "");
      } else {
        setNome("");
        setDescricao("");
        setCategoria("pessoal");
        setTipo("url_integrada");
        setIcone("FolderGit2");
        setCor("#6366f1");
        setUrlEmbed("");
        setCodigoHtml("");
        setCaminhoPastaMarkdown("");
      }
    }
  }, [aberto, projetoEdicao]);

  useEffect(() => {
    if (!aberto) return;
    const limpar = gerenciadorCamadas.registrar({
      id: "modal-criar-projeto-extensao",
      nivel: NIVEIS_CAMADAS.MODAIS_GLOBAIS,
      temBackdrop: true,
      aoFechar,
    });
    return () => limpar();
  }, [aberto, aoFechar]);

  if (!aberto) return null;

  const IconeComponente = obterIconePorNome(icone);

  const lidarSalvar = () => {
    if (!nome.trim()) {
      toast("Por favor, digite um nome para o projeto.", { tipo: "aviso" });
      return;
    }

    if (tipo === "url_integrada" && !urlEmbed.trim()) {
      toast("Digite o endereço (URL) do aplicativo web.", { tipo: "aviso" });
      return;
    }

    const cfg = lerConfig();
    const salvo = salvarProjetoCustomizado(
      {
        id: projetoEdicao?.id || `projeto_${Date.now()}`,
        nome,
        descricao,
        categoria,
        tipo,
        icone,
        cor,
        ativo: true,
        urlEmbed: urlEmbed.trim(),
        codigoHtml,
        caminhoPastaMarkdown: caminhoPastaMarkdown.trim(),
        criadoEm: projetoEdicao?.criadoEm,
      },
      cfg,
    );

    toast(
      projetoEdicao
        ? `Projeto "${salvo.nome}" atualizado no seu repositório!`
        : `Projeto "${salvo.nome}" criado e integrado ao Klaus!`,
      { tipo: "sucesso" },
    );

    if (aoSalvar) aoSalvar(salvo);
    aoFechar();
  };

  const lidarExcluir = () => {
    if (!projetoEdicao) return;
    const cfg = lerConfig();
    removerProjetoCustomizado(projetoEdicao.id, cfg);
    toast(`Projeto "${projetoEdicao.nome}" removido.`, { tipo: "aviso" });
    aoFechar();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="flex flex-col w-full max-w-xl max-h-[92vh] rounded-2xl border border-border bg-card shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl transition-all shadow-xs"
              style={{ backgroundColor: `${cor}15`, color: cor }}
            >
              <IconeComponente size={22} />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">
                {projetoEdicao ? "Editar Projeto / Extensão" : "Novo Projeto no Repositório"}
              </h2>
              <p className="text-xs text-muted-foreground">
                Salvo com segurança no seu repositório privado (<code className="font-mono text-[10px]">.klaus/projetos.json</code>)
              </p>
            </div>
          </div>
          <button
            onClick={aoFechar}
            className="p-1.5 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Formulário com Scroll */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-sm">
          {/* Nome e Ícone */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Nome do Projeto *</label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setGaleriaAberta(true)}
                className="flex items-center justify-center h-10 w-10 rounded-xl border border-border hover:bg-accent transition-colors shrink-0 cursor-pointer shadow-2xs"
                style={{ backgroundColor: `${cor}15`, color: cor }}
                title="Escolher ícone"
              >
                <IconeComponente size={20} />
              </button>
              <input
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: Painel de Briefings, Ferramenta de Custos..."
                className="flex-1 h-10 px-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/40 text-foreground"
              />
            </div>
          </div>

          {/* Descrição */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Descrição</label>
            <input
              type="text"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Para que serve esta extensão ou projeto?"
              className="w-full h-10 px-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/40 text-foreground"
            />
          </div>

          {/* Paleta de Cor */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Palette size={14} /> Cor de Identificação
            </label>
            <div className="flex items-center gap-1.5 flex-wrap">
              {PRESETS_CORES_ICONE.map((preset) => (
                <button
                  key={preset.hex}
                  type="button"
                  onClick={() => setCor(preset.hex)}
                  className={cn(
                    "w-7 h-7 rounded-lg transition-transform flex items-center justify-center cursor-pointer",
                    cor === preset.hex ? "scale-110 ring-2 ring-foreground/40 shadow-xs" : "hover:scale-105 opacity-80"
                  )}
                  style={{ backgroundColor: preset.hex }}
                  title={preset.nome}
                >
                  {cor === preset.hex && <Check size={14} className="text-white drop-shadow-xs" />}
                </button>
              ))}
            </div>
          </div>

          {/* Categoria */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Categoria</label>
            <select
              value={categoria}
              onChange={(e) => setCategoria(e.target.value as CategoriaExtensao)}
              className="w-full h-10 px-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/40 text-foreground"
            >
              <option value="pessoal">Projetos Pessoais & Clientes</option>
              <option value="design">Design & Criatividade</option>
              <option value="produtividade">Produtividade & Organização</option>
              <option value="utilitarios">Utilitários & Ferramentas</option>
              <option value="ia">Inteligência Artificial</option>
            </select>
          </div>

          {/* Tipo de Extensão */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-foreground">Como este projeto funciona?</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setTipo("url_integrada")}
                className={cn(
                  "flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all cursor-pointer gap-1.5",
                  tipo === "url_integrada"
                    ? "border-primary bg-primary/10 text-primary font-semibold shadow-xs"
                    : "border-border hover:bg-muted/40 text-muted-foreground"
                )}
              >
                <Globe size={20} />
                <span className="text-xs">App Web / Link</span>
              </button>

              <button
                type="button"
                onClick={() => setTipo("codigo_customizado")}
                className={cn(
                  "flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all cursor-pointer gap-1.5",
                  tipo === "codigo_customizado"
                    ? "border-primary bg-primary/10 text-primary font-semibold shadow-xs"
                    : "border-border hover:bg-muted/40 text-muted-foreground"
                )}
              >
                <Code2 size={20} />
                <span className="text-xs">HTML / JS Próprio</span>
              </button>

              <button
                type="button"
                onClick={() => setTipo("dashboard_markdown")}
                className={cn(
                  "flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all cursor-pointer gap-1.5",
                  tipo === "dashboard_markdown"
                    ? "border-primary bg-primary/10 text-primary font-semibold shadow-xs"
                    : "border-border hover:bg-muted/40 text-muted-foreground"
                )}
              >
                <FileText size={20} />
                <span className="text-xs">Pasta do Repo</span>
              </button>
            </div>
          </div>

          {/* Configuração específica do Tipo */}
          {tipo === "url_integrada" && (
            <div className="space-y-1.5 bg-muted/20 p-3.5 rounded-xl border border-border/40 animate-in fade-in">
              <label className="text-xs font-semibold text-foreground">Endereço (URL) da Ferramenta</label>
              <input
                type="url"
                value={urlEmbed}
                onChange={(e) => setUrlEmbed(e.target.value)}
                placeholder="https://exemplo.com ou https://meuapp.vercel.app"
                className="w-full h-10 px-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/40 text-foreground font-mono text-xs"
              />
              <p className="text-[11px] text-muted-foreground">
                O aplicativo abrirá com a barra superior, cabeçalho e atalhos do Klaus integrados.
              </p>
            </div>
          )}

          {tipo === "codigo_customizado" && (
            <div className="space-y-1.5 bg-muted/20 p-3.5 rounded-xl border border-border/40 animate-in fade-in">
              <label className="text-xs font-semibold text-foreground">Código HTML / CSS / JS</label>
              <textarea
                value={codigoHtml}
                onChange={(e) => setCodigoHtml(e.target.value)}
                rows={5}
                placeholder="<h1>Meu Mini-App</h1><p>Código livre executado com segurança.</p>"
                className="w-full p-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/40 text-foreground font-mono text-xs leading-relaxed"
              />
            </div>
          )}

          {tipo === "dashboard_markdown" && (
            <div className="space-y-1.5 bg-muted/20 p-3.5 rounded-xl border border-border/40 animate-in fade-in">
              <label className="text-xs font-semibold text-foreground">Caminho da Pasta no Repositório</label>
              <input
                type="text"
                value={caminhoPastaMarkdown}
                onChange={(e) => setCaminhoPastaMarkdown(e.target.value)}
                placeholder="Ex: notas/Projetos ou tarefas/Sprint"
                className="w-full h-10 px-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/40 text-foreground font-mono text-xs"
              />
            </div>
          )}
        </div>

        {/* Rodapé com Ações */}
        <div className="flex items-center justify-between p-4 border-t border-border bg-muted/30">
          <div>
            {projetoEdicao && (
              <button
                type="button"
                onClick={() => setConfirmarExclusao(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-destructive hover:bg-destructive/10 rounded-lg transition-colors cursor-pointer"
              >
                <Trash2 size={14} /> Excluir Projeto
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Botao variante="neutro" onClick={aoFechar}>
              Cancelar
            </Botao>
            <Botao onClick={lidarSalvar}>
              {projetoEdicao ? "Salvar Alterações" : "Criar Extensão"}
            </Botao>
          </div>
        </div>
      </div>

      {/* Modal de Escolha de Ícone */}
      <GaleriaIconesModal
        aberta={galeriaAberta}
        aoFechar={() => setGaleriaAberta(false)}
        iconeAtual={icone}
        corAtual={cor}
        aoSelecionarIcone={(novo) => {
          setIcone(novo);
          setGaleriaAberta(false);
        }}
      />

      {/* Confirmação de Exclusão */}
      <ModalConfirmacao
        aberto={confirmarExclusao}
        titulo="Excluir este projeto?"
        descricao={`Tem certeza que deseja excluir "${projetoEdicao?.nome}"? Ele será removido da sua lista de projetos no repositório.`}
        textoConfirmar="Excluir"
        varianteConfirmar="perigo"
        aoConfirmar={lidarExcluir}
        aoCancelar={() => setConfirmarExclusao(false)}
      />
    </div>
  );
}
