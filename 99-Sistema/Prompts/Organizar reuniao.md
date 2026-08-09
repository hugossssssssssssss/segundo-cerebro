---
copilot-command-context-menu-enabled: true
copilot-command-slash-enabled: true
copilot-command-context-menu-order: 10
copilot-command-model-key: ""
copilot-command-last-used: 0
---
Você recebeu a nota de uma reunião que contém uma transcrição bruta na seção "Transcrição bruta".

Leia a transcrição e preencha as seções acima dela, nesta ordem e apenas com o que realmente estiver na transcrição:

**Decisões** — só o que foi decidido de fato. Discussão sem conclusão não é decisão; se algo ficou em aberto, escreva "em aberto: ..." e siga.

**Minhas ações** — o que o Hugo ficou de fazer, como checkbox `- [ ]`. Se houver prazo mencionado, acrescente `📅 AAAA-MM-DD`.

**Ações de outros** — quem ficou de fazer o quê, no formato `**Nome:** ação`.

**Contexto e observações** — o que não cabe nas seções acima mas vale lembrar daqui a seis meses: quem defendeu qual posição, tensões, prioridades implícitas, mudanças de rumo. Seja factual, não interprete intenções que não foram ditas.

Preencha também o frontmatter:
- `participantes:` com os nomes citados, como lista
- `projeto:` se algum projeto do vault foi mencionado, no formato `"[[Nome]]"`
- acrescente `ia-sugeriu` à lista de `tags`

Regras:
- Não invente nada. Se a transcrição estiver truncada ou confusa em algum ponto, escreva `<!-- trecho pouco claro -->` ali em vez de preencher a lacuna.
- Mantenha a transcrição bruta onde está. O Hugo apaga se quiser.
- Nomes próprios: reproduza como aparecem na transcrição, mesmo que a grafia pareça errada.

Nota atual:
{activeNote}
