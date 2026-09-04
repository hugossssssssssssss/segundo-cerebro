/**
 * Gerador e Limpador de Dados de Demonstração (Mock / Demo Pack)
 *
 * Popula o Klaus com um ecossistema realista e interconectado de
 * notas, tarefas, metas de PDI, entregas, referências visuais e contatos,
 * permitindo que o usuário experimente e teste o app totalmente preenchido
 * e possa apagar tudo depois com um único clique.
 */

import type { Settings } from "./settings";
import { escreverMarkdown } from "./markdown";
import { gravar, apagar } from "./github";
import { invalidarCache, type ItemRepo } from "./repo";
import { PASTAS } from "./tipos";
import { hojeISO } from "./utils";
import { format, addDays, subDays } from "date-fns";

export interface ItemDemo {
  caminho: string;
  mensagemCommit: string;
  conteudo: string;
}

export function gerarItensDemo(nomeUsuario?: string): ItemDemo[] {
  const agora = new Date().toISOString();
  const hoje = new Date();
  const dataHojeStr = hojeISO();
  const dataAmanhaStr = format(addDays(hoje, 1), "yyyy-MM-dd");
  const dataEm2DiasStr = format(addDays(hoje, 2), "yyyy-MM-dd");
  const dataEm4DiasStr = format(addDays(hoje, 4), "yyyy-MM-dd");
  const dataEm7DiasStr = format(addDays(hoje, 7), "yyyy-MM-dd");
  const dataOntemStr = format(subDays(hoje, 1), "yyyy-MM-dd");
  const dataSemanaPassadaStr = format(subDays(hoje, 6), "yyyy-MM-dd");
  const autor = nomeUsuario?.trim() || "Hugo Silva";

  const itens: ItemDemo[] = [];

  // ── 1. NOTAS ─────────────────────────────────────────────────────────────
  itens.push({
    caminho: `${PASTAS.notas}/Guia de Identidade Visual Tech.md`,
    mensagemCommit: "docs(demo): guia de identidade visual",
    conteudo: escreverMarkdown({
      dados: {
        id: "guia-de-identidade-visual-tech",
        tipo: "nota",
        titulo: "Guia de Identidade Visual Tech",
        criado_em: agora,
        atualizado_em: agora,
        criado_por: autor,
        tags: ["design", "branding", "guideline", "demo"],
        demo: true,
      },
      corpo: `## Diretrizes da Nova Identidade Visual

Este documento consolida os princípios visuais da marca, paletas cromáticas e aplicações digitais.

---

### Princípios de Design
1. **Clareza e Precisão**: Uso rigoroso de grids suíços e proporções matemáticas.
2. **Contraste Dinâmico**: Tipografia sem serifa expressiva combinada a fundos escuros refinados.
3. **Escalabilidade**: Compatível com o projeto de @Evolucao em Design Ops e Tokens.

### Responsáveis
- Direção de Arte: @Mariana Costa
- UI & Prototipagem: @Lucas Ferreira e @Camila Duarte

### Tarefas Relacionadas
- @Criar prototipo de alta fidelidade no Figma
- @Revisar contraste e acessibilidade das cores
`,
    }),
  });

  itens.push({
    caminho: `${PASTAS.notas}/Pesquisa de Tipografia Suica.md`,
    mensagemCommit: "docs(demo): pesquisa tipografica suica",
    conteudo: escreverMarkdown({
      dados: {
        id: "pesquisa-de-tipografia-suica",
        tipo: "nota",
        titulo: "Pesquisa de Tipografia Suíça",
        criado_em: agora,
        atualizado_em: agora,
        criado_por: autor,
        tags: ["tipografia", "design", "editorial", "demo"],
        demo: true,
      },
      corpo: `## O Estilo Tipográfico Internacional (Design Suíço)

Notas de estudo sobre a aplicação contemporânea dos conceitos desenvolvidos por Josef Müller-Brockmann e Armin Hofmann.

---

### Fundamentos
- **Grid Modular**: Estrutura invisível que ancora todos os elementos visuais.
- **Tipografia Grotesca**: Preferência por famílias neo-grotescas neutras e legíveis (Inter, Neue Haas Grotesk, Helvetica).
- **Espaço Negativo Ativo**: O respiro tem tanta importância quanto a forma.

Veja também a referência visual @Grid Editorial Suico Minimalista.
`,
    }),
  });

  itens.push({
    caminho: `${PASTAS.notas}/Briefing Campanha Q4.md`,
    mensagemCommit: "docs(demo): briefing da campanha",
    conteudo: escreverMarkdown({
      dados: {
        id: "briefing-campanha-q4",
        tipo: "nota",
        subtipo: "briefing",
        titulo: "Briefing Campanha Q4",
        criado_em: agora,
        atualizado_em: agora,
        criado_por: autor,
        tags: ["campanha", "marketing", "q4", "demo"],
        demo: true,
      },
      corpo: `## Campanha de Final de Ano: Lançamento de Produto

### Objetivos Principais
- Aumentar o reconhecimento da marca em 25% no segmento tech.
- Apresentar as novas ferramentas integradas de fluxo criativo.

### Entregáveis
- 3 landing pages responsivas
- Kit completo de peças digitais para redes sociais
- Key visual para anúncios e apresentações

Alinhamento com o time de engenharia liderado por @Rodrigo Silva.
`,
    }),
  });

  itens.push({
    caminho: `${PASTAS.notas}/Estrategia de Design Tokens.md`,
    mensagemCommit: "docs(demo): arquitetura de design tokens",
    conteudo: escreverMarkdown({
      dados: {
        id: "estrategia-de-design-tokens",
        tipo: "nota",
        titulo: "Estratégia de Design Tokens",
        criado_em: agora,
        atualizado_em: agora,
        criado_por: autor,
        tags: ["design-tokens", "design-system", "demo"],
        demo: true,
      },
      corpo: `## Arquitetura de Tokens Multiplataforma

### Níveis de Tokens
1. **Global Tokens**: Cores primitivas, escalas tipográficas puras, espaçamentos base.
2. **Semantic Tokens**: \`--color-background-primary\`, \`--color-text-muted\`, etc.
3. **Component Tokens**: \`--btn-primary-bg\`, \`--card-border-radius\`.

Esta iniciativa suporta diretamente a entrega @Lancamento do Design System V2.
`,
    }),
  });

  itens.push({
    caminho: `${PASTAS.notas}/Anotacoes Kickoff Projeto Alpha.md`,
    mensagemCommit: "docs(demo): kickoff do projeto alpha",
    conteudo: escreverMarkdown({
      dados: {
        id: "anotacoes-kickoff-projeto-alpha",
        tipo: "nota",
        subtipo: "reuniao",
        titulo: "Anotações Kickoff Projeto Alpha",
        criado_em: agora,
        atualizado_em: agora,
        data_reuniao: dataHojeStr,
        participantes: ["Hugo Silva", "Mariana Costa", "Rodrigo Silva"],
        criado_por: autor,
        tags: ["reuniao", "projeto-alpha", "demo"],
        demo: true,
      },
      corpo: `## Pauta da Reunião
- Apresentação do cronograma e marcos do trimestre
- Definição de papéis e responsabilidades
- Validação do escopo técnico com @Rodrigo Silva

### Próximos Passos
- [ ] @Alinhar briefing com a diretoria de arte
- [ ] @Criar prototipo de alta fidelidade no Figma
`,
    }),
  });

  // ── 2. TAREFAS ───────────────────────────────────────────────────────────
  itens.push({
    caminho: `${PASTAS.tarefas}/Criar prototipo de alta fidelidade no Figma.md`,
    mensagemCommit: "tarefa(demo): prototipo figma",
    conteudo: escreverMarkdown({
      dados: {
        id: "criar-prototipo-de-alta-fidelidade-no-figma",
        tipo: "tarefa",
        titulo: "Criar protótipo de alta fidelidade no Figma",
        status: "em-progresso",
        prioridade: "alta",
        prazo: dataEm2DiasStr,
        pomodoros_estimados: 4,
        pomodoros_realizados: 2,
        criado_em: dataOntemStr,
        atualizado_em: agora,
        tags: ["figma", "ui", "prototipo", "demo"],
        demo: true,
      },
      corpo: `Montar fluxo interativo de ponta a ponta com auto-layout e variáveis.

- [x] Estruturar wireframes de baixa fidelidade
- [x] Aplicar componentes do design system
- [ ] Criar micro-interações de botões e transições
- [ ] Testar fluxo no Figma Mirror mobile
`,
    }),
  });

  itens.push({
    caminho: `${PASTAS.tarefas}/Revisar contraste e acessibilidade das cores.md`,
    mensagemCommit: "tarefa(demo): acessibilidade cores",
    conteudo: escreverMarkdown({
      dados: {
        id: "revisar-contraste-e-acessibilidade-das-cores",
        tipo: "tarefa",
        titulo: "Revisar contraste e acessibilidade das cores",
        status: "a-fazer",
        prioridade: "media",
        prazo: dataEm4DiasStr,
        pomodoros_estimados: 2,
        pomodoros_realizados: 0,
        criado_em: dataHojeStr,
        atualizado_em: agora,
        tags: ["acessibilidade", "wcag", "cores", "demo"],
        demo: true,
      },
      corpo: `Garantir conformidade com as diretrizes WCAG 2.1 nível AA para todos os elementos de texto e ícones.

- [ ] Checar contraste de textos secundários no modo escuro
- [ ] Validar estados de foco dos campos de formulário
- [ ] Gerar relatório de conformidade
`,
    }),
  });

  itens.push({
    caminho: `${PASTAS.tarefas}/Exportar icones SVG e assets para frontend.md`,
    mensagemCommit: "tarefa(demo): exportar assets",
    conteudo: escreverMarkdown({
      dados: {
        id: "exportar-icones-svg-e-assets-para-frontend",
        tipo: "tarefa",
        titulo: "Exportar ícones SVG e assets para frontend",
        status: "feito",
        prioridade: "baixa",
        pomodoros_estimados: 2,
        pomodoros_realizados: 2,
        criado_em: dataSemanaPassadaStr,
        concluida_em: dataHojeStr,
        atualizado_em: agora,
        tags: ["assets", "svg", "frontend", "demo"],
        demo: true,
      },
      corpo: `Otimizar SVGs com SVGO e subir para o repositório de ícones.

- [x] Limpar layers desnecessárias no Figma
- [x] Exportar conjunto com 48 ícones em 24px
- [x] Validar rendering no browser
`,
    }),
  });

  itens.push({
    caminho: `${PASTAS.tarefas}/Alinhar briefing com a diretoria de arte.md`,
    mensagemCommit: "tarefa(demo): alinhamento briefing",
    conteudo: escreverMarkdown({
      dados: {
        id: "alinhar-briefing-com-a-diretoria-de-arte",
        tipo: "tarefa",
        titulo: "Alinhar briefing com a diretoria de arte",
        status: "a-fazer",
        prioridade: "urgente",
        prazo: dataAmanhaStr,
        pomodoros_estimados: 1,
        pomodoros_realizados: 0,
        criado_em: dataHojeStr,
        atualizado_em: agora,
        tags: ["reuniao", "alinhamento", "demo"],
        demo: true,
      },
      corpo: `Revisar os pontos críticos do @Briefing Campanha Q4 junto com @Mariana Costa.
`,
    }),
  });

  itens.push({
    caminho: `${PASTAS.tarefas}/Documentar componentes de formulario no Zeroheight.md`,
    mensagemCommit: "tarefa(demo): documentacao componentes",
    conteudo: escreverMarkdown({
      dados: {
        id: "documentar-componentes-de-formulario-no-zeroheight",
        tipo: "tarefa",
        titulo: "Documentar componentes de formulário no Zeroheight",
        status: "em-progresso",
        prioridade: "media",
        prazo: dataEm7DiasStr,
        pomodoros_estimados: 3,
        pomodoros_realizados: 1,
        criado_em: dataOntemStr,
        atualizado_em: agora,
        tags: ["documentacao", "design-system", "demo"],
        demo: true,
      },
      corpo: `Escrever especificações de uso, dos and don'ts, e estados (hover, active, disabled, error).
`,
    }),
  });

  // ── 3. METAS PDI ─────────────────────────────────────────────────────────
  itens.push({
    caminho: `${PASTAS.metas}/Evolucao em Design Ops e Tokens.md`,
    mensagemCommit: "pdi(demo): meta design ops",
    conteudo: escreverMarkdown({
      dados: {
        id: "evolucao-em-design-ops-e-tokens",
        tipo: "meta",
        titulo: "Evolução em Design Ops e Tokens",
        status: "em-andamento",
        indicador: "Tokens 100% integrados no Figma e código com documentação ativa",
        prazo: "2026-12-31",
        criado_em: dataSemanaPassadaStr,
        atualizado_em: agora,
        criado_por: autor,
        tags: ["pdi", "design-ops", "tokens", "demo"],
        demo: true,
      },
      corpo: `## Objetivo
Consolidar a esteira de Design Ops, automatizando a sincronização de variáveis do Figma para tokens CSS/JSON.
`,
    }),
  });

  itens.push({
    caminho: `${PASTAS.metas}/Lideranca Tecnica e Mentorias de Design.md`,
    mensagemCommit: "pdi(demo): meta lideranca",
    conteudo: escreverMarkdown({
      dados: {
        id: "lideranca-tecnica-e-mentorias-de-design",
        tipo: "meta",
        titulo: "Liderança Técnica e Mentorias de Design",
        status: "em-andamento",
        indicador: "Realizar 6 sessões de mentoria e 2 workshops de design",
        prazo: "2026-11-30",
        criado_em: dataSemanaPassadaStr,
        atualizado_em: agora,
        criado_por: autor,
        tags: ["pdi", "lideranca", "mentoria", "demo"],
        demo: true,
      },
      corpo: `## Objetivo
Apoiar o crescimento do time de design através de 1:1s focadas em carreira, boas práticas de UI e arquitetura de componentes.
`,
    }),
  });

  itens.push({
    caminho: `${PASTAS.metas}/Dominio de Ferramentas de Motion e Prototipagem.md`,
    mensagemCommit: "pdi(demo): meta motion",
    conteudo: escreverMarkdown({
      dados: {
        id: "dominio-de-ferramentas-de-motion-e-prototipagem",
        tipo: "meta",
        titulo: "Domínio de Ferramentas de Motion e Prototipagem",
        status: "concluida",
        indicador: "Publicar 3 micro-animações completas no produto",
        prazo: "2026-08-30",
        criado_em: dataSemanaPassadaStr,
        atualizado_em: agora,
        criado_por: autor,
        tags: ["pdi", "motion", "prototipagem", "demo"],
        demo: true,
      },
      corpo: `## Objetivo Concluído
Aprofundar em princípios de animação para interfaces (easing curves, timing, feedback tátil).
`,
    }),
  });

  // ── 4. ENTREGAS PDI (BRAG DOCUMENT) ──────────────────────────────────────
  itens.push({
    caminho: `${PASTAS.entregas}/2026-08-15-lancamento-do-design-system-v2.md`,
    mensagemCommit: "pdi(demo): entrega design system v2",
    conteudo: escreverMarkdown({
      dados: {
        id: "lancamento-do-design-system-v2",
        tipo: "entrega",
        titulo: "Lançamento do Design System V2",
        data: "2026-08-15",
        metas: ["Evolução em Design Ops e Tokens"],
        conquista: "Lançamento oficial da biblioteca de componentes V2 para 4 squads de produto",
        impacto: "Redução de 40% no tempo de criação de novas telas e zero divergência de estilos",
        elogio: "A nova versão dos componentes elevou absurdamente o padrão visual e a velocidade do time.",
        autor_elogio: "Mariana Costa",
        criado_em: "2026-08-15",
        atualizado_em: agora,
        tags: ["design-system", "design-ops", "demo"],
        demo: true,
      },
      corpo: `Entrega de alta relevância que unificou a linguagem visual entre mobile e web.
`,
    }),
  });

  itens.push({
    caminho: `${PASTAS.entregas}/2026-08-28-workshop-de-acessibilidade-para-devs.md`,
    mensagemCommit: "pdi(demo): entrega workshop acessibilidade",
    conteudo: escreverMarkdown({
      dados: {
        id: "workshop-de-acessibilidade-para-devs",
        tipo: "entrega",
        titulo: "Workshop de Acessibilidade para Desenvolvedores",
        data: "2026-08-28",
        metas: ["Liderança Técnica e Mentorias de Design"],
        conquista: "Workshop prático ministrado para 15 desenvolvedores frontend e QA",
        impacto: "Criação de testes automatizados de acessibilidade no pipeline de CI",
        criado_em: "2026-08-28",
        atualizado_em: agora,
        tags: ["workshop", "acessibilidade", "mentoria", "demo"],
        demo: true,
      },
      corpo: `Treinamento com foco em ARIA attributes, navegação por teclado e testes com leitores de tela.
`,
    }),
  });

  // ── 5. CONTATOS (ÁRVORE HIERÁRQUICA) ────────────────────────────────────
  itens.push({
    caminho: `${PASTAS.contatos}/mariana-costa.md`,
    mensagemCommit: "contato(demo): mariana costa",
    conteudo: escreverMarkdown({
      dados: {
        id: "mariana-costa",
        tipo: "contato",
        titulo: "Mariana Costa",
        cargo: "Diretora de Criação",
        empresa: "Studio Alpha",
        email: "mariana.costa@studioalpha.com",
        telefone: "+55 11 98888-1111",
        tags: ["diretoria", "design", "lideranca", "demo"],
        criado_em: agora,
        atualizado_em: agora,
        demo: true,
      },
      corpo: `Líder da área de design e produto. Responsável pela visão de marca e alinhamento executivo.
`,
    }),
  });

  itens.push({
    caminho: `${PASTAS.contatos}/lucas-ferreira.md`,
    mensagemCommit: "contato(demo): lucas ferreira",
    conteudo: escreverMarkdown({
      dados: {
        id: "lucas-ferreira",
        tipo: "contato",
        titulo: "Lucas Ferreira",
        cargo: "Lead Product Designer",
        empresa: "Studio Alpha",
        email: "lucas.ferreira@studioalpha.com",
        telefone: "+55 11 97777-2222",
        pai_id: "mariana-costa",
        tags: ["design", "lead", "ui", "demo"],
        criado_em: agora,
        atualizado_em: agora,
        demo: true,
      },
      corpo: `Responsável pela squad de Core Experience e Design System. Subordinado direto de Mariana Costa.
`,
    }),
  });

  itens.push({
    caminho: `${PASTAS.contatos}/camila-duarte.md`,
    mensagemCommit: "contato(demo): camila duarte",
    conteudo: escreverMarkdown({
      dados: {
        id: "camila-duarte",
        tipo: "contato",
        titulo: "Camila Duarte",
        cargo: "UI Designer",
        empresa: "Studio Alpha",
        email: "camila.duarte@studioalpha.com",
        telefone: "+55 11 96666-3333",
        pai_id: "mariana-costa",
        tags: ["design", "ui", "motion", "demo"],
        criado_em: agora,
        atualizado_em: agora,
        demo: true,
      },
      corpo: `Designer com forte atuação em componentes visuais, micro-animações e iconografia.
`,
    }),
  });

  itens.push({
    caminho: `${PASTAS.contatos}/rodrigo-silva.md`,
    mensagemCommit: "contato(demo): rodrigo silva",
    conteudo: escreverMarkdown({
      dados: {
        id: "rodrigo-silva",
        tipo: "contato",
        titulo: "Rodrigo Silva",
        cargo: "Tech Lead Frontend",
        empresa: "Studio Alpha",
        email: "rodrigo.silva@studioalpha.com",
        telefone: "+55 11 95555-4444",
        tags: ["tech", "frontend", "engenharia", "demo"],
        criado_em: agora,
        atualizado_em: agora,
        demo: true,
      },
      corpo: `Ponto focal técnico de engenharia para integração de tokens e componentes web.
`,
    }),
  });

  // ── 6. REFERÊNCIAS VISUAIS ───────────────────────────────────────────────
  itens.push({
    caminho: `${PASTAS.referencias}/Poster Bauhaus Geometrico.md`,
    mensagemCommit: "ref(demo): poster bauhaus",
    conteudo: escreverMarkdown({
      dados: {
        id: "poster-bauhaus-geometrico",
        tipo: "referencia",
        titulo: "Pôster Bauhaus Geométrico",
        autor: "Herbert Bayer",
        paleta: ["#D9381E", "#0F4C81", "#F5DF4D", "#1C1C1C", "#F4F4F0"],
        tags: ["bauhaus", "poster", "geometria", "demo"],
        criado_em: agora,
        atualizado_em: agora,
        demo: true,
      },
      corpo: `Estudo clássico de composição assimétrica e cores primárias com forte peso tipográfico.
`,
    }),
  });

  itens.push({
    caminho: `${PASTAS.referencias}/Grid Editorial Suico Minimalista.md`,
    mensagemCommit: "ref(demo): grid editorial suico",
    conteudo: escreverMarkdown({
      dados: {
        id: "grid-editorial-suico-minimalista",
        tipo: "referencia",
        titulo: "Grid Editorial Suíço Minimalista",
        autor: "Josef Müller-Brockmann",
        paleta: ["#E5E5E5", "#111111", "#FF3300", "#777777"],
        tags: ["suico", "grid", "editorial", "minimalismo", "demo"],
        criado_em: agora,
        atualizado_em: agora,
        demo: true,
      },
      corpo: `Referência para estruturação de diagramações modulares com ritmo e harmonia visual.
`,
    }),
  });

  itens.push({
    caminho: `${PASTAS.referencias}/Dashboard Dark Glassmorphism.md`,
    mensagemCommit: "ref(demo): dashboard glassmorphism",
    conteudo: escreverMarkdown({
      dados: {
        id: "dashboard-dark-glassmorphism",
        tipo: "referencia",
        titulo: "Dashboard Dark Glassmorphism",
        paleta: ["#0B0E14", "#1F2430", "#73B7F2", "#8A5CF6", "#F07178"],
        tags: ["ui", "dark", "glassmorphism", "dashboard", "demo"],
        criado_em: agora,
        atualizado_em: agora,
        demo: true,
      },
      corpo: `Inspiração de interface com camadas translúcidas, desfoque de fundo e bordas sutis luminosas.
`,
    }),
  });

  return itens;
}

