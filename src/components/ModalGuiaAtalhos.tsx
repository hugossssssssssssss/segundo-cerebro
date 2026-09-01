import { Modal } from "@/components/ui";
import { formatarAtalho } from "@/lib/utils";

interface ModalGuiaAtalhosProps {
  aberto: boolean;
  aoFechar: () => void;
}

interface GrupoAtalhos {
  titulo: string;
  atalhos: { teclas: string[]; descricao: string }[];
}

const GRUPOS_ATALHOS: GrupoAtalhos[] = [
  {
    titulo: "Navegação e Ações Globais",
    atalhos: [
      { teclas: ["⌘", "K"], descricao: "Busca global rápida em todo o repositório" },
      { teclas: ["⌘", "J"], descricao: "Captura rápida (criação instantânea de notas/tarefas)" },
      { teclas: ["⌘", "B"], descricao: "Recolher ou expandir menu lateral" },
      { teclas: ["⌘", "Shift", "L"], descricao: "Alternar entre tema Claro e Escuro" },
      { teclas: ["⌘", "/"], descricao: "Abrir este guia de atalhos do teclado" },
      { teclas: ["Esc"], descricao: "Fechar janelas, painéis e modais abertos" },
    ],
  },
  {
    titulo: "Produtividade no Kanban de Tarefas",
    atalhos: [
      { teclas: ["1 clique no círculo"], descricao: "Marcar tarefa como feita ou reabrir instantaneamente" },
      { teclas: ["Enter no rodapé"], descricao: "Criar tarefa rápida inline na coluna" },
      { teclas: ["Botão (...) ou clique direito"], descricao: "Menu de ações: adiar prazo, duplicar, vincular PDI" },
      { teclas: ["Tab / Espaço"], descricao: "Mover cartões de coluna via teclado (Acessibilidade)" },
    ],
  },
  {
    titulo: "Editor e Conexões",
    atalhos: [
      { teclas: ["@"], descricao: "Mencionar e vincular outra nota, tarefa ou projeto" },
      { teclas: ["/"], descricao: "Menu de blocos do editor Notion (títulos, listas, código)" },
      { teclas: ["Abas no topo"], descricao: "Alternar entre Documento, Tarefas, Moodboard e Conexões" },
    ],
  },
];

export function ModalGuiaAtalhos({ aberto, aoFechar }: ModalGuiaAtalhosProps) {
  if (!aberto) return null;

  return (
    <Modal
      aberto={aberto}
      aoFechar={aoFechar}
      titulo="Atalhos do Teclado no Klaus"
      tamanho="largo"
    >
      <div className="space-y-5 pt-1 max-h-[70vh] overflow-y-auto pr-1">
        <p className="text-xs text-muted-foreground -mt-2">
          Acelere seu fluxo de trabalho com combinações de teclas rápidas.
        </p>
        {GRUPOS_ATALHOS.map((grupo) => (
          <div key={grupo.titulo} className="space-y-2">
            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              {grupo.titulo}
            </h4>
            <div className="rounded-xl border border-border/70 bg-card/60 divide-y divide-border/40 overflow-hidden">
              {grupo.atalhos.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between gap-3 px-3 py-2 text-xs"
                >
                  <span className="text-foreground/90 font-medium">{item.descricao}</span>
                  <div className="flex items-center gap-1 shrink-0">
                    {item.teclas.map((k, i) => (
                      <kbd
                        key={i}
                        className="px-1.5 py-0.5 rounded-md bg-secondary text-secondary-foreground text-[11px] font-mono font-semibold border border-border/80 shadow-2xs"
                      >
                        {formatarAtalho(k)}
                      </kbd>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
}
