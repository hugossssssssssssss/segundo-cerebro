/**
 * Instalador do Workflow Autônomo de Lembretes do Klaus (GitHub Actions Cron)
 *
 * Cria o workflow `.github/workflows/klaus-lembretes.yml` diretamente no
 * repositório privado de dados do usuário, permitindo que lembretes do Telegram
 * disparem na hora certa a custo zero, sem precisar de servidor ou do app aberto.
 */

import type { Settings } from "./settings";
import { gravar, ler } from "./github";

export const CAMINHO_WORKFLOW_LEMBRETES = ".github/workflows/klaus-lembretes.yml";

export function gerarYamlWorkflowLembretes(chatId: string): string {
  return `name: Klaus - Notificador de Lembretes

on:
  schedule:
    # Executa a cada hora no minuto 0 (horário UTC)
    - cron: '0 * * * *'
  workflow_dispatch: # Permite disparo manual pelo GitHub

jobs:
  verificar-lembretes:
    runs-on: ubuntu-latest
    steps:
      - name: Baixar repositório de dados
        uses: actions/checkout@v4

      - name: Executar verificador de lembretes Klaus
        env:
          TELEGRAM_BOT_TOKEN: \${{ secrets.TELEGRAM_BOT_TOKEN }}
          TELEGRAM_CHAT_ID: "${chatId || ""}"
        run: |
          node - << 'EOF'
          const fs = require('fs');
          const path = require('path');

          const token = process.env.TELEGRAM_BOT_TOKEN;
          const chatId = process.env.TELEGRAM_CHAT_ID;

          if (!token || !chatId) {
            console.log("Token ou Chat ID do Telegram não configurados. Encerrando.");
            process.exit(0);
          }

          const hoje = new Date().toISOString().slice(0, 10);
          console.log("Verificando lembretes para a data:", hoje);

          const pastas = ['tarefas', 'notas'];
          const pendencias = [];

          for (const pasta of pastas) {
            if (!fs.existsSync(pasta)) continue;
            const arquivos = fs.readdirSync(pasta).filter(f => f.endsWith('.md'));

            for (const arq of arquivos) {
              const caminho = path.join(pasta, arq);
              const conteudo = fs.readFileSync(caminho, 'utf8');

              // Verifica se a tarefa já está feita ou vista
              if (conteudo.includes('status: feito') || conteudo.includes('status: "feito"') || conteudo.includes('visto_em:')) {
                continue;
              }

              // Busca prazos ou tags de lembrete
              const matchPrazo = conteudo.match(/prazo:\\s*["']?(\\d{4}-\\d{2}-\\d{2})/);
              const matchLembrete = conteudo.match(/\\[⏰\\s*Lembrete:\\s*([^|\\]]+)\\|\\s*([\\d\\s\\-:T]+)\\]/);

              const matchTitulo = conteudo.match(/titulo:\\s*["']?([^"'\\n]+)/);
              const titulo = matchTitulo ? matchTitulo[1] : arq.replace('.md', '');

              if (matchPrazo && matchPrazo[1] <= hoje) {
                pendencias.push(\`⏰ *Tarefa:* \${titulo} (Prazo: \${matchPrazo[1]})\`);
              } else if (matchLembrete && matchLembrete[2].slice(0, 10) <= hoje) {
                pendencias.push(\`⏰ *Lembrete:* \${matchLembrete[1].trim()}\`);
              }
            }
          }

          if (pendencias.length === 0) {
            console.log("Nenhum lembrete pendente para hoje.");
            process.exit(0);
          }

          const texto = \`🧠 *Klaus - Lembretes do Dia*\n\nVocê tem \${pendencias.length} item(ns) aguardando sua atenção:\n\n\` + pendencias.join('\\n');

          fetch(\`https://api.telegram.org/bot\${token}/sendMessage\`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              text: texto,
              parse_mode: 'Markdown'
            })
          }).then(res => {
            console.log("Status Telegram:", res.status);
          }).catch(err => {
            console.error("Erro ao enviar Telegram:", err);
          });
          EOF
`;
}

/**
 * Instala o workflow de lembretes no repositório de dados do usuário via GitHub Contents API.
 */
export async function instalarWorkflowLembretes(
  cfg: Settings,
): Promise<{ sucesso: boolean; mensagem: string }> {
  if (!cfg.githubToken || !cfg.repoOwner || !cfg.repoName) {
    throw new Error("Configuração do GitHub incompleta. Verifique seus Ajustes.");
  }

  const chatId = cfg.telegramChatId || "";
  const yaml = gerarYamlWorkflowLembretes(chatId);

  let shaExistente: string | undefined;
  try {
    const res = await ler(cfg, CAMINHO_WORKFLOW_LEMBRETES, { silenciar404: true });
    shaExistente = res.sha;
  } catch {}

  await gravar(
    cfg,
    CAMINHO_WORKFLOW_LEMBRETES,
    yaml,
    shaExistente,
    "ci: instalar agendador autonomo de lembretes Klaus (GitHub Actions)",
  );

  return {
    sucesso: true,
    mensagem: "Agendador autônomo instalado com sucesso no seu repositório de dados!",
  };
}
