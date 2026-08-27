import { useState } from "react";
import { Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

interface WidgetChatIAProps {
  aoAbrirPopup: () => void;
}

export function WidgetChatIA({ aoAbrirPopup }: WidgetChatIAProps) {
  const [mensagem, setMensagem] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mensagem.trim()) return;
    aoAbrirPopup();
  };

  return (
    <div className="flex flex-col justify-between h-full space-y-3">
      <div className="space-y-1">
        <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
          <Sparkles size={13} className="text-primary" />
          <span>Assistente IA Klaus (Gemini)</span>
        </p>
        <p className="text-[11px] text-muted-foreground">
          Pergunte algo sobre suas notas, resumos, tarefas ou peça ajuda criativa.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <input
          type="text"
          value={mensagem}
          onChange={(e) => setMensagem(e.target.value)}
          placeholder="Como posso te ajudar hoje?..."
          className="flex-1 text-xs bg-background/60 border border-border/70 rounded-lg px-2.5 py-1.5 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-border"
        />
        <Button size="sm" type="submit" className="h-8 px-3 rounded-lg text-xs font-semibold">
          <Send size={12} className="mr-1" />
          Perguntar
        </Button>
      </form>
    </div>
  );
}
