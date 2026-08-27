import { useCronometro, LISTA_SONS_AMBIENTE } from "@/components/ContextoCronometro";
import { CabecalhoPagina } from "@/components/CabecalhoPagina";
import { Cartao, Botao } from "@/components/ui";
import { 
  CloudRain, 
  Flame, 
  Coffee, 
  Wind, 
  Waves, 
  Volume2, 
  VolumeX, 
  Play, 
  Pause,
  Headphones,
  Music,
} from "lucide-react";

export default function Sons() {
  const {
    somAmbiente,
    setSomAmbiente,
    somAmbienteTocando,
    setSomAmbienteTocando,
    volumeSomAmbiente,
    setVolumeSomAmbiente,
  } = useCronometro();

  // Mapeia o id do som para seu ícone correspondente
  const obterIcone = (id: string, classe: string) => {
    switch (id) {
      case "chuva":
        return <CloudRain className={classe} />;
      case "fogueira":
        return <Flame className={classe} />;
      case "cafeteria":
        return <Coffee className={classe} />;
      case "vento":
        return <Wind className={classe} />;
      case "ondas":
        return <Waves className={classe} />;
      default:
        return <Music className={classe} />;
    }
  };

  // Mapeia o id para um gradiente visual de fundo no card
  const obterGradiente = (id: string) => {
    switch (id) {
      case "chuva":
        return "from-blue-600/10 to-indigo-900/10 border-blue-500/25";
      case "fogueira":
        return "from-amber-600/10 to-red-900/10 border-amber-500/25";
      case "cafeteria":
        return "from-yellow-800/10 to-amber-900/10 border-amber-800/25";
      case "vento":
        return "from-teal-600/10 to-slate-900/10 border-teal-500/25";
      case "ondas":
        return "from-sky-600/10 to-cyan-900/10 border-sky-500/25";
      default:
        return "from-purple-600/10 to-pink-900/10 border-purple-500/25";
    }
  };

  const selecionarSom = (id: string) => {
    if (somAmbiente === id) {
      // Se já está selecionado, alterna play/pause
      setSomAmbienteTocando(!somAmbienteTocando);
    } else {
      // Seleciona e dá play automaticamente
      setSomAmbiente(id);
    }
  };

  const desligarTudo = () => {
    setSomAmbiente(null);
  };

  return (
    <div className="space-y-6">
      <CabecalhoPagina
        titulo="Sons de Foco"
        descricao="Crie a atmosfera sonora perfeita para bloquear distrações e entrar em estado de hiperfoco."
      />

      {/* Painel Central de Controle */}
      <div className="bg-card/40 border border-border/60 rounded-2xl p-6 backdrop-blur-md">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className={`p-4 rounded-2xl shrink-0 ${somAmbienteTocando ? "bg-primary/20 text-primary" : "bg-secondary/40 text-muted-foreground"}`}>
                <Headphones size={32} />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-foreground">
                    {somAmbiente 
                      ? `Tocando: ${LISTA_SONS_AMBIENTE.find(s => s.id === somAmbiente)?.nome}` 
                      : "Nenhum som ativo"}
                  </h2>
                  {somAmbienteTocando && (
                    <div className="flex items-end gap-0.5 h-4 ml-1">
                      <span className="w-1 bg-primary rounded-full animate-[bounce_0.8s_infinite] h-3"></span>
                      <span className="w-1 bg-primary rounded-full animate-[bounce_1.1s_infinite] h-4"></span>
                      <span className="w-1 bg-primary rounded-full animate-[bounce_0.6s_infinite] h-2"></span>
                      <span className="w-1 bg-primary rounded-full animate-[bounce_0.9s_infinite] h-3.5"></span>
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground select-none">
                  {somAmbienteTocando ? "Bloqueando ruídos externos para estado de fluxo contínuo..." : "Sons de fundo silenciados"}
                </p>
              </div>
            </div>

          {/* Slider de Volume e Botão de Mute */}
          <div className="flex items-center gap-4 w-full md:w-auto md:min-w-[300px]">
            <button
              onClick={() => setVolumeSomAmbiente(volumeSomAmbiente === 0 ? 0.5 : 0)}
              className="p-2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              title={volumeSomAmbiente === 0 ? "Ativar som" : "Mutar som"}
            >
              {volumeSomAmbiente === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
            </button>
            <div className="flex-1 flex items-center gap-2">
              <span className="text-[10px] font-mono text-muted-foreground w-6 select-none">0%</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={volumeSomAmbiente}
                onChange={(e) => setVolumeSomAmbiente(Number(e.target.value))}
                className="flex-1 accent-primary bg-secondary/80 h-1.5 rounded-lg appearance-none cursor-pointer"
                title="Ajustar volume geral"
              />
              <span className="text-[10px] font-mono text-muted-foreground w-8 select-none">
                {Math.round(volumeSomAmbiente * 100)}%
              </span>
            </div>

            {somAmbiente && (
              <Botao
                variante="perigo"
                tamanho="pequeno"
                onClick={desligarTudo}
                className="shrink-0 text-xs"
              >
                Silenciar
              </Botao>
            )}
          </div>
        </div>
      </div>

      {/* Grid de Cards de Sons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {LISTA_SONS_AMBIENTE.map((som) => {
          const ativo = somAmbiente === som.id;
          const tocando = ativo && somAmbienteTocando;

          return (
            <Cartao
              key={som.id}
              onClick={() => selecionarSom(som.id)}
              className={`border p-5 transition-colors duration-150 cursor-pointer flex flex-col justify-between min-h-[160px] ${obterGradiente(som.id)} ${
                ativo ? "ring-2 ring-primary bg-card/60" : "bg-card/20 hover:bg-card/50"
              }`}
            >
              <div className="flex justify-between items-start gap-4">
                <div className="space-y-1 flex-1">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block select-none">
                    Ruído Branco
                  </span>
                  <h3 className="text-base font-bold text-foreground">
                    {som.nome}
                  </h3>
                </div>
                <div className={`p-2.5 rounded-xl shrink-0 ${ativo ? "bg-primary/10 text-primary" : "bg-secondary/40 text-muted-foreground"}`}>
                  {obterIcone(som.id, "h-5 w-5")}
                </div>
              </div>

              <div className="flex items-center justify-between mt-6 pt-3 border-t border-border/40">
                <span className="text-xs font-medium text-muted-foreground select-none">
                  {tocando ? "Reproduzindo" : ativo ? "Pausado" : "Inativo"}
                </span>

                <Botao
                  variante={tocando ? "neutro" : "primario"}
                  tamanho="pequeno"
                  className="rounded-lg h-8 px-3 shrink-0 flex items-center gap-1.5 text-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    selecionarSom(som.id);
                  }}
                >
                  {tocando ? (
                    <>
                      <Pause size={12} /> Pausar
                    </>
                  ) : (
                    <>
                      <Play size={12} /> {ativo ? "Retomar" : "Ouvir"}
                    </>
                  )}
                </Botao>
              </div>
            </Cartao>
          );
        })}
      </div>
    </div>
  );
}
