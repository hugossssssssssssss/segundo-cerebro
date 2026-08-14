import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Moon, Sun, Sunrise, Sunset, Activity, FileText, Calendar } from "lucide-react";
import { lerConfig, configCompleta } from "@/lib/settings";
import { carregarRepo, daPasta } from "@/lib/repo";
import { comoTarefa, ordenar, type Tarefa } from "@/lib/tarefas";
import { tituloProvavel } from "@/lib/markdown";

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Carregando, Vazio } from "@/components/ui";

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
  const [totalTarefas, setTotalTarefas] = useState(0);
  const [totalNotas, setTotalNotas] = useState(0);

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
      const pendentes = tarefas.filter(t => t.status !== "feito");
      setTotalTarefas(pendentes.length);
      setTarefasPendentes(pendentes.slice(0, 4));

      const itensNotas = daPasta(todos, "notas");
      setTotalNotas(itensNotas.length);
      setNotasRecentes(
        itensNotas.slice(0, 4).map(i => ({
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
            <Button>Ir para Ajustes</Button>
          </Link>
        }
      />
    );
  }

  if (carregando) {
    return <Carregando texto="Sincronizando seu cérebro..." />;
  }

  return (
    <div className="flex-1 space-y-8 animate-in fade-in duration-500 max-w-5xl mx-auto p-4 md:p-8">
      {/* Header (Taxonomy Style) */}
      <div className="flex items-center justify-between">
        <div className="grid gap-1">
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
            {saudacao}
          </h1>
          <p className="text-lg text-muted-foreground">
            Aqui está o resumo do seu espaço de trabalho hoje.
          </p>
        </div>
        <div className="hidden md:flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <IconeTempo size={32} />
        </div>
      </div>

      {erro && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {erro}
        </div>
      )}

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tarefas Pendentes</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTarefas}</div>
            <p className="text-xs text-muted-foreground">
              Esperando sua ação
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Notas Criadas</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalNotas}</div>
            <p className="text-xs text-muted-foreground">
              Registros no repositório
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Tarefas Board */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Próximas Tarefas</CardTitle>
            <CardDescription>O que você precisa focar agora.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            {tarefasPendentes.length === 0 ? (
              <div className="flex h-[150px] flex-col items-center justify-center rounded-md border border-dashed text-center animate-in fade-in-50">
                <Calendar className="h-8 w-8 text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">Você não tem tarefas urgentes.</p>
              </div>
            ) : (
              tarefasPendentes.map(t => (
                <Link key={t.caminho} to={`/tarefas?abrir=${encodeURIComponent(t.caminho)}`}>
                  <div className="flex items-center space-x-4 rounded-md border p-4 transition-all hover:bg-muted/50">
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium leading-none">{t.titulo}</p>
                      {t.tags.length > 0 && (
                        <div className="flex gap-2 pt-2">
                          {t.tags.map(tag => <Badge variant="secondary" key={tag}>{tag}</Badge>)}
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              ))
            )}
          </CardContent>
          <CardFooter>
            <Link to="/tarefas" className="w-full">
              <Button variant="outline" className="w-full">Ver todas as tarefas</Button>
            </Link>
          </CardFooter>
        </Card>

        {/* Notas Board */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Notas Recentes</CardTitle>
            <CardDescription>Seus últimos registros e aprendizados.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            {notasRecentes.length === 0 ? (
              <div className="flex h-[150px] flex-col items-center justify-center rounded-md border border-dashed text-center animate-in fade-in-50">
                <FileText className="h-8 w-8 text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">Nenhuma nota criada recentemente.</p>
              </div>
            ) : (
              notasRecentes.map(n => (
                <Link key={n.caminho} to={`/notas?abrir=${encodeURIComponent(n.caminho)}`}>
                  <div className="flex items-center space-x-4 rounded-md border p-4 transition-all hover:bg-muted/50">
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium leading-none">{n.titulo}</p>
                      <p className="text-xs text-muted-foreground truncate max-w-[200px] sm:max-w-[300px]">
                        {n.nome}
                      </p>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </CardContent>
          <CardFooter>
            <Link to="/notas" className="w-full">
              <Button variant="outline" className="w-full">Ver todas as notas</Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
