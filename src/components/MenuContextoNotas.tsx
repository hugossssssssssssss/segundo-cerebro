import { useEffect, useRef, useState } from "react";
import {
    FolderPlus,
    FilePlus2,
    FolderOpen,
    Trash2,
    Tag,
    X,
    Check,
    Copy,
    Scissors,
    Clipboard,
    Pin,
    CopyPlus,
} from "lucide-react";
import { Botao, Campo } from "@/components/ui";
import { cn } from "@/lib/utils";
import type { Nota } from "@/lib/tipos";

export type AcaoMenuContexto =
    | { tipo: "criar_pasta"; nome: string }
    | { tipo: "criar_nota" }
    | { tipo: "mover_para"; pasta: string }
    | { tipo: "excluir" }
    | { tipo: "adicionar_tags"; tags: string[] }
    | { tipo: "copiar" }
    | { tipo: "recortar" }
    | { tipo: "colar" }
    | { tipo: "fixar" }
    | { tipo: "desafixar" }
    | { tipo: "duplicar" };

interface MenuContextoNotasProps {
    x: number;
    y: number;
    aberto: boolean;
    aoFechar: () => void;
    aoAcao: (acao: AcaoMenuContexto) => void;
    /** Pastas existentes para mover itens selecionados */
    pastasExistentes: string[];
    /** true quando há itens selecionados (mostra ações em lote) */
    temSelecao: boolean;
    /** true quando o clique foi num cartão (mostra ações de item) */
    emCartao: boolean;
    /** true quando há itens no clipboard do app */
    temClipboard: boolean;
    /** Nota específica sobre a qual o menu foi aberto */
    notaAlvo?: Nota | null;
}

/**
 * Menu flutuante acionado pelo botão direito na tela de Notas.
 * Permite criar pasta, criar nota, mover itens selecionados e excluir.
 */
