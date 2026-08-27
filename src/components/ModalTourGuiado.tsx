import { useState } from "react";
import {
  Sparkles,
  FileText,
  CheckSquare,
  Image as ImageIcon,
  Target,
  Network,
  Bot,
  Zap,
  ArrowRight,
  ArrowLeft,
  X,
  CheckCircle2,
} from "lucide-react";
import { Botao } from "./ui";

interface ModalTourGuiadoProps {
  aberta: boolean;
  aoFechar: () => void;
}

interface ItemTour {
  id: string;
  titulo: string;
  subtitulo: string;
  icone: typeof Sparkles;
  corIcone: string;
  descricao: string;
  destaques: string[];
  dicaPro: string;
}

const ETAPAS_TOUR: ItemTour[] = [
  {
    id: "notas",
    titulo: "Notas Conectadas & @Menções",
    subtitulo: "Seu cofre de pensamentos e ideias interligadas",
    icone: FileText,
    corIcone: "text-amber-500 bg-amber-500/10 border-amber-500/20",
    descricao:
      "Escreva em Markdown fluido estilo Notion. Digite `@` em qualquer lugar do texto para vincular projetos, tarefas ou conceitos instantaneamente.",
    destaques: [
      "Links bidirecionais automáticos: veja onde cada nota foi mencionada",
      "Formatador de rich-text com suporte a listas, subtarefas e imagens",
      "Arquivos puros salvos diretamente no seu repositório do GitHub",
    ],
    dicaPro: "Dica de ouro: Use @NomeDoProjeto dentro de qualquer anotação para criar uma teia orgânica de informações.",
  },
  {
    id: "tarefas",
    titulo: "Tarefas, Kanban & Foco Pomodoro",
    subtitulo: "Organização ágil adaptada ao fluxo criativo",
    icone: CheckSquare,
    corIcone: "text-blue-500 bg-blue-500/10 border-blue-500/20",
    descricao:
      "Gerencie suas entregas em visualizações de Lista ou Quadro Kanban. Acompanhe prioridades, prazos e use o temporizador Pomodoro integrado.",
    destaques: [
      "Quadro Kanban com status visual: A Fazer, Em Andamento e Concluído",
      "Subtarefas dinâmicas com contagem de progresso em tempo real",
      "Sons ambientes relaxantes (chuva, café, lofi) no cabeçalho",
    ],
    dicaPro: "Ative o cronômetro Pomodoro no topo da tela para registrar blocos de foco direto nas suas tarefas.",
  },
  {
    id: "referencias",
    titulo: "Mural Visual & Paletas de Cor",
    subtitulo: "Inspirações visuais para projetos de design",
    icone: ImageIcon,
    corIcone: "text-pink-500 bg-pink-500/10 border-pink-500/20",
    descricao:
      "Cole prints, fotos e referências de identidade visual. O Klaus extrai automaticamente as paletas de cores em código HEX com 1-clique para copiar.",
    destaques: [
      "Extração inteligente de cores dominantes HEX em cada imagem",
      "Organização por tags visuais (ex: #branding, #tipografia, #ui)",
      "Lightbox com zoom em alta resolução e visualização fluida",
    ],
    dicaPro: "Clique em qualquer amostra de cor para copiar o código HEX direto para o seu Illustrator ou Figma.",
  },
  {
    id: "pdi",
    titulo: "Plano de Desenvolvimento Individual (PDI)",
    subtitulo: "Evolução de carreira e metas mensuráveis",
    icone: Target,
    corIcone: "text-teal-500 bg-teal-500/10 border-teal-500/20",
    descricao:
      "Defina objetivos trimestrais claros e conecte entregas práticas para acompanhar a evolução das suas habilidades e conquistas profissionais.",
    destaques: [
      "Cálculo automático de porcentagem de conclusão por meta",
      "Prazos, status e histórico de entregas registradas",
      "Visão estratégica clara do seu crescimento trimestral",
    ],
    dicaPro: "Vincule notas de aprendizado ou projetos reais a cada entrega do seu PDI.",
  },
  {
    id: "grafo",
    titulo: "Grafo Neural 3D & Lousas",
    subtitulo: "Visualização espacial de como tudo se conecta",
    icone: Network,
    corIcone: "text-cyan-500 bg-cyan-500/10 border-cyan-500/20",
    descricao:
      "Explore uma galáxia tridimensional de conexões entre suas notas, tarefas e metas, ou abra uma Lousa infinita para desenhar e rascunhar.",
    destaques: [
      "Navegação orbital 3D por clusters de conhecimento e tags",
      "Lousas infinitas baseadas no Excalidraw para diagramas e wireframes",
      "Busca visual direta no mapa de relações",
    ],
    dicaPro: "Use a roda do mouse ou pinça no celular para dar zoom e viajar pelas conexões das suas ideias.",
  },
  {
    id: "ia",
    titulo: "Assistente IA Gemini Sob Seu Controle",
    subtitulo: "Inteligência artificial para sintetizar e sugerir",
    icone: Bot,
    corIcone: "text-purple-500 bg-purple-500/10 border-purple-500/20",
    descricao:
      "O assistente lê seus documentos com permissão pontual para gerar resumos, sugerir tags, organizar briefings e transcrever áudios.",
    destaques: [
      "100% sob sua aprovação: nada é gravado sem você conferir",
      "Chat contextual integrado com seus próprios documentos",
      "Transcritor de voz inteligente e análise de imagens",
    ],
    dicaPro: "Use o chat para pedir: 'Quais são as minhas prioridades para esta semana?' ou 'Resuma este briefing'.",
  },
  {
    id: "atalhos",
    titulo: "Atalhos Rápidos de Produtividade",
    subtitulo: "Acesso instantâneo sem tirar a mão do teclado",
    icone: Zap,
    corIcone: "text-amber-500 bg-amber-500/10 border-amber-500/20",
    descricao:
      "O Klaus foi desenhado para ser ultrarrápido com atalhos de teclado modernos e interface limpa.",
    destaques: [
      "⌘K ou Ctrl+K: Busca Global instantânea em todo o acervo",
      "⌘J ou Ctrl+J: Captura Rápida de pensamento em 1 segundo",
      "⌘B ou Ctrl+B: Ocultar ou exibir a barra de navegação lateral",
    ],
    dicaPro: "Pressione ⌘K a qualquer momento para pular direto para qualquer nota, tarefa ou referência.",
  },
];

