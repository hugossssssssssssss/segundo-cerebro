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

          function normalizarData(str) {
            if (!str) return null;
            const limpo = str.trim();
            const mIso = limpo.match(/^(\\d{4})[-/](\\d{1,2})[-/](\\d{1,2})/);
            if (mIso) return \`\${mIso[1]}-\${mIso[2].padStart(2, '0')}-\${mIso[3].padStart(2, '0')}\`;
            const mBr = limpo.match(/^(\\d{1,2})[-/](\\d{1,2})[-/](\\d{4})/);
            if (mBr) return \`\${mBr[3]}-\${mBr[2].padStart(2, '0')}-\${mBr[1].padStart(2, '0')}\`;
            return null;
          }

          const pastas = ['tarefas', 'notas'];
          const pendencias = [];

          for (const pasta of pastas) {
            if (!fs.existsSync(pasta)) continue;
            const arquivos = fs.readdirSync(pasta).filter(f => f.endsWith('.md'));

            for (const arq of arquivos) {
              const caminho = path.join(pasta, arq);
              if (caminho.startsWith('.lixeira') || caminho.includes('lixeira') || caminho.startsWith('pdi') || caminho.includes('pdi')) continue;
              const conteudo = fs.readFileSync(caminho, 'utf8');

              // Verifica se a tarefa já está feita, vista ou apagada na lixeira
              if (
                conteudo.includes('status: feito') ||
                conteudo.includes('status: "feito"') ||
                conteudo.includes('visto_em:') ||
                conteudo.includes('apagado_em:') ||
                conteudo.includes('caminho_origem:') ||
                conteudo.includes('tipo: meta')
              ) {
                continue;
              }

              // Busca prazos ou tags de lembrete
              const matchPrazo = conteudo.match(/prazo:\\s*["']?([^"'\n]+)/);
              const prazoIso = matchPrazo ? normalizarData(matchPrazo[1]) : null;

              const matchLembrete = conteudo.match(/\\[⏰\\s*Lembrete:\\s*([^|\\]]+)\\|\\s*([\\d\\s\\-:T]+)\\]/);
              const lembreteIso = matchLembrete ? normalizarData(matchLembrete[2].slice(0, 10)) : null;

              const matchTitulo = conteudo.match(/titulo:\\s*["']?([^"'\n]+)/);
              const titulo = matchTitulo ? matchTitulo[1] : arq.replace('.md', '');

              // Apenas inclui se a data venceu ou vence HOJE (nunca datas futuras!)
              if (prazoIso && prazoIso <= hoje) {
                pendencias.push(\`⏰ *Tarefa:* \${titulo} (Prazo: \${prazoIso})\`);
              } else if (lembreteIso && lembreteIso <= hoje) {
                pendencias.push(\`⏰ *Lembrete:* \${matchLembrete[1].trim()}\`);
              }
            }
          }

          if (pendencias.length === 0) {
            console.log("Nenhum lembrete pendente para hoje.");
            process.exit(0);
          }

          const texto = \`*Klaus - Lembretes do Dia*\n\nVocê tem \${pendencias.length} item(ns) aguardando sua atenção:\n\n\` + pendencias.join('\\n');

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

export const CAMINHO_WORKFLOW_EQUIPE = ".github/workflows/klaus-equipe.yml";

export function gerarYamlWorkflowEquipe(chatId?: string): string {
  return `name: Klaus - Notificador de Equipe & Colaboracao

on:
  push:
    paths:
      - 'tarefas/**'
      - 'notas/**'
      - 'pdi/**'
  workflow_dispatch:

jobs:
  notificar-equipe:
    runs-on: ubuntu-latest
    steps:
      - name: Baixar repositório de dados
        uses: actions/checkout@v4
        with:
          fetch-depth: 2

      - name: Analisar colaboração e menções da equipe
        env:
          TELEGRAM_BOT_TOKEN: \${{ secrets.TELEGRAM_BOT_TOKEN }}
          TELEGRAM_CHAT_ID: "${chatId || ""}"
        run: |
          node - << 'EOF'
          const fs = require('fs');
          const path = require('path');
          const { execSync } = require('child_process');

          let arquivos = [];
          try {
            const saida = execSync('git diff --name-only HEAD~1 HEAD', { encoding: 'utf8' });
            arquivos = saida.split('\\n').filter(Boolean);
          } catch {
            // Em caso de primeiro commit ou falha no diff, varre as pastas principais
            arquivos = fs.readdirSync('tarefas', { withFileTypes: true })
              .filter(d => d.isFile() && d.name.endsWith('.md'))
              .map(d => path.join('tarefas', d.name));
          }

          const mencoes = [];
          const atribuicoes = [];

          for (const arq of arquivos) {
            if (!arq.endsWith('.md') || !fs.existsSync(arq)) continue;
            if (arq.includes('lixeira') || arq.includes('.lixeira')) continue;

            const conteudo = fs.readFileSync(arq, 'utf8');

            // Detecta menções @usuario
            const matchesMencoes = conteudo.match(/@[a-zA-Z0-9_-]+/g);
            if (matchesMencoes) {
              const usuariosUnicos = [...new Set(matchesMencoes)];
              mencoes.push(\`📄 \` + arq + \`: \` + usuariosUnicos.join(', '));
            }

            // Detecta atribuições no frontmatter
            const matchResp = conteudo.match(/responsaveis:\\s*\\[([^\\]]+)\\]/) || conteudo.match(/responsavel:\\s*["']?([^"'\n]+)/);
            if (matchResp) {
              atribuicoes.push(\`🎯 \` + arq + \` atribuído a: \` + matchResp[1].trim());
            }
          }

          console.log("Atividades de equipe detectadas:", mencoes.length, "menções,", atribuicoes.length, "atribuições.");

          // Escreve no Step Summary do GitHub Actions
          if (process.env.GITHUB_STEP_SUMMARY) {
            let resumo = '### 👥 Klaus - Atividades de Equipe no Commit\\n\\n';
            if (mencoes.length > 0) {
              resumo += '**Menções encontradas:**\\n' + mencoes.map(m => '- ' + m).join('\\n') + '\\n\\n';
            }
            if (atribuicoes.length > 0) {
              resumo += '**Atribuições de tarefas:**\\n' + atribuicoes.map(a => '- ' + a).join('\\n') + '\\n\\n';
            }
            if (mencoes.length === 0 && atribuicoes.length === 0) {
              resumo += 'Nenhuma menção direta ou atribuição nova neste push.';
            }
            fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, resumo);
          }

          // Dispara notificação Telegram se configurado
          const token = process.env.TELEGRAM_BOT_TOKEN;
          const chatId = process.env.TELEGRAM_CHAT_ID;
          if (token && chatId && (mencoes.length > 0 || atribuicoes.length > 0)) {
            const texto = '*👥 Klaus - Atualização da Equipe*\n\n' +
              (mencoes.length > 0 ? '*Menções:*\n' + mencoes.join('\\n') + '\n\n' : '') +
              (atribuicoes.length > 0 ? '*Atribuições:*\n' + atribuicoes.join('\\n') : '');

            fetch(\`https://api.telegram.org/bot\${token}/sendMessage\`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ chat_id: chatId, text: texto, parse_mode: 'Markdown' })
            }).catch(console.error);
          }
          EOF
`;
}

/**
 * Instala o workflow de equipe no repositório de dados do usuário via GitHub Contents API.
 */
export async function instalarWorkflowEquipe(
  cfg: Settings,
): Promise<{ sucesso: boolean; mensagem: string }> {
  if (!cfg.githubToken || !cfg.repoOwner || !cfg.repoName) {
    throw new Error("Configuração do GitHub incompleta. Verifique seus Ajustes.");
  }

  const chatId = cfg.telegramChatId || "";
  const yaml = gerarYamlWorkflowEquipe(chatId);

  let shaExistente: string | undefined;
  try {
    const res = await ler(cfg, CAMINHO_WORKFLOW_EQUIPE, { silenciar404: true });
    shaExistente = res.sha;
  } catch {}

  await gravar(
    cfg,
    CAMINHO_WORKFLOW_EQUIPE,
    yaml,
    shaExistente,
    "ci: instalar robô de equipe e colaboração Klaus (GitHub Actions)",
  );

  return {
    sucesso: true,
    mensagem: "Robô de colaboração e menções de equipe instalado com sucesso no seu repositório de dados!",
  };
}

