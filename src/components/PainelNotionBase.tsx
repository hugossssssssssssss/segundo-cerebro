import { useState, useEffect, useCallback, useRef } from "react";
import {
  Square,
  PanelRight,
  Maximize2,
  StickyNote,
  X,
  Trash2,
  Minimize2,
  Maximize,
  Pin,
} from "lucide-react";
import { Botao, Aviso, ModalConfirmacao } from "@/components/ui";
import { PropriedadesNotion } from "@/components/PropriedadesNotion";
import { EditorNotion } from "@/components/EditorNotion";
import { Subtarefas } from "@/components/Subtarefas";
import { MencionadoEm } from "@/components/Links";
import { cn } from "@/lib/utils";

export type ModoVisaoNotion = "popup" | "lado" | "telacheia" | "flutuante";

export interface PainelNotionBaseProps {
  rotuloTipo: string;
  modoVisao: ModoVisaoNotion;
  setModoVisao: (m: ModoVisaoNotion) => void;
  titulo: string;
  setTitulo: (t: string) => void;
  corpo: string;
  setCorpo: (c: string) => void;
  dadosProps: Record<string, any>;
  onChangeProps: (novosDados: Record<string, any>) => void;
  camposFixosProps?: Record<string, any>;
  caminhoItem?: string;
  salvando: boolean;
  temMudancas: boolean;
  aoFechar: () => void;
  aoSalvar: (fechar?: boolean) => Promise<void>;
  aoRemover?: () => Promise<void>;
  erro?: string;
  mencoes?: any[];
  opcoesRelacionamento?: { titulo: string; caminho: string }[];
}