/**
 * Grava todos os itens de demonstração no repositório GitHub.
 */
export async function popularKlausComDadosDemo(
  cfg: Settings,
  aoProgredir?: (atual: number, total: number, caminho: string) => void
): Promise<{ sucessos: number; falhas: string[] }> {
  const itens = gerarItensDemo(cfg.nomeUsuario);
  let sucessos = 0;
  const falhas: string[] = [];

  for (let i = 0; i < itens.length; i++) {
    const item = itens[i];
    if (aoProgredir) aoProgredir(i + 1, itens.length, item.caminho);

    try {
      await gravar(cfg, item.caminho, item.conteudo, undefined, item.mensagemCommit);
      sucessos++;
    } catch (e: any) {
      falhas.push(`${item.caminho}: ${e?.message || e}`);
    }
  }

  if (sucessos > 0) {
    invalidarCache();
  }

  return { sucessos, falhas };
}

/**
 * Identifica e remove todos os arquivos de demonstração do repositório.
 */
export async function apagarTodosDadosDemo(
  cfg: Settings,
  itensRepo: ItemRepo[],
  aoProgredir?: (atual: number, total: number, caminho: string) => void
): Promise<{ apagados: number; falhas: string[] }> {
  // Localiza itens com a marcação demo no frontmatter ou tags
  const itensParaApagar = itensRepo.filter((item) => {
    if (!item.doc) return false;
    const d = item.doc.dados || {};
    const tags = Array.isArray(d.tags) ? d.tags.map(String) : [];
    return d.demo === true || tags.includes("demo");
  });

  let apagados = 0;
  const falhas: string[] = [];

  for (let i = 0; i < itensParaApagar.length; i++) {
    const item = itensParaApagar[i];
    if (aoProgredir) aoProgredir(i + 1, itensParaApagar.length, item.caminho);

    try {
      await apagar(cfg, item.caminho, item.sha);
      apagados++;
    } catch (e: any) {
      falhas.push(`${item.caminho}: ${e?.message || e}`);
    }
  }

  if (apagados > 0) {
    invalidarCache();
  }

  return { apagados, falhas };
}
