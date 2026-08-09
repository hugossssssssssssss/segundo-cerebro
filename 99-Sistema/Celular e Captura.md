---
tipo: sistema
tags: [sistema, mobile]
---

# Celular e captura rápida

## Parte 1 — Captura no Mac

O QuickAdd já vem com 5 comandos prontos. Falta só amarrar um atalho de teclado ao principal.

**Configurações → Atalhos (Hotkeys) → busque "QuickAdd"**

Sugestão de atalho para `QuickAdd: ⚡ Captura rápida`: `⌘⇧N`.

Os cinco comandos:

| Comando | O que faz |
|---|---|
| ⚡ Captura rápida | Uma linha no Inbox do dia. É o que você mais vai usar |
| ✅ Nova tarefa | Tarefa com prazo, direto no Inbox |
| 📦 Registrar entrega | Cria a nota de entrega já com o template |
| 🎨 Nova referência visual | Nota de referência em `Referencias/Visual` |
| 🗣️ Nova reunião | Nota de reunião com espaço para a transcrição |

### Captura sem abrir o Obsidian

Para capturar com o Obsidian fechado, instale o **Raycast** (gratuito) e crie um Quicklink com esta URL:

```
obsidian://advanced-uri?vault=Segundo%20Cer%C3%A9bro&daily=true&mode=append&data={argument}
```

Isso exige o plugin *Advanced URI* — não instalei porque só faz sentido se você adotar o Raycast. Se quiser, é um plugin a mais na mesma tela de comunidade.

---

## Parte 2 — Syncthing (Mac ⇄ Android)

O Syncthing sincroniza direto entre os dois aparelhos, pela sua rede. Sem nuvem, sem conta, sem limite, sem custo.

### No Mac

Já está instalado. Para ligar:

```
brew services start syncthing
```

Isso o faz subir sozinho toda vez que você ligar o Mac. A interface abre em **http://127.0.0.1:8384**.

Na interface:
1. **Add Folder** → aponte para `/Users/hugosilva/Desktop/Projetos/Pessoal/Segundo Cerébro`
2. Folder Label: `Segundo Cerebro`
3. Em **Ignore Patterns**, o Syncthing já vai ler o arquivo `.stignore` que está na raiz do vault — confira se ele aparece lá. É esse arquivo que impede as imagens de irem para o celular.

### No Android

1. Instale o **Syncthing** (Play Store, gratuito e open source)
2. No Mac: *Actions → Show ID* (mostra um QR code)
3. No Android: *Devices → + → escanear o QR code*
4. Aceite o pareamento no Mac quando ele perguntar
5. No Mac, edite a pasta → aba **Sharing** → marque o celular
6. No Android, aceite a pasta compartilhada e escolha onde salvar

### No Obsidian do Android

Instale o Obsidian pela Play Store, abra e escolha *Open folder as vault*, apontando para a pasta que o Syncthing criou.

Os plugins vão junto (estão dentro de `.obsidian/`, que sincroniza). O Copilot funciona no celular.

### O que esperar

- As imagens **não aparecem** no Android. Você vê o texto e um link quebrado no lugar. Foi decisão sua, para o sync ficar leve e gratuito.
- O Syncthing sincroniza quando os dois aparelhos estão ligados na mesma rede. Fora de casa, as mudanças ficam guardadas e sobem quando você voltar.
- Não edite a mesma nota nos dois aparelhos ao mesmo tempo. Se acontecer, o Syncthing cria um arquivo `.sync-conflict-...` em vez de perder conteúdo.

### Se o Syncthing virar atrito

Alternativa: plugin **Remotely Save** contra o Dropbox gratuito, com `_Anexos` na lista de exclusão. Passa por nuvem, mas são poucos MB de texto e configura em dois minutos. Nada mais no vault precisa mudar.

---

## Parte 3 — Captura no Android

O app do Obsidian traz um widget de captura rápida. Adicione na tela inicial: segure na tela → Widgets → Obsidian.

Para salvar links de outros apps: compartilhar → Obsidian. Cai no Inbox.