export function PainelNotionBase({
  rotuloTipo,
  modoVisao,
  setModoVisao,
  titulo,
  setTitulo,
  corpo,
  setCorpo,
  dadosProps,
  onChangeProps,
  camposFixosProps,
  caminhoItem,
  salvando,
  temMudancas,
  aoFechar,
  aoSalvar,
  aoRemover,
  erro,
  mencoes = [],
  opcoesRelacionamento = [],
}: PainelNotionBaseProps) {
  const [confirmandoApagar, setConfirmandoApagar] = useState(false);
  const [minimizadoFlutuante, setMinimizadoFlutuante] = useState(false);

  // Guarda referencias atualizadas para evitarfechar sem salvar por causa de closures desatualizados
  const salvandoRef = useRef(salvando);
  const temMudancasRef = useRef(temMudancas);
  salvandoRef.current = salvando;
  temMudancasRef.current = temMudancas;

  const tentarFechar = useCallback(() => {
    if (temMudancasRef.current) {
      aoSalvar(true).catch(() => {});
    }
    aoFechar();
  }, [aoSalvar, aoFechar]);

  // Tecla Escape para fechar
  useEffect(() => {
    if (modoVisao === "flutuante") return;
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === "Escape") tentarFechar();
    };
    document.addEventListener("keydown", aoTeclar);
    const overflowAnterior = document.body.style.overflow;
    if ((modoVisao as string) !== "flutuante") {
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", aoTeclar);
      document.body.style.overflow = overflowAnterior;
    };
  }, [tentarFechar, modoVisao]);

  // Alerta de segurança ao tentar sair/fechar a aba do navegador
  useEffect(() => {
    if (!temMudancas) return;
    const aoSairDaJanela = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", aoSairDaJanela);
    return () => window.removeEventListener("beforeunload", aoSairDaJanela);
  }, [temMudancas]);

  // Cabeçalho unificado com alternador dos 4 Modos de Visão
  const cabecalho = (
    <div className="flex shrink-0 items-center justify-between border-b border-border px-4 sm:px-5 py-3 bg-card">
      <div className="flex items-center gap-2 min-w-0 pr-2">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider shrink-0">
          {rotuloTipo}
        </span>

        {/* Indicador visual de status de salvamento */}
        <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-accent/60 flex items-center gap-1 shrink-0">
          {salvando ? (
            <span className="text-blue-500 animate-pulse font-semibold">Salvando...</span>
          ) : temMudancas ? (
            <span className="text-amber-600 dark:text-amber-400 font-medium">Salva ao fechar</span>
          ) : (
            <span className="text-emerald-600 dark:text-emerald-400 font-medium">✓ Sincronizado</span>
          )}
        </span>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        {/* Seletor dos 4 Modos de Visão Notion + Flutuante */}
        <div className="flex items-center gap-0.5 rounded-lg border border-border/80 bg-muted/40 p-0.5 sm:p-1">
          <button
            onClick={() => { setModoVisao("popup"); setMinimizadoFlutuante(false); }}
            className={cn(
              "p-1.5 rounded-md transition-colors flex items-center justify-center",
              modoVisao === "popup"
                ? "bg-background text-foreground shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            )}
            title="Pop-up central"
          >
            <Square size={15} />
          </button>

          <button
            onClick={() => { setModoVisao("lado"); setMinimizadoFlutuante(false); }}
            className={cn(
              "p-1.5 rounded-md transition-colors flex items-center justify-center",
              modoVisao === "lado"
                ? "bg-background text-foreground shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            )}
            title="Painel lateral (Do lado)"
          >
            <PanelRight size={15} />
          </button>

          <button
            onClick={() => { setModoVisao("telacheia"); setMinimizadoFlutuante(false); }}
            className={cn(
              "p-1.5 rounded-md transition-colors flex items-center justify-center",
              modoVisao === "telacheia"
                ? "bg-background text-foreground shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            )}
            title="Tela cheia"
          >
            <Maximize2 size={15} />
          </button>

          <button
            onClick={() => { setModoVisao("flutuante"); setMinimizadoFlutuante(false); }}
            className={cn(
              "p-1.5 rounded-md transition-colors flex items-center justify-center",
              modoVisao === "flutuante"
                ? "bg-amber-500/20 text-amber-600 dark:text-amber-400 shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            )}
            title="Nota Autoadesiva Flutuante (Post-it pelo app)"
          >
            <StickyNote size={15} />
          </button>
        </div>

        {modoVisao === "flutuante" && (
          <button
            onClick={() => setMinimizadoFlutuante(!minimizadoFlutuante)}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            title={minimizadoFlutuante ? "Expandir nota" : "Minimizar nota"}
          >
            {minimizadoFlutuante ? <Maximize size={15} /> : <Minimize2 size={15} />}
          </button>
        )}

        <button
          onClick={tentarFechar}
          className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          title="Fechar e Salvar"
        >
          <X size={17} />
        </button>
      </div>
    </div>
  );

  const rodape = (
    <div className="flex shrink-0 items-center justify-between gap-2 border-t border-border px-4 sm:px-5 py-2.5 bg-card">
      {aoRemover ? (
        <Botao variante="fantasma" onClick={() => setConfirmandoApagar(true)} className="text-destructive hover:bg-destructive/10 text-xs">
          <Trash2 size={14} />
          <span>Apagar</span>
        </Botao>
      ) : <div />}
      <span className="text-[11px] text-muted-foreground">Salva automaticamente ao fechar</span>
    </div>
  );

  const modaisConfirmacao = (
    <ModalConfirmacao
      aberto={confirmandoApagar}
      titulo={`Apagar "${titulo || "este item"}"?`}
      descricao="Tem certeza de que deseja apagar? Ele será excluído do repositório no GitHub."
      textoConfirmar="Sim, apagar"
      textoCancelar="Cancelar"
      varianteConfirmar="perigo"
      aoConfirmar={() => {
        setConfirmandoApagar(false);
        if (aoRemover) aoRemover();
      }}
      aoCancelar={() => setConfirmandoApagar(false)}
    />
  );

  const eTarefa = rotuloTipo?.toLowerCase().includes("tarefa");

  const conteudo = (
    <div className="space-y-5 max-w-4xl mx-auto w-full">
      {erro && <Aviso tom="erro">{erro}</Aviso>}

      <input
        type="text"
        value={titulo}
        onChange={(e) => setTitulo(e.target.value)}
        placeholder="Sem título"
        className="w-full text-2xl sm:text-3xl font-bold border-none outline-none bg-transparent placeholder:text-muted-foreground/30 focus:ring-0 px-0 pt-1"
        autoFocus
      />

      <div className="flex flex-col gap-2">
        <PropriedadesNotion
          dados={dadosProps}
          corpoTexto={corpo}
          onChange={onChangeProps}
          camposFixos={camposFixosProps}
          opcoesRelacionamento={opcoesRelacionamento}
        />
      </div>

      <hr className="border-border" />

      {eTarefa && (
        <>
          <div className="space-y-3">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Passos / Subtarefas
            </label>
            <Subtarefas
              corpo={corpo}
              onChange={(novoCorpo) => setCorpo(novoCorpo)}
            />
          </div>
          <hr className="border-border" />
        </>
      )}

      <div className="min-h-[220px]">
        <EditorNotion
          key={caminhoItem || titulo || "editor"}
          markdown={corpo}
          onChange={(v) => setCorpo(v ?? "")}
        />
      </div>

      {mencoes.length > 0 && (
        <div className="mt-6 border-t border-border pt-5">
          <MencionadoEm mencoes={mencoes} />
        </div>
      )}
    </div>
  );

  // MODO 4: FLUTUANTE (Nota Autoadesiva estilo Post-it do Windows)
  if (modoVisao === "flutuante") {
    if (minimizadoFlutuante) {
      return (
        <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom duration-200">
          <div
            onClick={() => setMinimizadoFlutuante(false)}
            className="flex items-center gap-2.5 rounded-full border border-amber-500/40 bg-amber-500/10 dark:bg-amber-900/30 backdrop-blur-md px-4 py-2 text-xs font-bold text-foreground shadow-xl cursor-pointer hover:scale-105 transition-all"
          >
            <Pin size={14} className="text-amber-500 shrink-0" />
            <span className="truncate max-w-[200px]">{titulo || "Nota Autoadesiva"}</span>
            <span className="text-[10px] bg-amber-500/20 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 rounded-full">Flutuante</span>
          </div>
          {modaisConfirmacao}
        </div>
      );
    }

    return (
      <div className="fixed bottom-3 right-3 sm:bottom-6 sm:right-6 z-50 w-[calc(100vw-24px)] sm:w-[460px] max-h-[80vh] flex flex-col rounded-2xl border-2 border-amber-500/40 bg-card shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
        {cabecalho}
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">{conteudo}</div>
        {rodape}
        {modaisConfirmacao}
      </div>
    );
  }

  // MODO 2: DO LADO (Painel Lateral / Drawer)
  if (modoVisao === "lado") {
    return (
      <div
        className="fixed inset-0 z-50 flex justify-end bg-black/20 backdrop-blur-[2px] p-0 sm:p-3 animate-in fade-in duration-150"
        onClick={tentarFechar}
      >
        <div
          className="flex h-full w-full sm:w-[560px] md:w-[680px] lg:w-[760px] flex-col rounded-t-2xl sm:rounded-2xl border border-border bg-card shadow-2xl overflow-hidden animate-in slide-in-from-right duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          {cabecalho}
          <div className="min-h-0 flex-1 overflow-y-auto px-5 sm:px-8 py-6">{conteudo}</div>
          {rodape}
        </div>
        {modaisConfirmacao}
      </div>
    );
  }

  // MODO 3: TELA CHEIA
  if (modoVisao === "telacheia") {
    return (
      <div
        className="fixed inset-0 z-50 flex flex-col bg-black/20 backdrop-blur-[2px] p-2 sm:p-4 animate-in fade-in duration-150"
        onClick={tentarFechar}
      >
        <div
          className="flex h-full w-full flex-col rounded-2xl sm:rounded-3xl border border-border bg-card shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
          onClick={(e) => e.stopPropagation()}
        >
          {cabecalho}
          <div className="min-h-0 flex-1 overflow-y-auto px-6 sm:px-12 py-8">{conteudo}</div>
          {rodape}
        </div>
        {modaisConfirmacao}
      </div>
    );
  }

  // MODO 1: POP-UP CENTRALIZADO (Padrão)
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-[2px] p-3 sm:p-6 animate-in fade-in duration-150"
      onClick={tentarFechar}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-2xl border border-border bg-card shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {cabecalho}
        <div className="min-h-0 flex-1 overflow-y-auto px-5 sm:px-8 py-6">{conteudo}</div>
        {rodape}
      </div>
      {modaisConfirmacao}
    </div>
  );
}
