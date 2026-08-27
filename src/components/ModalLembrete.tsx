import { useState, useEffect } from "react";
import {
  Calendar as CalendarIcon,
  Clock,
  Send,
  Mail,
  Inbox,
  Check,
  Folder,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface ModalLembreteProps {
  aberto: boolean;
  aoFechar: () => void;
  aoSalvar: (titulo: string, dataHora: string, canais: ("inbox" | "telegram" | "email")[]) => void;
  tituloInicial?: string;
  dataHoraInicial?: string;
  canaisIniciais?: ("inbox" | "telegram" | "email")[];
}

export function ModalLembrete({
  aberto,
  aoFechar,
  aoSalvar,
  tituloInicial = "",
  dataHoraInicial = "",
  canaisIniciais = ["inbox", "telegram"],
}: ModalLembreteProps) {
  const [titulo, setTitulo] = useState(tituloInicial);
  const [data, setData] = useState("");
  const [hora, setHora] = useState("09:00");
  const [canais, setCanais] = useState<("inbox" | "telegram" | "email")[]>(canaisIniciais);
  const [observacoes, setObservacoes] = useState("");

  useEffect(() => {
    if (aberto) {
      setTitulo(tituloInicial);
      if (dataHoraInicial) {
        const partes = dataHoraInicial.split(" ");
        setData(partes[0] || "");
        setHora(partes[1] || "09:00");
      } else {
        const hoje = new Date();
        const yyyy = hoje.getFullYear();
        const mm = String(hoje.getMonth() + 1).padStart(2, "0");
        const dd = String(hoje.getDate()).padStart(2, "0");
        setData(`${yyyy}-${mm}-${dd}`);
        setHora("09:00");
      }
      setCanais(canaisIniciais);
      setObservacoes("");
    }
  }, [aberto, tituloInicial, dataHoraInicial, canaisIniciais]);

  const toggleCanal = (canal: "inbox" | "telegram" | "email") => {
    setCanais((prev) =>
      prev.includes(canal) ? prev.filter((c) => c !== canal) : [...prev, canal]
    );
  };

  const submeter = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!titulo.trim() || !data) return;

    const dataHoraFormatada = hora ? `${data} ${hora}` : data;
    aoSalvar(titulo.trim(), dataHoraFormatada, canais);
    aoFechar();
  };

  if (!aberto) return null;

  // Formata a data atual para exibição brasileira DD/MM/AAAA
  const dataFormatadaBr = data ? data.split("-").reverse().join("/") : "";

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={aoFechar}
    >
      <div
        className="w-full max-w-xl bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Topo estilo Notion Documento */}
        <div className="p-5 pb-3 border-b border-border/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Novo Compromisso / Lembrete
            </span>
          </div>

          <button
            type="button"
            onClick={aoFechar}
            className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Formulário Notion */}
        <form onSubmit={submeter} className="p-5 space-y-4 overflow-y-auto max-h-[75vh]">
          {/* Título Estilo Notion H1 */}
          <div>
            <input
              type="text"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Título do compromisso ou lembrete..."
              className="w-full text-lg font-bold text-foreground bg-transparent border-0 placeholder:text-muted-foreground/40 focus:outline-none"
              autoFocus
              required
            />
          </div>

          {/* Tabela de Propriedades Padronizada Klaus Notion */}
          <div className="rounded-xl border border-border/80 bg-background/50 divide-y divide-border/40 text-xs">
            {/* Propriedade Data */}
            <div className="flex items-center p-2.5 px-3 gap-3">
              <div className="flex items-center gap-2 text-muted-foreground w-28 shrink-0 font-medium">
                <CalendarIcon size={14} className="text-primary" />
                <span>Data</span>
              </div>
              <div className="flex items-center gap-2 flex-1">
                <input
                  type="date"
                  value={data}
                  onChange={(e) => setData(e.target.value)}
                  className="bg-card border border-border rounded-lg px-2 py-1 text-xs font-medium text-foreground cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary"
                  required
                />
                {dataFormatadaBr && (
                  <span className="text-[11px] font-mono text-muted-foreground">
                    ({dataFormatadaBr})
                  </span>
                )}
              </div>
            </div>

            {/* Propriedade Horário */}
            <div className="flex items-center p-2.5 px-3 gap-3">
              <div className="flex items-center gap-2 text-muted-foreground w-28 shrink-0 font-medium">
                <Clock size={14} className="text-primary" />
                <span>Horário</span>
              </div>
              <input
                type="time"
                value={hora}
                onChange={(e) => setHora(e.target.value)}
                className="bg-card border border-border rounded-lg px-2 py-1 text-xs font-medium text-foreground cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            {/* Propriedade Canais de Notificação */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center p-2.5 px-3 gap-3">
              <div className="flex items-center gap-2 text-muted-foreground w-28 shrink-0 font-medium">
                <Inbox size={14} className="text-primary" />
                <span>Avisos</span>
              </div>
              <div className="flex items-center gap-2 flex-wrap flex-1">
                {/* Canal Inbox */}
                <button
                  type="button"
                  onClick={() => toggleCanal("inbox")}
                  className={cn(
                    "flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium transition-all cursor-pointer",
                    canais.includes("inbox")
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card border-border text-muted-foreground hover:text-foreground"
                  )}
                >
                  <div
                    className={cn(
                      "w-3.5 h-3.5 rounded flex items-center justify-center border",
                      canais.includes("inbox")
                        ? "bg-primary-foreground text-primary border-primary-foreground"
                        : "border-border bg-transparent"
                    )}
                  >
                    {canais.includes("inbox") && <Check size={10} strokeWidth={3} />}
                  </div>
                  <span>Caixa de Entrada</span>
                </button>

                {/* Canal Telegram */}
                <button
                  type="button"
                  onClick={() => toggleCanal("telegram")}
                  className={cn(
                    "flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium transition-all cursor-pointer",
                    canais.includes("telegram")
                      ? "bg-sky-500 text-white border-sky-500"
                      : "bg-card border-border text-muted-foreground hover:text-foreground"
                  )}
                >
                  <div
                    className={cn(
                      "w-3.5 h-3.5 rounded flex items-center justify-center border",
                      canais.includes("telegram")
                        ? "bg-white text-sky-500 border-white"
                        : "border-border bg-transparent"
                    )}
                  >
                    {canais.includes("telegram") && <Check size={10} strokeWidth={3} />}
                  </div>
                  <Send size={11} />
                  <span>Telegram</span>
                </button>

                {/* Canal E-mail */}
                <button
                  type="button"
                  onClick={() => toggleCanal("email")}
                  className={cn(
                    "flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium transition-all cursor-pointer",
                    canais.includes("email")
                      ? "bg-emerald-600 text-white border-emerald-600"
                      : "bg-card border-border text-muted-foreground hover:text-foreground"
                  )}
                >
                  <div
                    className={cn(
                      "w-3.5 h-3.5 rounded flex items-center justify-center border",
                      canais.includes("email")
                        ? "bg-white text-emerald-600 border-white"
                        : "border-border bg-transparent"
                    )}
                  >
                    {canais.includes("email") && <Check size={10} strokeWidth={3} />}
                  </div>
                  <Mail size={11} />
                  <span>E-mail</span>
                </button>
              </div>
            </div>

            {/* Propriedade Tipo / Destino */}
            <div className="flex items-center p-2.5 px-3 gap-3">
              <div className="flex items-center gap-2 text-muted-foreground w-28 shrink-0 font-medium">
                <Folder size={14} className="text-primary" />
                <span>Destino</span>
              </div>
              <span className="text-xs text-foreground font-medium bg-card px-2 py-0.5 rounded border border-border">
                Lembretes do Klaus
              </span>
            </div>
          </div>

          {/* Bloco de Observações / Corpo */}
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-muted-foreground">
              Anotações / Detalhes adicionais (opcional):
            </label>
            <textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Adicione notas ou contexto para este compromisso..."
              className="w-full min-h-[90px] resize-none bg-background/50 border border-border rounded-xl p-3 text-xs text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Rodapé */}
          <div className="pt-2 flex items-center justify-end gap-2">
            <Button variant="ghost" size="sm" type="button" onClick={aoFechar} className="text-xs">
              Cancelar
            </Button>
            <Button size="sm" type="submit" disabled={!titulo.trim() || !data} className="text-xs font-semibold px-4">
              Salvar Compromisso
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
