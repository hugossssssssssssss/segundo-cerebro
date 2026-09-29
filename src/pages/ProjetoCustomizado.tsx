import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ExternalLink,
  RotateCcw,
  Edit3,
  Layers,
  FileText,
  FolderGit2,
  AlertCircle,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { CabecalhoPagina } from "@/components/CabecalhoPagina";
import { SeloStatus } from "@/components/SeloStatus";
import { Botao, Carregando, Vazio } from "@/components/ui";
import { obterIconePorNome } from "@/lib/icones";
import {
  carregarProjetosExtensoes,
  type ProjetoExtensao,
} from "@/lib/projetosExtensoes";
import { ModalCriarProjetoExtensao } from "@/components/ModalCriarProjetoExtensao";
import { carregarRepo, daPastaRecursiva } from "@/lib/repo";
import { lerConfig, configCompleta } from "@/lib/settings";
import { CartaoItem } from "@/components/CartaoItem";
import { cn } from "@/lib/utils";
import {
  buildKlausManifest,
  prepareKlausAppHtml,
  createKlausBridgeListener,
} from "@/lib/klausEngine";

export default function ProjetoCustomizado() {
  const { idProjeto } = useParams<{ idProjeto: string }>();
  const navigate = useNavigate();
  const [projetos, setProjetos] = useState<ProjetoExtensao[]>(carregarProjetosExtensoes);
  const [modalEdicaoAberta, setModalEdicaoAberta] = useState(false);
  const [chaveIframe, setChaveIframe] = useState(0);
  const [iframeCarregando, setIframeCarregando] = useState(true);
  const [telaCheia, setTelaCheia] = useState(false);

  // Dados do repositório caso o tipo seja dashboard de pasta
  const [arquivosPasta, setArquivosPasta] = useState<any[]>([]);
  const [carregandoRepo, setCarregandoRepo] = useState(false);

  const projeto = useMemo(() => {
    return projetos.find((p) => p.id === idProjeto);
  }, [projetos, idProjeto]);

  const manifest = useMemo(() => {
    return projeto ? buildKlausManifest(projeto) : null;
  }, [projeto]);

  const htmlPreparado = useMemo(() => {
    if (!projeto?.codigoHtml) return "";
    return prepareKlausAppHtml(projeto.codigoHtml, manifest || undefined);
  }, [projeto?.codigoHtml, manifest]);

  // Ativa a ponte de comunicação segura do Klaus Engine
  useEffect(() => {
    if (!manifest) return;
    const cleanup = createKlausBridgeListener(manifest);
    return cleanup;
  }, [manifest]);

  const cfg = lerConfig();
  const pronto = configCompleta(cfg);

  const carregarArquivos = useCallback(async () => {
    if (!projeto?.caminhoPastaMarkdown || !pronto) return;
    setCarregandoRepo(true);
    try {
      const todos = await carregarRepo(cfg);
      const pasta = daPastaRecursiva(todos, projeto.caminhoPastaMarkdown);
      setArquivosPasta(pasta);
    } catch {
      setArquivosPasta([]);
    } finally {
      setCarregandoRepo(false);
    }
  }, [projeto?.caminhoPastaMarkdown, pronto, cfg]);

  useEffect(() => {
    if (projeto?.tipo === "dashboard_markdown") {
      carregarArquivos();
    }
  }, [projeto?.tipo, carregarArquivos]);

  if (!projeto) {
    return (
      <div className="space-y-6 animate-in fade-in duration-200 w-full pb-10">
        <CabecalhoPagina
          titulo="Projeto não encontrado"
          descricao="O projeto solicitado não está registrado no seu repositório de dados."
          icone={<AlertCircle size={20} />}
          corIcone="bg-amber-500/10 text-amber-600 dark:text-amber-400"
        />
        <Vazio
          icone={<FolderGit2 size={24} />}
          titulo="Projeto não encontrado"
          descricao="Ele pode ter sido removido ou desativado da sua biblioteca."
          acao={
            <Botao onClick={() => navigate("/biblioteca")}>
              Ir para a Biblioteca de Projetos
            </Botao>
          }
        />
      </div>
    );
  }

  const Icone = obterIconePorNome(projeto.icone || "FolderGit2");

  return (
    <div className={cn("space-y-4 animate-in fade-in duration-200 w-full pb-10", telaCheia && "fixed inset-0 z-50 bg-background p-4 overflow-y-auto")}>
      {/* 1. Cabeçalho Principal integrado */}
      <CabecalhoPagina
        titulo={projeto.nome}
        descricao={projeto.descricao || "Projeto personalizado integrado ao seu Klaus."}
        icone={<Icone size={20} style={{ color: projeto.cor }} />}
        corIcone="bg-primary/10 text-primary"
        badge={
          <SeloStatus
            rotulo={projeto.origem === "usuario" ? "Projeto Pessoal" : "Extensão Ativa"}
            tom="primario"
          />
        }
        acoes={
          <div className="flex items-center gap-2 flex-wrap">
            {projeto.tipo === "url_integrada" && projeto.urlEmbed && (
              <>
                <Botao
                  variante="neutro"
                  onClick={() => {
                    setIframeCarregando(true);
                    setChaveIframe((k) => k + 1);
                  }}
                  title="Recarregar tela"
                >
                  <RotateCcw size={15} />
                  <span className="hidden sm:inline">Recarregar</span>
                </Botao>
                <Botao
                  variante="neutro"
                  onClick={() => window.open(projeto.urlEmbed, "_blank")}
                  title="Abrir em nova aba externa"
                >
                  <ExternalLink size={15} />
                  <span className="hidden sm:inline">Nova Aba</span>
                </Botao>
              </>
            )}

            <Botao
              variante="neutro"
              onClick={() => setTelaCheia((v) => !v)}
              title={telaCheia ? "Sair da tela cheia" : "Tela cheia"}
            >
              {telaCheia ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
            </Botao>

            <Botao variante="neutro" onClick={() => setModalEdicaoAberta(true)}>
              <Edit3 size={15} />
              <span className="hidden sm:inline">Editar Projeto</span>
            </Botao>
          </div>
        }
      />

      {/* 2. Conteúdo de acordo com o Tipo do Projeto */}
      {projeto.tipo === "url_integrada" && (
        <div className="relative w-full h-[78vh] rounded-2xl border border-border bg-card overflow-hidden shadow-xs">
          {iframeCarregando && (
            <div className="absolute inset-0 flex items-center justify-center bg-card/80 backdrop-blur-xs z-10">
              <Carregando texto={`Carregando ${projeto.nome}...`} />
            </div>
          )}
          <iframe
            key={chaveIframe}
            src={projeto.urlEmbed}
            title={projeto.nome}
            onLoad={() => setIframeCarregando(false)}
            className="w-full h-full border-0 rounded-2xl"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          />
        </div>
      )}

      {projeto.tipo === "codigo_customizado" && (
        <div className="w-full min-h-[60vh] h-[78vh] rounded-2xl border border-border bg-card shadow-xs overflow-hidden">
          {projeto.codigoHtml ? (
            <iframe
              srcDoc={htmlPreparado}
              title={projeto.nome}
              className="w-full h-full border-0"
              sandbox="allow-scripts allow-forms allow-popups"
            />
          ) : (
            <div className="p-6">
              <Vazio
                icone={<Layers size={24} />}
                titulo="Código não configurado"
                descricao="Edite este projeto para inserir seu HTML, CSS e JavaScript customizado."
                acao={<Botao onClick={() => setModalEdicaoAberta(true)}>Configurar Código</Botao>}
              />
            </div>
          )}
        </div>
      )}

      {projeto.tipo === "dashboard_markdown" && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl border border-border/60 bg-muted/20 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
              <FileText size={14} /> Pasta conectada: <strong>{projeto.caminhoPastaMarkdown || "Raiz"}</strong>
            </div>
            <Botao variante="neutro" onClick={carregarArquivos}>
              <RotateCcw size={13} /> Atualizar
            </Botao>
          </div>

          {carregandoRepo ? (
            <Carregando texto="Buscando arquivos da pasta no repositório..." />
          ) : arquivosPasta.length === 0 ? (
            <Vazio
              icone={<FileText size={24} />}
              titulo="Nenhum arquivo encontrado nesta pasta"
              descricao={`A pasta "${projeto.caminhoPastaMarkdown}" ainda não possui notas ou tarefas gravadas.`}
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {arquivosPasta.map((item) => (
                <CartaoItem
                  key={item.caminho}
                  icone={<FileText size={18} />}
                  titulo={item.nome.replace(/\.md$/, "")}
                  subtitulo={item.caminho}
                  onClick={() => {
                    if (item.caminho.startsWith("tarefas/")) {
                      navigate(`/tarefas`);
                    } else {
                      navigate(`/notas`);
                    }
                  }}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal de Edição */}
      <ModalCriarProjetoExtensao
        aberto={modalEdicaoAberta}
        aoFechar={() => setModalEdicaoAberta(false)}
        projetoEdicao={projeto}
        aoSalvar={() => {
          setProjetos(carregarProjetosExtensoes());
        }}
      />
    </div>
  );
}
