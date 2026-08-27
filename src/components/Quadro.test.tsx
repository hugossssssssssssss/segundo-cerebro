import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Quadro } from "./Quadro";
import type { Tarefa } from "@/lib/tarefas";
import { CronometroProvider } from "./ContextoCronometro";

afterEach(cleanup);

function tarefa(titulo: string, status: Tarefa["status"], extra?: Partial<Tarefa>): Tarefa {
  return {
    bruto: {},
    caminho: `tarefas/${titulo.toLowerCase().replace(/\s/g, "-")}.md`,
    sha: "abc",
    titulo,
    status,
    tags: [],
    corpo: "",
    ...extra,
  };
}

const tarefas = [
  tarefa("Revisar layout", "a-fazer"),
  tarefa("Fechar briefing", "fazendo"),
  tarefa("Entregar logo", "feito"),
  tarefa("Ligar para grafica", "a-fazer"),
];

function montar(props?: Partial<React.ComponentProps<typeof Quadro>>) {
  const aoAbrir = vi.fn();
  const aoCronometrar = vi.fn();
  const aoMudarStatus = vi.fn();
  render(
    <CronometroProvider>
      <Quadro
        tarefas={tarefas}
        aoAbrir={aoAbrir}
        aoCronometrar={aoCronometrar}
        aoMudarStatus={aoMudarStatus}
        gravandoCaminho={null}
        {...props}
      />
    </CronometroProvider>,
  );
  return { aoAbrir, aoCronometrar, aoMudarStatus };
}

describe("Quadro", () => {
  it("mostra as três colunas com a contagem certa", () => {
    montar();
    expect(screen.getAllByText("A fazer")[0]).toBeTruthy();
    expect(screen.getAllByText("Fazendo")[0]).toBeTruthy();
    expect(screen.getAllByText("Feito")[0]).toBeTruthy();
  });

  it("põe cada tarefa na coluna do seu status", () => {
    montar();
    // as quatro aparecem, distribuídas
    for (const t of tarefas) expect(screen.getByText(t.titulo)).toBeTruthy();
  });

  it("clicar no cartão abre a tarefa — não inicia arrasto", () => {
    // o cartão inteiro arrastável impedia abrir no celular; a alça é separada
    const { aoAbrir } = montar();
    screen.getByText("Revisar layout").click();
    expect(aoAbrir).toHaveBeenCalledTimes(1);
    expect(aoAbrir.mock.calls[0][0].titulo).toBe("Revisar layout");
  });

  it("cada cartão tem uma alça de arrastar com nome acessível", () => {
    montar();
    // é o que permite mover pelo teclado, sem mouse
    expect(screen.getByLabelText("Mover Revisar layout")).toBeTruthy();
    expect(screen.getByLabelText("Mover Entregar logo")).toBeTruthy();
  });

  it("tarefa feita não oferece pomodoro", () => {
    montar();
    const botoes = screen.getAllByTitle("Iniciar pomodoro");
    // três não-feitas => três cronômetros
    expect(botoes).toHaveLength(3);
  });

  it("inicia o pomodoro da tarefa certa", async () => {
    const { aoCronometrar } = montar();
    await userEvent.click(screen.getAllByTitle("Iniciar pomodoro")[0]);
    expect(aoCronometrar).toHaveBeenCalledTimes(1);
  });

  it("coluna vazia convida a soltar algo, em vez de sumir", () => {
    montar({ tarefas: [tarefa("Só uma", "a-fazer")] });
    // duas colunas ficam vazias e continuam sendo alvo de soltura
    expect(screen.getAllByText("Arraste algo para cá")).toHaveLength(2);
  });

  it("mostra prazo, pomodoro e passos no cartão", () => {
    montar({
      tarefas: [
        tarefa("Com tudo", "a-fazer", {
          prazo: "2020-01-01",
          corpo: "## Tempo\n- 2026-08-13 14:20 → 14:45 (25min)\n\n- [x] um\n- [ ] dois",
          tags: ["cliente"],
        }),
      ],
    });
    expect(screen.getByText(/atrasada/)).toBeTruthy();
    expect(screen.getByText("25min")).toBeTruthy();
    expect(screen.getByText("1/2 passos")).toBeTruthy();
    expect(screen.getByText("#cliente")).toBeTruthy();
  });
});
