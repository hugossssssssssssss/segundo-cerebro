import { useState, useEffect } from "react";
import { Modal, Botao, Campo, Rotulo } from "./ui";
import { Bell, Calendar, Clock, Send, Mail } from "lucide-react";

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
    const diaDaSemana = d.getDay(); // 0 e domingo, 1 e segunda
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
      prev.includes(canal) ? prev.filter((c) => c !== canal) : [...prev, canal],
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
            <Bell size={16} />
            Salvar Lembrete
          </Botao>
        </div>
      }
    >
      <form onSubmit={submeter} className="space-y-4">
        {/* Título do lembrete */}
        <div>
          <Rotulo obrigatorio dica="O que você precisa ser lembrado de fazer?">
            Lembrete
          </Rotulo>
          <Campo
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="Ex: Enviar arquivos finais para a gráfica"
            autoFocus
          />
        </div>

        {/* Atalhos de data */}
        <div>
          <label className="text-xs font-semibold uppercase text-muted-foreground tracking-wider mb-1.5 block">
            Atalhos Rápido
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            <button
              type="button"
              onClick={() => aplicarAtalho(0, "18:00")}
              className="rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-medium hover:bg-accent text-left transition-colors"
            >
              Hoje (18:00)
            </button>
            <button
              type="button"
              onClick={() => aplicarAtalho(1, "09:00")}
              className="rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-medium hover:bg-accent text-left transition-colors"
            >
              Amanhã (09:00)
            </button>
            <button
              type="button"
              onClick={() => aplicarAtalho(3, "09:00")}
              className="rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-medium hover:bg-accent text-left transition-colors"
            >
              Daqui a 3 dias
            </button>
            <button
              type="button"
              onClick={aplicarProximaSegunda}
              className="rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-medium hover:bg-accent text-left transition-colors"
            >
              Próx. Segunda
            </button>
          </div>
        </div>

        {/* Data e Hora */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Rotulo obrigatorio>
              <span className="flex items-center gap-1.5">
                <Calendar size={14} /> Data do Lembrete
              </span>
            </Rotulo>
            <Campo
              type="date"
              value={data}
              onChange={(e) => setData(e.target.value)}
            />
          </div>

          <div>
            <Rotulo>
              <span className="flex items-center gap-1.5">
                <Clock size={14} /> Horário
              </span>
            </Rotulo>
            <Campo
              type="time"
              value={hora}
              onChange={(e) => setHora(e.target.value)}
            />
          </div>
        </div>

        {/* Canais de Notificação */}
        <div>
          <label className="text-xs font-semibold uppercase text-muted-foreground tracking-wider mb-2 block">
            Canais de Notificação
          </label>
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm cursor-pointer p-2 rounded-lg hover:bg-accent border border-border/50">
              <input
                type="checkbox"
                checked={canais.includes("inbox")}
                onChange={() => toggleCanal("inbox")}
                className="rounded border-border text-primary focus:ring-primary h-4 w-4"
              />
              <Bell size={16} className="text-primary shrink-0" />
              <div className="flex-1">
                <p className="font-medium text-xs">Caixa de Entrada no Klaus</p>
                <p className="text-[11px] text-muted-foreground">Exibe alerta no painel e topo do app</p>
              </div>
            </label>

            <label className="flex items-center gap-2 text-sm cursor-pointer p-2 rounded-lg hover:bg-accent border border-border/50">
              <input
                type="checkbox"
                checked={canais.includes("telegram")}
                onChange={() => toggleCanal("telegram")}
                className="rounded border-border text-primary focus:ring-primary h-4 w-4"
              />
              <Send size={16} className="text-sky-500 shrink-0" />
              <div className="flex-1">
                <p className="font-medium text-xs">Celular via Telegram API</p>
                <p className="text-[11px] text-muted-foreground">Dispara mensagem push no seu Telegram</p>
              </div>
            </label>

            <label className="flex items-center gap-2 text-sm cursor-pointer p-2 rounded-lg hover:bg-accent border border-border/50">
              <input
                type="checkbox"
                checked={canais.includes("email")}
                onChange={() => toggleCanal("email")}
                className="rounded border-border text-primary focus:ring-primary h-4 w-4"
              />
              <Mail size={16} className="text-emerald-500 shrink-0" />
              <div className="flex-1">
                <p className="font-medium text-xs">E-mail via Google Script</p>
                <p className="text-[11px] text-muted-foreground">Encaminha um e-mail para sua caixa de entrada</p>
              </div>
            </label>
          </div>
        </div>
      </form>
    </Modal>
  );
}
