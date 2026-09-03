/**
 * Módulo de Dossiê de Carreira (Brag Document).
 *
 * Consolida metas, entregas com impacto, elogios vinculados a contatos,
 * colaborações de equipe e habilidades desenvolvidas em um documento estruturado.
 */

import type { Meta, Entrega, Contato } from "./tipos";
import { dataCurta } from "./utils";

export interface OpcoesDossie {
  nomeUsuario?: string;
  periodoRotulo?: string;
  dataInicio?: string; // ISO AAAA-MM-DD
  dataFim?: string;    // ISO AAAA-MM-DD
  incluirMetas?: boolean;
  incluirEntregas?: boolean;
  incluirElogios?: boolean;
  incluirColaboracao?: boolean;
  incluirTags?: boolean;
}

export interface DadosDossieConsolidado {
  metas: Meta[];
  entregas: Entrega[];
  entregasComImpacto: Entrega[];
  elogios: Array<{
    entrega: Entrega;
    texto: string;
    autorNome: string;
    contato?: Contato;
  }>;
  colaboracoes: Record<string, Entrega[]>;
  todasTags: string[];
}

/**
 * Filtra entregas pelo intervalo de datas opcional.
 */
export function filtrarEntregasPorPeriodo(
  entregas: Entrega[],
  dataInicio?: string,
  dataFim?: string,
): Entrega[] {
  return entregas.filter((e) => {
    if (dataInicio && e.data < dataInicio) return false;
    if (dataFim && e.data > dataFim) return false;
    return true;
  });
}

/**
 * Consolida os dados de metas, entregas e contatos para o Dossiê.
 */
export function consolidarDossie(
  metas: Meta[],
  entregas: Entrega[],
  contatos: Contato[] = [],
  dataInicio?: string,
  dataFim?: string,
): DadosDossieConsolidado {
  const entregasFiltradas = filtrarEntregasPorPeriodo(entregas, dataInicio, dataFim).sort(
    (a, b) => b.data.localeCompare(a.data),
  );

  const mapaContatos = new Map<string, Contato>();
  for (const c of contatos) {
    mapaContatos.set(c.id.toLowerCase(), c);
    mapaContatos.set(c.titulo.toLowerCase(), c);
  }

  const entregasComImpacto = entregasFiltradas.filter((e) => Boolean(e.impacto));

  const elogios: DadosDossieConsolidado["elogios"] = [];
  for (const e of entregasFiltradas) {
    if (e.elogio) {
      let autorNome = e.autorElogio || "Colega de trabalho";
      let contatoEncontrado: Contato | undefined;

      if (e.autorElogio) {
        const chave = e.autorElogio.toLowerCase();
        contatoEncontrado = mapaContatos.get(chave);
        if (contatoEncontrado) {
          autorNome = contatoEncontrado.titulo;
        }
      }

      elogios.push({
        entrega: e,
        texto: e.elogio,
        autorNome,
        contato: contatoEncontrado,
      });
    }
  }

  const colaboracoes: Record<string, Entrega[]> = {};
  for (const e of entregasFiltradas) {
    if (e.colaboracao && e.colaboracao.length > 0) {
      for (const time of e.colaboracao) {
        if (!colaboracoes[time]) colaboracoes[time] = [];
        colaboracoes[time].push(e);
      }
    }
  }

  const setTags = new Set<string>();
  for (const e of entregasFiltradas) {
    if (e.tags) {
      for (const t of e.tags) setTags.add(t);
    }
  }
  for (const m of metas) {
    if (m.tags) {
      for (const t of m.tags) setTags.add(t);
    }
  }

  return {
    metas,
    entregas: entregasFiltradas,
    entregasComImpacto,
    elogios,
    colaboracoes,
    todasTags: Array.from(setTags).sort(),
  };
}

/**
 * Gera o texto formatado em Markdown limpo e profissional para 1-on-1s, Notion e avaliações.
 */
