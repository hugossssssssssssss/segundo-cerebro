import { describe, it, expect } from "vitest";
import {
  gerarYamlWorkflowLembretes,
  CAMINHO_WORKFLOW_LEMBRETES,
  gerarYamlWorkflowEquipe,
  CAMINHO_WORKFLOW_EQUIPE,
} from "./instaladorWorkflow";

describe("instaladorWorkflow - Agendador Autônomo e Robô de Equipe GitHub Actions", () => {
  it("gera YAML de workflow com agendamento cron e variáveis do Telegram", () => {
    const yaml = gerarYamlWorkflowLembretes("12345678");

    expect(CAMINHO_WORKFLOW_LEMBRETES).toBe(".github/workflows/klaus-lembretes.yml");
    expect(yaml).toContain("cron: '0 * * * *'");
    expect(yaml).toContain("secrets.TELEGRAM_BOT_TOKEN");
    expect(yaml).toContain('TELEGRAM_CHAT_ID: "12345678"');
    expect(yaml).toContain("actions/checkout@v4");
  });

  it("gera YAML de robô de colaboração e equipe para GitHub Actions", () => {
    const yaml = gerarYamlWorkflowEquipe("98765432");

    expect(CAMINHO_WORKFLOW_EQUIPE).toBe(".github/workflows/klaus-equipe.yml");
    expect(yaml).toContain("tarefas/**");
    expect(yaml).toContain("notas/**");
    expect(yaml).toContain("pdi/**");
    expect(yaml).toContain("GITHUB_STEP_SUMMARY");
    expect(yaml).toContain('TELEGRAM_CHAT_ID: "98765432"');
  });
});
