# Instruções para agentes de IA

Este repositório é o **segundo cérebro** do Hugo, designer gráfico brasileiro. Não é código — é um vault Obsidian: notas em Markdown com frontmatter YAML.

Este arquivo é lido automaticamente por Claude Code, Cursor, Gemini CLI e agentes compatíveis. O objetivo é que qualquer IA entenda este vault sem configuração nenhuma.

## Antes de qualquer coisa

**Leia `99-Sistema/Taxonomia.md`.** É o contrato de dados: os valores válidos de `tipo`, `status`, `area`, o formato de datas e as convenções de nome. Nada aqui funciona se você inventar campos próprios.

## Regras

1. **Responda em português do Brasil.**
2. **Nunca invente fatos** sobre o trabalho, as entregas, as metas ou as pessoas do Hugo. Se não estiver no vault, diga que não encontrou.
3. **Toda nota ou campo que você preencher recebe a tag `#ia-sugeriu`.** Sem exceção. Os painéis listam o que está pendente de conferência, e é isso que permite ao Hugo confiar no que está escrito aqui.
4. **Prefira propor a executar.** Mostre a alteração e deixe o Hugo aplicar, em vez de reescrever conteúdo existente.
5. **Não reorganize a estrutura de pastas** nem renomeie arquivos em massa. Links `[[assim]]` quebram.
6. **Datas sempre `AAAA-MM-DD`.** Status sempre sem acento e minúsculo (`concluido`, não `Concluída`) — o Dataview compara texto exato.

## Mapa

| Pasta | Conteúdo |
|---|---|
| `00-Inbox/` | Captura crua, não triada |
| `01-Trabalho/PDI/` | Metas de desenvolvimento e revisões trimestrais |
| `01-Trabalho/Entregas/` | Trabalho concluído — evidências que alimentam o PDI |
| `01-Trabalho/Reunioes/` | Transcrições e decisões |
| `01-Trabalho/Empresa/` | Pessoas e contexto organizacional |
| `02-Pessoal/Referencias/` | Biblioteca visual: imagens, ferramentas, inspirações |
| `03-Conhecimento/` | O que ele aprendeu. Atemporal |
| `04-Diario/` | Notas diárias e revisões semanais |
| `05-Paineis/` | Dashboards Dataview e kanban |
| `90-Templates/` | Templates (sintaxe Templater: `<% %>`) |
| `99-Sistema/` | Documentação do próprio vault e prompts salvos |
| `_Anexos/` | Imagens. **Não sincroniza para o celular, por escolha** |

## O fluxo central

Entrega registrada → campo `metas:` ligando à meta do PDI → painéis em `01-Trabalho/PDI/PDI.md` agregam sozinhos.

Quando o campo `metas:` estiver vazio, a tarefa de classificação está descrita em `99-Sistema/Prompts/Classificar entregas.md`. Siga aquele prompt em vez de improvisar critério próprio.

## Contexto que muda o tom das respostas

- O Hugo está entrando numa empresa nova. O PDI ainda está vazio — isso é esperado, não é erro.
- Ele é designer, não desenvolvedor. Explique coisas técnicas sem jargão.
- A ferramenta foi construída para não depender de nenhuma IA específica. Se algo que você propuser criar uma dependência nova, diga isso explicitamente.
