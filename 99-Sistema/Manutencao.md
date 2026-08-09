---
tipo: sistema
tags: [sistema, manutencao]
---

# Manutenção

Escrito para o Hugo de daqui a seis meses, sozinho, quando algo parar de funcionar.

---

## Um painel parou de mostrar coisas

Quase sempre é o frontmatter. O Dataview compara texto **exato**.

Checklist, em ordem:

1. `status: concluido` — sem acento, minúsculo. `Concluída` não bate com `concluido`
2. `data: 2026-08-09` — sem aspas, formato AAAA-MM-DD
3. `tipo:` está preenchido?
4. O arquivo está na pasta que a query procura?

Para conferir a query: clique no bloco `dataview` e ele mostra o erro.

Se ainda não funcionar: ⌘P → *Dataview: Rebuild current view*.

## Adicionar uma meta nova ao PDI

1. Botão direito em `01-Trabalho/PDI/Metas` → *New note*
2. Nomeie `Meta - Alguma Coisa`
3. O template abre sozinho (Templater está configurado por pasta)
4. Preencha `indicador` e `horizonte`

Não precisa mexer no `PDI.md`. Ele acha a meta sozinho.

## Criar um dashboard novo

Copie um bloco de um painel existente e ajuste. Anatomia:

````
```dataview
TABLE campo1 AS "Título", campo2 AS "Outro"
FROM "pasta/onde/procurar"
WHERE condicao = "valor"
SORT campo1 DESC
```
````

Exemplos de `WHERE` que você vai querer:

| Objetivo | Escreva |
|---|---|
| Só de um tipo | `WHERE tipo = "entrega"` |
| Últimos 30 dias | `WHERE data >= date(today) - dur(30 days)` |
| Campo vazio | `WHERE !metas OR length(metas) = 0` |
| Com uma tag | `FROM #design` |
| Parado há tempo | `WHERE file.mtime <= date(today) - dur(30 days)` |

Documentação completa: https://blacksmithgu.github.io/obsidian-dataview/

## Trocar a chave de API ou o provedor de IA

Configurações → Copilot → aba Basic. Cole a chave nova e mude o **Default Model**.
Detalhes e alternativas em [[Camada de IA]].

## Atualizar plugins

Configurações → Community plugins → **Check for updates** → *Update all*.

Faça isso **depois** da revisão semanal, nunca antes de um dia cheio. Se um plugin quebrar depois de atualizar:

```
cd "/Users/hugosilva/Desktop/Projetos/Pessoal/Segundo Cerébro"
git log --oneline -10
git checkout <commit-anterior> -- .obsidian/plugins/<nome-do-plugin>
```

Depois reinicie o Obsidian.

## Recuperar algo que você apagou

```
cd "/Users/hugosilva/Desktop/Projetos/Pessoal/Segundo Cerébro"
git log --oneline --diff-filter=D -- "**/nome-parcial*"
git checkout <commit>^ -- "caminho/do/arquivo.md"
```

Se não souber o nome, procure pelo conteúdo:

```
git log -S "algum trecho que você lembra" --oneline
```

## O sync parou

**Syncthing:**
```
brew services restart syncthing
```
Interface em http://127.0.0.1:8384 — veja se a pasta está "Up to Date" e se o celular aparece conectado.

Os dois aparelhos precisam estar ligados e na mesma rede. Fora de casa não sincroniza (e tudo bem — sobe quando você voltar).

**Conflito** (`arquivo.sync-conflict-....md`): abra os dois, junte na mão, apague o de conflito. Nada foi perdido — o Syncthing nunca sobrescreve, só duplica.

## O vault ficou grande demais

Verifique:
```
cd "/Users/hugosilva/Desktop/Projetos/Pessoal/Segundo Cerébro"
du -sh _Anexos .git
```

Acima de ~1 GB no `.git`, o GitHub começa a reclamar. Nessa hora, tire as imagens do versionamento:

1. Acrescente `_Anexos/` ao `.gitignore`
2. **Antes disso, copie `_Anexos/` para um HD externo.** Sair do git significa perder o backup — a pasta passa a existir só no seu Mac

Não faça esse passo por precaução. Faça quando o número exigir.

## O Obsidian não abre / travou

1. Feche e reabra
2. Se persistir, inicie sem plugins: segure `Cmd` ao abrir (modo de segurança)
3. Ative os plugins um por um até achar o culpado
4. Em último caso, restaure a configuração inteira:
   ```
   git checkout HEAD -- .obsidian
   ```

Seus arquivos `.md` nunca são afetados por problema de plugin. Eles são texto puro.

---

## Se você quiser abandonar o Obsidian

Copie a pasta. Acabou.

Tudo é Markdown padrão. Abre no Typora, VSCode, Logseq, Zettlr, ou no TextEdit. Os `[[links]]` são convenção comum. O frontmatter YAML é padrão.

O que você perde ao sair: os painéis Dataview (viram texto), os arquivos `.canvas` (formato do Obsidian, mas é JSON legível) e o chat.
O que você leva: cada palavra que escreveu.

Isso não é um detalhe técnico — foi o critério que definiu a escolha da ferramenta no começo.