export function gerarMarkdownDossie(
  dados: DadosDossieConsolidado,
  opcoes: OpcoesDossie = {},
): string {
  const nome = opcoes.nomeUsuario || "Profissional";
  const periodo = opcoes.periodoRotulo || "Geral";
  const hojeFormatado = new Date().toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const linhas: string[] = [];

  linhas.push(`# Dossiê de Carreira & Conquistas (Brag Document)`);
  linhas.push(`**Profissional:** ${nome}  `);
  linhas.push(`**Período:** ${periodo}  `);
  linhas.push(`**Data de emissão:** ${hojeFormatado}  `);
  linhas.push(``);
  linhas.push(`---`);
  linhas.push(``);

  // 1. Metas Profissionais
  if (opcoes.incluirMetas !== false && dados.metas.length > 0) {
    linhas.push(`## 🎯 Metas & Objetivos Profissionais`);
    linhas.push(``);
    for (const m of dados.metas) {
      const statusRotulo =
        m.status === "concluida"
          ? "✅ Concluída"
          : m.status === "em-andamento"
          ? "⏳ Em andamento"
          : "📋 A iniciar";
      linhas.push(`### ${m.titulo} (${statusRotulo})`);
      if (m.indicador) {
        linhas.push(`* **Indicador de Sucesso:** ${m.indicador}`);
      }
      if (m.prazo) {
        linhas.push(`* **Prazo estimado:** ${dataCurta(m.prazo)}`);
      }
      linhas.push(``);
    }
    linhas.push(`---`);
    linhas.push(``);
  }

  // 2. Entregas e Impactos
  if (opcoes.incluirEntregas !== false && dados.entregas.length > 0) {
    linhas.push(`## 🚀 Entregas & Resultados de Impacto`);
    linhas.push(``);
    for (const e of dados.entregas) {
      linhas.push(`### ${e.titulo} (${dataCurta(e.data)})`);
      if (e.impacto) {
        linhas.push(`* 📈 **Impacto gerado:** ${e.impacto}`);
      }
      if (e.colaboracao && e.colaboracao.length > 0) {
        linhas.push(`* 🤝 **Colaboração:** ${e.colaboracao.join(", ")}`);
      }
      if (e.tags && e.tags.length > 0) {
        linhas.push(`* 🏷️ **Habilidades aplicadas:** ${e.tags.map((t) => `#${t}`).join(" ")}`);
      }
      if (e.corpo && e.corpo.trim()) {
        linhas.push(``);
        linhas.push(e.corpo.trim());
      }
      linhas.push(``);
    }
    linhas.push(`---`);
    linhas.push(``);
  }

  // 3. Pote de Elogios e Reconhecimento
  if (opcoes.incluirElogios !== false && dados.elogios.length > 0) {
    linhas.push(`## 💬 Reconhecimento & Feedbacks Recebidos`);
    linhas.push(``);
    for (const el of dados.elogios) {
      const cargo = el.contato?.cargo ? ` (${el.contato.cargo})` : "";
      linhas.push(`> "${el.texto}"`);
      linhas.push(`> — **${el.autorNome}**${cargo}, em relação a *${el.entrega.titulo}*`);
      linhas.push(``);
    }
    linhas.push(`---`);
    linhas.push(``);
  }

  // 4. Colaboração & Trabalho em Equipe
  if (opcoes.incluirColaboracao !== false && Object.keys(dados.colaboracoes).length > 0) {
    linhas.push(`## 🤝 Colaboração & Atuação Multidisciplinar`);
    linhas.push(``);
    for (const [time, lista] of Object.entries(dados.colaboracoes)) {
      linhas.push(`* **${time}:** ${lista.map((x) => x.titulo).join(", ")}`);
    }
    linhas.push(``);
    linhas.push(`---`);
    linhas.push(``);
  }

  // 5. Habilidades & Aprendizados
  if (opcoes.incluirTags !== false && dados.todasTags.length > 0) {
    linhas.push(`## 📚 Habilidades & Aprendizados em Destaque`);
    linhas.push(``);
    linhas.push(dados.todasTags.map((t) => `\`#${t}\``).join(" • "));
    linhas.push(``);
  }

  return linhas.join("\n");
}
