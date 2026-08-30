import { describe, it, expect } from "vitest";
import { gerarYamlWorkflowLembretes, CAMINHO_WORKFLOW_LEMBRETES } from "./instaladorWorkflow";

describe("instaladorWorkflow - Agendador Autônomo GitHub Actions", () => {
  it("gera YAML de workflow com agendamento cron e variáveis do Telegram", () => {
    const yaml = gerarYamlWorkflowLembretes("12345678");

    expect(CAMINHO_WORKFLOW_LEMBRETES).toBe(".github/workflows/klaus-lembretes.yml");
    expect(yaml).toContain("cron: '0 * * * *'");
    expect(yaml).toContain("secrets.TELEGRAM_BOT_TOKEN");
    expect(yaml).toContain('TELEGRAM_CHAT_ID: "12345678"');
    expect(yaml).toContain("actions/checkout@v4");
  });
});