export function ModalTourGuiado({ aberta, aoFechar }: ModalTourGuiadoProps) {
  const [etapa, setEtapa] = useState(0);

  if (!aberta) return null;

  const itemAtual = ETAPAS_TOUR[etapa];
  const IconeAtual = itemAtual.icone;
  const ehPrimeira = etapa === 0;
  const ehUltima = etapa === ETAPAS_TOUR.length - 1;

  const proxima = () => {
    if (ehUltima) {
      aoFechar();
    } else {
      setEtapa((e) => e + 1);
    }
  };

  const anterior = () => {
    if (!ehPrimeira) {
      setEtapa((e) => e - 1);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-xl bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Topo do Modal */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-secondary/30">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
              <Sparkles size={16} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-foreground">Tour Guiado pelo Klaus</h2>
              <p className="text-[11px] text-muted-foreground">
                Passo {etapa + 1} de {ETAPAS_TOUR.length}: {itemAtual.titulo.split("&")[0]}
              </p>
            </div>
          </div>
          <button
            onClick={aoFechar}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            title="Fechar tour"
          >
            <X size={18} />
          </button>
        </div>

        {/* Trilha de Progresso */}
        <div className="flex gap-1 px-5 pt-3 pb-1 bg-card">
          {ETAPAS_TOUR.map((t, idx) => (
            <button
              key={t.id}
              onClick={() => setEtapa(idx)}
              className="flex-1 h-1.5 rounded-full transition-all focus:outline-none"
              style={{
                backgroundColor:
                  idx === etapa
                    ? "var(--primary)"
                    : idx < etapa
                    ? "rgba(var(--primary-rgb, 59, 130, 246), 0.4)"
                    : "var(--border)",
              }}
              title={t.titulo}
            />
          ))}
        </div>

        {/* Conteúdo da Etapa */}
        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto">
          {/* Header da Etapa */}
          <div className="flex items-start gap-3.5">
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border ${itemAtual.corIcone}`}
            >
              <IconeAtual size={24} />
            </div>
            <div className="space-y-1">
              <h3 className="text-base sm:text-lg font-bold text-foreground leading-tight">
                {itemAtual.titulo}
              </h3>
              <p className="text-xs text-muted-foreground">{itemAtual.subtitulo}</p>
            </div>
          </div>

          <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed">
            {itemAtual.descricao}
          </p>

          {/* Destaques em Cartões */}
          <div className="space-y-2">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
              Recursos Principais
            </span>
            <div className="space-y-1.5">
              {itemAtual.destaques.map((dest, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2.5 p-2.5 rounded-lg border border-border bg-secondary/20 text-xs text-foreground"
                >
                  <CheckCircle2 size={15} className="text-primary shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{dest}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Dica Pro */}
          <div className="p-3 rounded-xl border border-primary/20 bg-primary/5 text-xs text-muted-foreground flex items-start gap-2.5">
            <Zap size={15} className="text-primary shrink-0 mt-0.5" />
            <span className="leading-relaxed font-medium text-foreground/90">
              {itemAtual.dicaPro}
            </span>
          </div>
        </div>

        {/* Rodapé de Ações */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-border bg-secondary/30">
          <button
            onClick={anterior}
            disabled={ehPrimeira}
            className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
              ehPrimeira
                ? "opacity-0 pointer-events-none"
                : "text-muted-foreground hover:text-foreground hover:bg-accent"
            }`}
          >
            <ArrowLeft size={14} />
            Anterior
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={aoFechar}
              className="px-3 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Pular tour
            </button>
            <Botao onClick={proxima} className="text-xs font-semibold px-4 py-2">
              {ehUltima ? "Concluir Tour" : "Próximo"}
              {!ehUltima && <ArrowRight size={14} />}
            </Botao>
          </div>
        </div>
      </div>
    </div>
  );
}
