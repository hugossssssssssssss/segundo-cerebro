/**
 * Gerador de Kit de Início do Klaus (Starter Pack).
 *
 * Cria arquivos amigáveis de exemplo para que o usuário não comece
 * com o repositório 100% vazio e possa experimentar as funcionalidades
 * (@menções, pomodoro, subtarefas, metas de PDI) imediatamente.
 */

import type { Settings } from "./settings";
import { escreverMarkdown } from "./markdown";
import { gravar } from "./github";
import { invalidarCache } from "./repo";
import { PASTAS } from "./tipos";

export interface ItemKitInicial {
  caminho: string;
  mensagemCommit: string;
  conteudo: string;
}

export function gerarItensKitInicial(nomeUsuario?: string): ItemKitInicial[] {
  const agora = new Date().toISOString();
  const autor = nomeUsuario?.trim() || "Você";

  const notaBemVindo: ItemKitInicial = {
    caminho: `${PASTAS.notas}/Bem-vindo ao Klaus.md`,
    mensagemCommit: "docs: nota de boas-vindas inicial",
    conteudo: escreverMarkdown({
      dados: {
        id: "bem-vindo-ao-klaus",
        tipo: "nota",
        titulo: "Bem-vindo ao Klaus",
        criado_em: agora,
        atualizado_em: agora,
        criado_por: autor,
        tags: ["klaus", "tutorial", "primeiros-passos"],
      },
      corpo: `## Parabéns! Seu Segundo Cérebro está pronto para uso.

O **Klaus** é o seu ambiente de trabalho criativo e produtivo. Aqui, suas notas, tarefas, referências visuais e metas vivem em arquivos Markdown no seu próprio repositório privado do GitHub.

---

### 🧠 Como tirar o melhor proveito do Klaus

1. **Conecte ideias com menções (@)**
   Digite \`@\` em qualquer nota para criar ligações vivas com outras notas, tarefas ou referências (como a tarefa @Primeiros passos no seu Segundo Cérebro).

2. **Foco e Gestão com Pomodoro**
   Na aba **Tarefas**, você pode organizar seu fluxo em listas ou quadros Kanban, quebrar atividades em subtarefas e cronometrar ciclos de foco.

3. **Mural Visual de Referências**
   Na aba **Referências**, salve inspirações visuais de design. O Klaus extrai automaticamente paletas de cores em código HEX e gera miniaturas otimizadas.

4. **Grafo Neural 3D e Lousas**
   Veja como suas anotações se conectam no **Grafo Neural** ou rascunhe mapas mentais livres na aba **Lousas** (Excalidraw).

5. **Ferramentas Flutuantes Rápidas**
   Pressione \`Cmd+K\` ou use o menu flutuante no rodapé para abrir o conversor de arquivos, extrator de PDF, gravador de voz e sons de foco binaurais.

---
*Dica: Você pode editar ou apagar esta nota a qualquer momento.*
`,
    }),
  };

  const tarefaPrimeirosPassos: ItemKitInicial = {
    caminho: `${PASTAS.tarefas}/Primeiros passos no seu Segundo Cérebro.md`,
    mensagemCommit: "tarefa: primeiros passos no Klaus",
    conteudo: escreverMarkdown({
      dados: {
        id: "primeiros-passos-no-seu-segundo-cerebro",
        tipo: "tarefa",
        titulo: "Primeiros passos no seu Segundo Cérebro",
        status: "a-fazer",
        prioridade: "media",
        pomodoros_estimados: 2,
        pomodoros_realizados: 0,
        criado_em: agora,
        atualizado_em: agora,
        criado_por: autor,
        tags: ["klaus", "onboarding", "foco"],
      },
      corpo: `Checklist de experimentação rápida para dominar o Klaus:

- [ ] Personalizar os widgets da sua tela inicial (Home)
- [ ] Criar sua primeira anotação na aba **Notas**
- [ ] Testar uma menção (@) conectando duas ideias
- [ ] Iniciar um ciclo Pomodoro de 25 minutos na aba **Tarefas**
- [ ] Adicionar uma referência visual inspiradora em **Referências**
- [ ] Conversar com o Assistente IA do Klaus para estruturar um projeto
`,
    }),
  };

  const metaPdi: ItemKitInicial = {
    caminho: `${PASTAS.metas}/Construir meu Segundo Cérebro.md`,
    mensagemCommit: "pdi: meta de organização pessoal",
    conteudo: escreverMarkdown({
      dados: {
        id: "construir-meu-segundo-cerebro",
        tipo: "meta",
        titulo: "Construir meu Segundo Cérebro",
        status: "em-andamento",
        indicador: "Cofre 100% configurado e rotina diária estabelecida",
        criado_em: agora,
        atualizado_em: agora,
        criado_por: autor,
        tags: ["pdi", "produtividade", "design"],
      },
      corpo: `## Objetivo
Centralizar todos os projetos criativos, anotações de design, referências visuais e entregas em um único lugar seguro e veloz.

### Por que esta meta é importante?
Eliminar a sobrecarga mental e ter acesso instantâneo a referências de marca, paletas e briefings a qualquer momento.
`,
    }),
  };

  return [notaBemVindo, tarefaPrimeirosPassos, metaPdi];
}

/**
 * Grava os arquivos do kit de início no repositório GitHub do usuário.
 * Retorna o número de arquivos criados com sucesso.
 */
export async function criarKitInicial(cfg: Settings): Promise<number> {
  if (!cfg.githubToken || !cfg.repoOwner || !cfg.repoName) {
    return 0;
  }

  const itens = gerarItensKitInicial(cfg.nomeUsuario);
  let criados = 0;

  for (const item of itens) {
    try {
      await gravar(cfg, item.caminho, item.conteudo, undefined, item.mensagemCommit);
      criados++;
    } catch {
      // Falha pontual (ex: arquivo já existe) — continua os outros
    }
  }

  if (criados > 0) {
    invalidarCache();
  }

  return criados;
}
