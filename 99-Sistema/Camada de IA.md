---
tipo: sistema
tags: [sistema, ia]
---

# Camada de IA

O plugin **Copilot** é a inteligência da ferramenta. Ele já está instalado e configurado — falta só você colocar a chave.

## Colocar a chave do Gemini (uma vez só)

1. Configurações (⌘,) → role até **Copilot** na barra lateral esquerda
2. Aba **Basic** → campo **Google API Key** → cole sua chave
3. Feche. Pronto.

O modelo já vem selecionado como `gemini-2.5-flash` — rápido, com tier gratuito generoso e bom o bastante para tudo que este vault pede. Se quiser mais qualidade em análises longas, troque para `gemini-2.5-pro` no mesmo painel.

## Abrir o chat

Ícone do Copilot na barra lateral direita, ou ⌘P → *Copilot: Open Copilot Chat*.

## Os prompts salvos

Ficam em `99-Sistema/Prompts/`. No chat, digite `/` e o nome do prompt.

| Prompt | Quando usar |
|---|---|
| **Organizar reunião** | Colou uma transcrição numa nota de reunião. Ele extrai decisões, ações e contexto |
| **Classificar entregas** | Na revisão semanal. Liga suas entregas às metas do PDI |
| **Triagem do Inbox** | Inbox acumulou. Ele propõe destino para cada item |
| **Revisão da semana** | Balanço de 7 dias, com uma pergunta no fim |
| **Conectar conhecimento** | Numa nota qualquer. Acha o que ela tem a ver com o resto do vault |

Você pode editar qualquer um deles — são arquivos `.md` comuns. Mudar o texto muda o comportamento na hora. E pode criar novos: basta salvar um `.md` nessa pasta.

## A regra da tag `#ia-sugeriu`

Tudo que o Gemini preencher sozinho recebe a tag `#ia-sugeriu`. Os painéis `PDI.md` e a revisão semanal têm uma seção listando o que está pendente de conferência.

Isso não é burocracia. É o que permite confiar no vault: você sempre sabe o que foi você que escreveu e o que foi a máquina que chutou. No dia em que essa distinção sumir, você para de conseguir confiar em qualquer coisa que está lá dentro.

## Trocar de provedor

Se o Gemini deixar de servir, o Copilot aceita OpenAI, Anthropic, OpenRouter e modelos locais (Ollama). Mesma tela de configurações: cole a chave do novo provedor e mude o **Default Model**. Os prompts salvos continuam funcionando sem alteração — eles são texto puro, não dependem de provedor.

## O que fazer se a IA sair do ar

Nada quebra. Todos os fluxos do vault funcionam manualmente:

| Automático | Manual equivalente |
|---|---|
| Classificar entregas | Preencher o campo `metas:` na mão |
| Organizar reunião | Escrever as seções você mesmo |
| Triagem do Inbox | Arrastar os arquivos para as pastas |
| Revisão da semana | Ler as diárias e o painel `Semana.md` |

A IA acelera. Ela não sustenta. Isso foi decidido de propósito no desenho — um segundo cérebro que para de funcionar quando uma API cai não é um segundo cérebro.

## Custo

O tier gratuito do Google AI Studio cobre com folga o uso de uma pessoa. Se um dia passar a cobrar, o aviso vem antes — e a troca de provedor está documentada acima.
