/**
 * ModalLembrete — Painel padronizado para Agendar Lembrete no estilo de propriedades de documentos do Klaus.
 */

import { useState, useEffect } from "react";
import {
  Bell,
  Calendar as CalendarIcon,
  Clock,
  Send,
  Mail,
  Zap,
  Sunrise,
  CalendarDays,
  CalendarRange,
  Check,
} from "lucide-react";
import { Modal, Botao, Campo, Rotulo } from "./ui";
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
    }
  }, [aberto, tituloInicial, dataHoraInicial, canaisIniciais]);

  const aplicarAtalho = (diasAdicionais: number, horaPadrao: string) => {
    const d = new Date();
    d.setDate(d.getDate() + diasAdicionais);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    setData(`${yyyy}-${mm}-${dd}`);
    setHora(horaPadrao);
  };

  const aplicarProximaSegunda = () => {
    const d = new Date();
    const diaDaSemana = d.getDay();
    const diasAteSegunda = (8 - diaDaSemana) % 7 || 7;
    d.setDate(d.getDate() + diasAteSegunda);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    setData(`${yyyy}-${mm}-${dd}`);
    setHora("09:00");
  };

  const toggleCanal = (canal: "inbox" | "telegram" | "email") => {
    setCanais((prev) =>
      prev.includes(canal) ? prev.filter((c) => c !== canal) : [...prev, canal]
    );
  };

  const submeter = (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim() || !data) return;

    const dataHoraFormatada = hora ? `${data} ${hora}` : data;
    aoSalvar(titulo.trim(), dataHoraFormatada, canais);
    aoFechar();
  };

  return (
    <Modal
      aberto={aberto}
      aoFechar={aoFechar}
      titulo="Agendar Lembrete"
      rodape={
        <div className="flex w-full items-center justify-between gap-2">
          <Botao variante="fantasma" onClick={aoFechar} type="button">
            Cancelar
          </Botao>
          <Botao
            variante="primario"
            onClick={submeter}
            type="button"
            disabled={!titulo.trim() || !data}
          >
            <Bell size={15} />
            Salvar Lembrete
          </Botao>
        </div>
      }
    >
      <form onSubmit={submeter} className="space-y-4">
        {/* Título do lembrete */}
        <div>
          <Rotulo obrigatorio>O que você deseja lembrar?</Rotulo>
          <Campo
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="Ex: Entregar arquivos finais para a gráfica..."
            autoFocus
            className="text-sm"
          />
        </div>

        {/* Atalhos Rápidos com Ícones */}
        <div>
          <span className="text-[11px] font-semibold uppercase text-muted-foreground tracking-wider mb-1.5 block">
            Atalhos Rápidos
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            <button
              type="button"
              onClick={() => aplicarAtalho(0, "18:00")}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-border bg-card hover:bg-accent hover:border-primary/40 text-xs font-medium transition-colors cursor-pointer"
            >
              <Zap size={13} className="text-amber-500" />
              <span>Hoje 18h</span>
            </button>

            <button
              type="button"
              onClick={() => aplicarAtalho(1, "09:00")}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-border bg-card hover:bg-accent hover:border-primary/40 text-xs font-medium transition-colors cursor-pointer"
            >
              <Sunrise size={13} className="text-orange-500" />
              <span>Amanhã 9h</span>
            </button>

            <button
              type="button"
              onClick={() => aplicarAtalho(3, "09:00")}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-border bg-card hover:bg-accent hover:border-primary/40 text-xs font-medium transition-colors cursor-pointer"
            >
              <CalendarDays size={13} className="text-blue-500" />
              <span>+3 dias</span>
            </button>

            <button
              type="button"
              onClick={aplicarProximaSegunda}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-border bg-card hover:bg-accent hover:border-primary/40 text-xs font-medium transition-colors cursor-pointer"
            >
              <CalendarRange size={13} className="text-purple-500" />
              <span>Próx. Seg.</span>
            </button>
          </div>
        </div>

        {/* Tabela de Propriedades do Lembrete */}
        <div className="rounded-xl border border-border/80 bg-secondary/20 divide-y divide-border/50 text-xs overflow-hidden">
          {/* Propriedade: Data */}
          <div className="flex items-center px-3 py-2.5 gap-3">
            <div className="w-28 flex items-center gap-1.5 text-muted-foreground font-medium shrink-0">
              <CalendarIcon size={14} className="text-primary/70" />
              <span>Data</span>
            </div>
            <div className="flex-1">
              <input
                type="date"
                value={data}
                onChange={(e) => setData(e.target.value)}
                className="w-full bg-background border border-border px-2.5 py-1 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
            </div>
          </div>

          {/* Propriedade: Horário */}
          <div className="flex items-center px-3 py-2.5 gap-3">
            <div className="w-28 flex items-center gap-1.5 text-muted-foreground font-medium shrink-0">
              <Clock size={14} className="text-primary/70" />
              <span>Horário</span>
            </div>
            <div className="flex-1">
              <input
                type="time"
                value={hora}
                onChange={(e) => setHora(e.target.value)}
                className="w-full bg-background border border-border px-2.5 py-1 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          {/* Propriedade: Canais de Notificação */}
          <div className="flex flex-col sm:flex-row sm:items-center px-3 py-2.5 gap-2 sm:gap-3">
            <div className="w-28 flex items-center gap-1.5 text-muted-foreground font-medium shrink-0">
              <Bell size={14} className="text-primary/70" />
              <span>Canais</span>
            </div>
            <div className="flex-1 flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => toggleCanal("inbox")}
                className={cn(
                  "px-2.5 py-1 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer",
                  canais.includes("inbox")
                    ? "bg-primary/15 border-primary/40 text-primary font-semibold shadow-xs"
                    : "bg-background border-border text-muted-foreground hover:text-foreground"
                )}
              >
                <div
                  className={cn(
                    "w-3.5 h-3.5 rounded flex items-center justify-center border",
                    canais.includes("inbox")
                      ? "bg-primary border-primary text-primary-foreground"
                      : "border-muted-foreground/40 bg-transparent"
                  )}
                >
                  {canais.includes("inbox") && <Check size={10} strokeWidth={3} />}
                </div>
                <span>Klaus Inbox</span>
              </button>

              <button
                type="button"
                onClick={() => toggleCanal("telegram")}
                className={cn(
                  "px-2.5 py-1 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer",
                  canais.includes("telegram")
                    ? "bg-sky-500/15 border-sky-500/40 text-sky-600 dark:text-sky-400 font-semibold shadow-xs"
                    : "bg-background border-border text-muted-foreground hover:text-foreground"
                )}
              >
                <div
                  className={cn(
                    "w-3.5 h-3.5 rounded flex items-center justify-center border",
                    canais.includes("telegram")
                      ? "bg-sky-500 border-sky-500 text-white"
                      : "border-muted-foreground/40 bg-transparent"
                  )}
                >
                  {canais.includes("telegram") && <Check size={10} strokeWidth={3} />}
                </div>
                <Send size={11} className="text-sky-500" />
                <span>Telegram (Celular)</span>
              </button>

              <button
                type="button"
                onClick={() => toggleCanal("email")}
                className={cn(
                  "px-2.5 py-1 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer",
                  canais.includes("email")
                    ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 font-semibold shadow-xs"
                    : "bg-background border-border text-muted-foreground hover:text-foreground"
                )}
              >
                <div
                  className={cn(
                    "w-3.5 h-3.5 rounded flex items-center justify-center border",
                    canais.includes("email")
                      ? "bg-emerald-500 border-emerald-500 text-white"
                      : "border-muted-foreground/40 bg-transparent"
                  )}
                >
                  {canais.includes("email") && <Check size={10} strokeWidth={3} />}
                </div>
                <Mail size={11} className="text-emerald-500" />
                <span>E-mail</span>
              </button>
            </div>
          </div>
        </div>
      </form>
    </Modal>
  );
}
