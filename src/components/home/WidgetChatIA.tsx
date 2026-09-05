import { useState } from "react";
import { Send, Sparkles, Sun, Target, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFerramentasFlutuantes } from "@/components/ContextoFerramentasFlutuantes";

interface WidgetChatIAProps {
  aoAbrirPopup?: (mensagem?: string) => void;
}

export function WidgetChatIA({ aoAbrirPopup }: WidgetChatIAProps) {
  const { abrirFerramentaFlutuante } = useFerramentasFlutuantes();
  const [mensagem, setMensagem] = useState("");

  const dispararMensagem = (textoParaEnviar: string) => {
    const limpo = textoParaEnviar.trim();
    if (!limpo) return;

    if (aoAbrirPopup) {
      aoAbrirPopup(limpo);
    } else {
      abrirFerramentaFlutuante("chat_ia", { mensagemInicial: limpo });
    }
    setMensagem("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    dispararMensagem(mensagem);
  };

  const sugestoesRapidas = [
    { rotulo: "Resumo do dia", icone: Sun, prompt: "Faça um resumo rápido do meu dia com base nas tarefas e notas." },
    { rotulo: "Prioridades", icone: Target, prompt: "Quais devem ser minhas principais prioridades para focar agora?" },
    { rotulo: "Ideias criativas", icone: Lightbulb, prompt: "Me dê 3 ideias criativas para explorar com base no meu acervo." },
  ];

  return (
    <div className="flex flex-col justify-between h-full space-y-3">
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            <Sparkles size={13} className="text-primary" />
            <span>Assistente IA Klaus</span>
          </p>
          <span className="text-[10px] text-muted-foreground bg-secondary/80 px-2 py-0.5 rounded-full">
            Gemini
          </span>
        </div>
        <p className="text-[11px] text-muted-foreground line-clamp-1">
          Digite qualquer dúvida ou pedido e aperte Enter para resposta instantânea.
        </p>

        {/* Sugestões Rápidas de 1 Clique */}
        <div className="flex items-center gap-1.5 pt-1 overflow-x-auto no-scrollbar">
          {sugestoesRapidas.map((s, idx) => {
            const Icone = s.icone;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => dispararMensagem(s.prompt)}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium bg-secondary/60 hover:bg-primary/10 hover:text-primary border border-border/50 transition-colors whitespace-nowrap cursor-pointer text-muted-foreground"
              >
                <Icone size={10} className="text-primary" />
                <span>{s.rotulo}</span>
              </button>
            );
          })}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <input
          type="text"
          value={mensagem}
          onChange={(e) => setMensagem(e.target.value)}
          placeholder="Pergunte algo ou peça para criar uma nota/tarefa..."
          className="flex-1 text-xs bg-background/80 border border-border/80 rounded-xl px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary shadow-xs"
        />
        <Button size="sm" type="submit" disabled={!mensagem.trim()} className="h-8 px-3 rounded-xl text-xs font-semibold shrink-0 shadow-xs">
          <Send size={12} className="mr-1" />
          Perguntar
        </Button>
      </form>
    </div>
  );
}