export function MenuContextoNotas({
    x,
    y,
    aberto,
    aoFechar,
    aoAcao,
    pastasExistentes,
    temSelecao,
    emCartao,
    temClipboard,
    notaAlvo,
}: MenuContextoNotasProps) {
    const [criandoPasta, setCriandoPasta] = useState(false);
    const [nomePasta, setNomePasta] = useState("");
    const [mostrarPastas, setMostrarPastas] = useState(false);
    const [mostrarTags, setMostrarTags] = useState(false);
    const [tagsStr, setTagsStr] = useState("");
    const menuRef = useRef<HTMLDivElement>(null);

    // Fecha ao clicar fora ou pressionar Esc
    useEffect(() => {
        if (!aberto) return;
        const aoClicarFora = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                aoFechar();
            }
        };
        const aoTeclar = (e: KeyboardEvent) => {
            if (e.key === "Escape") aoFechar();
        };
        document.addEventListener("mousedown", aoClicarFora);
        document.addEventListener("keydown", aoTeclar);
        return () => {
            document.removeEventListener("mousedown", aoClicarFora);
            document.removeEventListener("keydown", aoTeclar);
        };
    }, [aberto, aoFechar]);

    if (!aberto) return null;

    // Ajusta posição para não estourar a tela
    const larguraMenu = 240;
    const alturaEstimada = 260;
    const posX = Math.min(x, window.innerWidth - larguraMenu - 8);
    const posY = Math.min(y, window.innerHeight - alturaEstimada - 8);

    function confirmarCriarPasta() {
        const nome = nomePasta.trim();
        if (!nome) return;
        aoAcao({ tipo: "criar_pasta", nome });
        setNomePasta("");
        setCriandoPasta(false);
        aoFechar();
    }

    function confirmarTags() {
        const tags = tagsStr
            .split(",")
            .map((t) => t.trim().replace(/^#/, ""))
            .filter(Boolean);
        if (tags.length === 0) return;
        aoAcao({ tipo: "adicionar_tags", tags });
        setTagsStr("");
        setMostrarTags(false);
        aoFechar();
    }

    const ItemMenu = ({
        icone,
        rotulo,
        onClick,
        perigo,
        desabilitado,
    }: {
        icone: React.ReactNode;
        rotulo: string;
        onClick: () => void;
        perigo?: boolean;
        desabilitado?: boolean;
    }) => (
        <button
            type="button"
            disabled={desabilitado}
            onClick={onClick}
            className={cn(
                "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-medium transition-colors",
                desabilitado
                    ? "opacity-40 cursor-not-allowed text-muted-foreground"
                    : perigo
                        ? "text-destructive hover:bg-destructive/10"
                        : "text-foreground hover:bg-accent"
            )}
        >
            {icone}
            {rotulo}
        </button>
    );

    return (
        <div
            ref={menuRef}
            style={{ left: posX, top: posY, zIndex: 200 }}
            className="fixed w-60 rounded-xl border border-border bg-card shadow-2xl p-1.5 animate-in zoom-in-95 fade-in duration-100"
        >
            {/* Opções específicas para quando o clique foi em um cartão */}
            {emCartao && notaAlvo && (
                <>
                    <ItemMenu
                        icone={<Pin size={14} className={notaAlvo.fixado ? "text-amber-500 fill-amber-500/40" : "text-amber-500"} />}
                        rotulo={notaAlvo.fixado ? "Desafixar do topo" : "Fixar no topo"}
                        onClick={() => {
                            aoAcao({ tipo: notaAlvo.fixado ? "desafixar" : "fixar" });
                            aoFechar();
                        }}
                    />
                    <ItemMenu
                        icone={<CopyPlus size={14} className="text-purple-500" />}
                        rotulo="Duplicar nota"
                        onClick={() => {
                            aoAcao({ tipo: "duplicar" });
                            aoFechar();
                        }}
                    />
                    <ItemMenu
                        icone={<Trash2 size={14} className="text-destructive" />}
                        rotulo="Excluir nota"
                        perigo
                        onClick={() => {
                            aoAcao({ tipo: "excluir" });
                            aoFechar();
                        }}
                    />
                    <div className="my-1 border-t border-border/60" />
                </>
            )}
            {/* Criar Pasta */}
            {criandoPasta ? (
                <div className="p-2 space-y-2">
                    <p className="text-[11px] font-semibold text-foreground flex items-center gap-1.5">
                        <FolderPlus size={13} className="text-primary" /> Nova Pasta
                    </p>
                    <Campo
                        autoFocus
                        value={nomePasta}
                        onChange={(e) => setNomePasta(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") confirmarCriarPasta();
                            if (e.key === "Escape") setCriandoPasta(false);
                        }}
                        placeholder="Nome da pasta"
                        className="h-8 text-xs"
                    />
                    <div className="flex items-center justify-end gap-1.5">
                        <Botao
                            variante="fantasma"
                            tamanho="pequeno"
                            onClick={() => setCriandoPasta(false)}
                            className="h-7 px-2 text-[11px]"
                        >
                            <X size={12} /> Cancelar
                        </Botao>
                        <Botao
                            variante="primario"
                            tamanho="pequeno"
                            onClick={confirmarCriarPasta}
                            className="h-7 px-2 text-[11px] gap-1"
                        >
                            <Check size={12} /> Criar
                        </Botao>
                    </div>
                </div>
            ) : (
                <ItemMenu
                    icone={<FolderPlus size={14} className="text-primary" />}
                    rotulo="Nova Pasta"
                    onClick={() => setCriandoPasta(true)}
                />
            )}

            {/* Criar Nota */}
            <ItemMenu
                icone={<FilePlus2 size={14} className="text-amber-500" />}
                rotulo="Nova Nota"
                onClick={() => {
                    aoAcao({ tipo: "criar_nota" });
                    aoFechar();
                }}
            />

            {/* Separador */}
            <div className="my-1 border-t border-border/60" />

            <ItemMenu
                icone={<Copy size={14} className="text-blue-500" />}
                rotulo="Copiar"
                desabilitado={!temSelecao}
                onClick={() => {
                    aoAcao({ tipo: "copiar" });
                    aoFechar();
                }}
            />

            <ItemMenu
                icone={<Scissors size={14} className="text-indigo-500" />}
                rotulo="Recortar"
                desabilitado={!temSelecao}
                onClick={() => {
                    aoAcao({ tipo: "recortar" });
                    aoFechar();
                }}
            />

            <ItemMenu
                icone={<Clipboard size={14} className="text-emerald-500" />}
                rotulo="Colar"
                desabilitado={!temClipboard}
                onClick={() => {
                    aoAcao({ tipo: "colar" });
                    aoFechar();
                }}
            />

            {/* Separador */}
            <div className="my-1 border-t border-border/60" />

            {/* Ações em lote (quando há seleção) */}
            {temSelecao && (
                <>
                    {mostrarPastas ? (
                        <div className="p-2 space-y-1.5">
                            <p className="text-[11px] font-semibold text-foreground flex items-center gap-1.5">
                                <FolderOpen size={13} className="text-primary" /> Mover para…
                            </p>
                            <div className="max-h-36 overflow-y-auto space-y-0.5">
                                {pastasExistentes.length === 0 ? (
                                    <p className="text-[11px] text-muted-foreground px-1 py-1">
                                        Nenhuma subpasta ainda. Crie uma com "Nova Pasta".
                                    </p>
                                ) : (
                                    pastasExistentes.map((p) => (
                                        <button
                                            key={p}
                                            type="button"
                                            onClick={() => {
                                                aoAcao({ tipo: "mover_para", pasta: p });
                                                aoFechar();
                                            }}
                                            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs text-foreground hover:bg-accent transition-colors"
                                        >
                                            <FolderOpen size={13} className="text-muted-foreground" />
                                            {p}
                                        </button>
                                    ))
                                )}
                            </div>
                        </div>
                    ) : (
                        <ItemMenu
                            icone={<FolderOpen size={14} className="text-primary" />}
                            rotulo="Mover para pasta…"
                            onClick={() => setMostrarPastas(true)}
                        />
                    )}

                    {mostrarTags ? (
                        <div className="p-2 space-y-2">
                            <p className="text-[11px] font-semibold text-foreground flex items-center gap-1.5">
                                <Tag size={13} className="text-amber-500" /> Adicionar tags
                            </p>
                            <Campo
                                autoFocus
                                value={tagsStr}
                                onChange={(e) => setTagsStr(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") confirmarTags();
                                    if (e.key === "Escape") setMostrarTags(false);
                                }}
                                placeholder="design, cliente, urgente"
                                className="h-8 text-xs"
                            />
                            <div className="flex items-center justify-end gap-1.5">
                                <Botao
                                    variante="fantasma"
                                    tamanho="pequeno"
                                    onClick={() => setMostrarTags(false)}
                                    className="h-7 px-2 text-[11px]"
                                >
                                    <X size={12} /> Cancelar
                                </Botao>
                                <Botao
                                    variante="primario"
                                    tamanho="pequeno"
                                    onClick={confirmarTags}
                                    className="h-7 px-2 text-[11px] gap-1"
                                >
                                    <Check size={12} /> Aplicar
                                </Botao>
                            </div>
                        </div>
                    ) : (
                        <ItemMenu
                            icone={<Tag size={14} className="text-amber-500" />}
                            rotulo="Adicionar tags…"
                            onClick={() => setMostrarTags(true)}
                        />
                    )}

                    <ItemMenu
                        icone={<Trash2 size={14} className="text-destructive" />}
                        rotulo="Excluir selecionados"
                        perigo
                        onClick={() => {
                            aoAcao({ tipo: "excluir" });
                            aoFechar();
                        }}
                    />

                    <div className="my-1 border-t border-border/60" />
                </>
            )}

            {/* Dica */}
            <p className="px-3 py-1.5 text-[10px] text-muted-foreground">
                {emCartao
                    ? "Clique com o botão direito num cartão para ações rápidas."
                    : "Clique com o botão direito no fundo para criar pastas e notas."}
            </p>
        </div>
    );
}