import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CheckSquare, FileText, ArrowRight, Sun, Sunrise, Sunset, Moon } from "lucide-react";
import { lerConfig, configCompleta } from "@/lib/settings";
import { carregarRepo, daPasta } from "@/lib/repo";
import { comoTarefa, ordenar, type Tarefa } from "@/lib/tarefas";
import { tituloProvavel } from "@/lib/markdown";
import { Cartao, Carregando, Botao, Vazio, Selo } from "@/components/ui";

type NotaRecente = {
  caminho: string;
  titulo: string;
  nome: string;
};

export default function Home() {
  const cfg = lerConfig();
  const pronto = configCompleta(cfg);

  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [tarefasPendentes, setTarefasPendentes] = useState<Tarefa[]>([]);
  const [notasRecentes, setNotasRecentes] = useState<NotaRecente[]>([]);
  const [saudacao, setSaudacao] = useState("");
  const [IconeTempo, setIconeTempo] = useState<any>(Sun);

  useEffect(() => {
    const hora = new Date().getHours();
    if (hora < 6) {
      setSaudacao("Boa madrugada");
      setIconeTempo(() => Moon);
    } else if (hora < 12) {
      setSaudacao("Bom dia");
      setIconeTempo(() => Sunrise);
    } else if (hora < 18) {
      setSaudacao("Boa tarde");
      setIconeTempo(() => Sun);
    } else {
      setSaudacao("Boa noite");
      setIconeTempo(() => Sunset);
    }
  }, []);

  const carregar = useCallback(async () => {
    if (!pronto) {
      setCarregando(false);
      return;
    }
    setCarregando(true);
    setErro("");
    try {
      const todos = await carregarRepo(cfg);
      
      const itensTarefas = daPasta(todos, "tarefas");
      const tarefas = ordenar(
        itensTarefas.map((i) => comoTarefa(i.doc, i.caminho, i.sha, tituloProvavel(i.doc, i.nome)))
      );
      setTarefasPendentes(tarefas.filter(t => t.status !== "feito").slice(0, 5));

      const itensNotas = daPasta(todos, "notas");
      setNotasRecentes(
        itensNotas.slice(0, 5).map(i => ({
          caminho: i.caminho,
          titulo: tituloProvavel(i.doc, i.nome),
          nome: i.nome
        }))
      );
      
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e));
    } finally {
      setCarregando(false);
    }
  }, [pronto, cfg.repoOwner, cfg.repoName, cfg.githubToken, cfg.branch]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  if (!pronto) {
    return (
      <Vazio
        titulo="Bem-vindo ao Segundo Cérebro"
        descricao="Conecte sua conta do GitHub para começar a organizar suas tarefas e notas num lugar só."
        acao={
          <Link to="/config">
            <Botao>Ir para Ajustes</Botao>
          </Link>
        }
      />
    );
  }

  if (carregando) {
    return <Carregando texto="Sincronizando seu cérebro..." />;
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Cabeçalho */}
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <IconeTempo size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{saudacao}</h1>
          <p className="text-muted-foreground">Aqui está o resumo do seu dia.</p>
        </div>
      </div>

      {erro && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {erro}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Coluna Tarefas */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-medium">
              <CheckSquare size={18} className="text-primary" />
              Próximas Tarefas
            </h2>
            <Link to="/tarefas" className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1">
              Ver todas <ArrowRight size={12} />
            </Link>
          </div>
          
          {tarefasPendentes.length === 0 ? (
            <Cartao className="flex flex-col items-center justify-center p-8 text-center text-sm text-muted-foreground">
              <CheckSquare size={32} className="mb-3 opacity-20" />
              <p>Tudo limpo por aqui.</p>
            </Cartao>
          ) : (
            <div className="grid gap-2">
              {tarefasPendentes.map(t => (
                <Cartao key={t.caminho} className="p-3.5 flex items-start gap-3 transition-colors hover:bg-accent/50 group">
                  <div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border border-border group-hover:border-primary/50 transition-colors" />
                  <div>
                    <p className="font-medium text-sm leading-tight">{t.titulo}</p>
                    {t.tags.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {t.tags.map(tag => <Selo key={tag} className="text-[10px] py-0">#{tag}</Selo>)}
                      </div>
                    )}
                  </div>
                </Cartao>
              ))}
            </div>
          )}
        </div>

        {/* Coluna Notas */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-medium">
              <FileText size={18} className="text-primary" />
              Notas Recentes
            </h2>
            <Link to="/notas" className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1">
              Ir para notas <ArrowRight size={12} />
            </Link>
          </div>

          {notasRecentes.length === 0 ? (
            <Cartao className="flex flex-col items-center justify-center p-8 text-center text-sm text-muted-foreground">
              <FileText size={32} className="mb-3 opacity-20" />
              <p>Nenhuma nota ainda.</p>
            </Cartao>
          ) : (
            <div className="grid gap-2">
              {notasRecentes.map(n => (
                <Cartao key={n.caminho} className="p-3.5 transition-colors hover:bg-accent/50">
                  <p className="font-medium text-sm truncate">{n.titulo}</p>
                  <p className="mt-1 text-xs text-muted-foreground truncate">{n.nome}</p>
                </Cartao>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
