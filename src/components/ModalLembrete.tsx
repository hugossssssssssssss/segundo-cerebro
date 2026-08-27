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
  Inbox,
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

  const submeter = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
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
            onClick={() => submeter()}
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
            placeholder="Ex: Entregar proposta revisada para o cliente..."
            autoFocus
            className="text-sm"
          />
        </div>

        {/* Atalhos Rápidos com Ícones */}
        <div>
          <span className="text-[11px] font-semibold uppercase text-muted-foreground tracking-wider mb-1.5 block">
            Atalhos Rápidos
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button
              type="button"
              onClick={() => aplicarAtalho(0, "18:00")}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-border bg-card/80 hover:bg-accent hover:border-amber-500/40 text-xs font-semibold transition-all cursor-pointer shadow-2xs"
            >
              <Zap size={14} className="text-amber-500" />
              <span>Hoje 18h</span>
            </button>

            <button
              type="button"
              onClick={() => aplicarAtalho(1, "09:00")}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-border bg-card/80 hover:bg-accent hover:border-orange-500/40 text-xs font-semibold transition-all cursor-pointer shadow-2xs"
            >
              <Sunrise size={14} className="text-orange-500" />
              <span>Amanhã 9h</span>
            </button>

            <button
              type="button"
              onClick={() => aplicarAtalho(3, "09:00")}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-border bg-card/80 hover:bg-accent hover:border-blue-500/40 text-xs font-semibold transition-all cursor-pointer shadow-2xs"
            >
              <CalendarDays size={14} className="text-blue-500" />
              <span>+3 dias</span>
            </button>

            <button
              type="button"
              onClick={aplicarProximaSegunda}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-border bg-card/80 hover:bg-accent hover:border-purple-500/40 text-xs font-semibold transition-all cursor-pointer shadow-2xs"
            >
              <CalendarRange size={14} className="text-purple-500" />
              <span>Próx. Seg.</span>
            </button>
          </div>
        </div>

        {/* Tabela de Propriedades do Lembrete */}
        <div className="rounded-2xl border border-border/80 bg-card/60 divide-y divide-border/50 text-xs overflow-hidden shadow-xs">
          {/* Data e Horário */}
          <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-border/50">
            <div className="flex items-center px-3.5 py-2.5 gap-2.5">
              <div className="flex items-center gap-1.5 text-muted-foreground font-semibold shrink-0">
                <CalendarIcon size={14} className="text-primary" />
                <span>Data:</span>
              </div>
              <input
                type="date"
                value={data}
                onChange={(e) => setData(e.target.value)}
                className="flex-1 bg-background border border-border px-2.5 py-1.5 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer text-foreground"
                required
              />
            </div>

            <div className="flex items-center px-3.5 py-2.5 gap-2.5">
              <div className="flex items-center gap-1.5 text-muted-foreground font-semibold shrink-0">
                <Clock size={14} className="text-primary" />
                <span>Horário:</span>
              </div>
              <input
                type="time"
                value={hora}
                onChange={(e) => setHora(e.target.value)}
                className="flex-1 bg-background border border-border px-2.5 py-1.5 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer text-foreground"
              />
            </div>
          </div>

          {/* Canais de Notificação */}
          <div className="p-3.5 space-y-2">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
              Onde você deseja receber o aviso?
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => toggleCanal("inbox")}
                className={cn(
                  "p-2.5 rounded-xl border text-xs font-medium flex items-center justify-between transition-all cursor-pointer text-left",
                  canais.includes("inbox")
                    ? "bg-primary/10 border-primary/50 text-foreground ring-1 ring-primary/30"
                    : "bg-background border-border text-muted-foreground hover:text-foreground"
                )}
              >
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-lg bg-primary/15 text-primary flex items-center justify-center">
                    <Inbox size={13} />
                  </div>
                  <div>
                    <p className="font-bold text-xs">Klaus Inbox</p>
                    <p className="text-[10px] text-muted-foreground">Central web</p>
                  </div>
                </div>
                <div
                  className={cn(
                    "w-4 h-4 rounded-md flex items-center justify-center border",
                    canais.includes("inbox")
                      ? "bg-primary border-primary text-primary-foreground"
                      : "border-muted-foreground/40 bg-transparent"
                  )}
                >
                  {canais.includes("inbox") && <Check size={11} strokeWidth={3} />}
                </div>
              </button>

              <button
                type="button"
                onClick={() => toggleCanal("telegram")}
                className={cn(
                  "p-2.5 rounded-xl border text-xs font-medium flex items-center justify-between transition-all cursor-pointer text-left",
                  canais.includes("telegram")
                    ? "bg-sky-500/10 border-sky-500/50 text-foreground ring-1 ring-sky-500/30"
                    : "bg-background border-border text-muted-foreground hover:text-foreground"
                )}
              >
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-lg bg-sky-500/15 text-sky-500 flex items-center justify-center">
                    <Send size={13} />
                  </div>
                  <div>
                    <p className="font-bold text-xs">Telegram</p>
                    <p className="text-[10px] text-muted-foreground">No celular</p>
                  </div>
                </div>
                <div
                  className={cn(
                    "w-4 h-4 rounded-md flex items-center justify-center border",
                    canais.includes("telegram")
                      ? "bg-sky-500 border-sky-500 text-white"
                      : "border-muted-foreground/40 bg-transparent"
                  )}
                >
                  {canais.includes("telegram") && <Check size={11} strokeWidth={3} />}
                </div>
              </button>

              <button
                type="button"
                onClick={() => toggleCanal("email")}
                className={cn(
                  "p-2.5 rounded-xl border text-xs font-medium flex items-center justify-between transition-all cursor-pointer text-left",
                  canais.includes("email")
                    ? "bg-emerald-500/10 border-emerald-500/50 text-foreground ring-1 ring-emerald-500/30"
                    : "bg-background border-border text-muted-foreground hover:text-foreground"
                )}
              >
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-lg bg-emerald-500/15 text-emerald-500 flex items-center justify-center">
                    <Mail size={13} />
                  </div>
                  <div>
                    <p className="font-bold text-xs">E-mail</p>
                    <p className="text-[10px] text-muted-foreground">Notificação</p>
                  </div>
                </div>
                <div
                  className={cn(
                    "w-4 h-4 rounded-md flex items-center justify-center border",
                    canais.includes("email")
                      ? "bg-emerald-500 border-emerald-500 text-white"
                      : "border-muted-foreground/40 bg-transparent"
                  )}
                >
                  {canais.includes("email") && <Check size={11} strokeWidth={3} />}
                </div>
              </button>
            </div>
          </div>
        </div>
      </form>
    </Modal>
  );
}
