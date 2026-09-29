# Arquitetura e Linguagem Canônica do Klaus

Este documento define a arquitetura, convenções de código, barramento de eventos, armazenamento e motor de extensões do **Klaus** (segundo cérebro).

---

## 1. Visão Geral e Filosofia

O Klaus é uma aplicação web estática (SPA em React + TypeScript) projetada para funcionar com **custo zero** e **sem servidor backend próprio**:
* **Fonte da Verdade:** Arquivos Markdown e JSON armazenados diretamente no repositório privado do usuário no GitHub (`hugossssssssssssss/segundo-cerebro-dados`).
* **Segurança e Privacidade:** Tokens do GitHub e chaves de IA residem exclusivamente no navegador do usuário (`localStorage`), trafegando direto entre o cliente e a API do GitHub/Google.
* **Experiência Visual e Identidade:** Interface moderna, minimalista e premium feita sob medida para o designer Hugo Silva. A interface da aplicação fala **português do Brasil**, enquanto o código-fonte, arquitetura interna, eventos e identificadores seguem a convenção técnica internacional em **inglês**.

```
Navegador (Desktop Mac / Android / Extensão Chrome)
   │
   ├─► api.github.com (Commits, Markdown e Manifestos de Projetos)
   ├─► generativelanguage.googleapis.com (Gemini IA com ferramentas)
   └─► LocalStorage (Cache em Espelho sob Namespace Canônico klaus:*)
```

---

## 2. Padrões de Nomenclatura & Linguagem Klaus

Para garantir consistência e evitar termos confusos ou misturas sem padrão (como `"evento_personalizado_alterada"`), o Klaus adota convenções formais rigorosas:

| Camada | Convenção | Exemplos |
|---|---|---|
| **Eventos do Sistema** | `klaus:<dominio>:<acao>` | `klaus:theme:change`, `klaus:menu:update`, `klaus:workspace:change` |
| **Armazenamento (Storage)** | `klaus:<dominio>` ou `klaus:<dominio>:<subdominio>` | `klaus:ui:theme`, `klaus:auth:credentials`, `klaus:projects:registry` |
| **Arquivos de Configuração** | `.klaus/<recurso>.json` | `.klaus/projetos.json`, `.klaus/favoritos.json`, `.klaus/preferencias.json` |
| **Projetos e Extensões** | `.klaus/projetos/<id>/manifest.json` | `.klaus/projetos/conversor/manifest.json` |
| **Pacote Exportável** | `<id>.klaus-ext.json` | `conversor.klaus-ext.json` |
| **Métodos do SDK** | `loadKlaus...()`, `saveKlaus...()`, `applyKlaus...()` | `loadKlausProjects()`, `applyKlausTheme()` |

---

## 3. Klaus Event Protocol (`klausEvents.ts`)

O barramento central de comunicação reativa desacoplada do Klaus. Todos os eventos internos são emitidos através do protocolo canônico.

### Identificadores Oficiais (`KLAUS_EVENTS`)

```ts
export const KLAUS_EVENTS = {
  // Tema & Interface
  THEME_CHANGE: "klaus:theme:change",
  THEME_CUSTOMIZATION_CHANGE: "klaus:theme:customization-change",

  // Navegação & Menu
  MENU_UPDATE: "klaus:menu:update",
  NAV_FAVORITES_CHANGE: "klaus:nav:favorites-change",

  // Projetos & Extensões
  PROJECTS_UPDATE: "klaus:projects:update",

  // Workspaces (Espaços de Trabalho)
  WORKSPACE_CHANGE: "klaus:workspace:change",

  // Preferências & Configurações
  PREFERENCES_SYNC: "klaus:preferences:sync",
  SETTINGS_UPDATE: "klaus:settings:update",
  WIDGETS_CHANGE: "klaus:widgets:change",

  // HUD & Notificações
  NOTIFICATIONS_TOGGLE: "klaus:notifications:toggle",
  INVENTORY_UPDATE: "klaus:inventory:update",
};
```

### Como Utilizar

```ts
import { dispatchKlausEvent, listenKlausEvent, KLAUS_EVENTS } from "@/lib/klausSdk";

// Disparar evento:
dispatchKlausEvent(KLAUS_EVENTS.THEME_CHANGE, "escuro");

// Ouvir evento (com limpeza no useEffect):
useEffect(() => {
  const unlisten = listenKlausEvent(KLAUS_EVENTS.THEME_CHANGE, (tema) => {
    console.log("Tema alterado:", tema);
  });
  return unlisten;
}, []);
```

> **Retrocompatibilidade:** O método `dispatchKlausEvent` emite tanto o evento canônico quanto os nomes legados anteriores (ex: `tema-alterado`, `klaus-favoritos-atualizados`), garantindo que nenhuma parte do sistema deixe de responder.

---

## 4. Klaus Storage Namespace (`klausStorage.ts`)

Todas as chaves persistidas no navegador residem sob o namespace `klaus:*`.

### Chaves Canônicas (`KLAUS_STORAGE`)

* **Autenticação:** `klaus:auth:credentials`, `klaus:auth:device-salt`, `klaus:auth:global-token`
* **Espaços de Trabalho:** `klaus:workspaces:list`, `klaus:workspaces:active`
* **Navegação & UI:** `klaus:nav:menu`, `klaus:nav:favorites`, `klaus:ui:theme`, `klaus:ui:font-size`
* **Projetos:** `klaus:projects:registry`
* **Preferências & Home:** `klaus:preferences:general`, `klaus:preferences:sync-status`, `klaus:widgets:home`, `klaus:home:edit-mode`

### Migração Automática e Gravação em Espelho

* `getKlausItem(chave)`: Busca pela chave canônica. Se não existir, verifica as chaves antigas (`segundo-cerebro:*` e `klaus_*`), migra o valor automaticamente para a chave canônica e o retorna.
* `setKlausItem(chave, valor)`: Grava na chave canônica e atualiza as chaves legadas correspondentes em espelho, assegurando que extensões do Chrome e testes existentes permaneçam 100% funcionais.
* `getKlausJson<T>(chave)` e `setKlausJson<T>(chave, valor)`: Tratamento seguro de JSON com fallbacks.

---

## 5. Klaus App Engine & Manifest (`klausEngine.ts`)

A engine de execução permite que ferramentas e mini-aplicativos vivam dentro do Klaus com sandbox seguro e harmonia visual.

### Estrutura do `manifest.json`

Localizado em `.klaus/projetos/<id>/manifest.json`:

```json
{
  "id": "calculadora_orcamento",
  "name": "Calculadora de Orçamento",
  "version": "1.0.0",
  "description": "Calculadora de propostas para projetos de design.",
  "entry": "index.html",
  "category": "design",
  "icon": "Calculator",
  "color": "#6366f1",
  "permissions": ["theme", "ui", "storage"],
  "theme": {
    "supportsDark": true,
    "accentColor": "#6366f1"
  },
  "sandbox": {
    "allowScripts": true,
    "allowPopups": true,
    "allowSameOrigin": false
  }
}
```

### Variáveis CSS Injetadas Automaticamente

O Klaus extrai o tema atual e injeta variáveis CSS nativas no `<head>` do app/iframe antes da renderização:

```css
:root {
  --klaus-theme: dark;           /* "dark" ou "light" */
  --klaus-bg: #0f172a;           /* Fundo principal */
  --klaus-fg: #f8fafc;           /* Texto */
  --klaus-card: #1e293b;         /* Fundo de cartões */
  --klaus-border: #334155;       /* Bordas */
  --klaus-primary: #f59e0b;      /* Cor de destaque ativa */
  --klaus-primary-fg: #0f172a;   /* Texto sobre destaque */
  --klaus-muted: #94a3b8;        /* Texto secundário */
}
```

### Comunicação Segura do App com o Klaus (`window.__KLAUS_APP__`)

Todo mini-app tem acesso ao objeto de ponte seguro:

```js
// Obter informações do manifesto e tema ativo:
console.log(window.__KLAUS_APP__.manifest);
console.log(window.__KLAUS_APP__.theme);

// Ler dados do armazenamento isolado da extensão:
window.__KLAUS_APP__.call("read_storage", { key: "minha_chave" })
  .then(valor => console.log(valor));

// Gravar dados:
window.__KLAUS_APP__.call("write_storage", { key: "minha_chave", value: "123" });
```

As chamadas são validadas contra as `permissions` declaradas no `manifest.json`.

---

## 6. Klaus CLI (`scripts/klaus-cli.js`)

Ferramenta de terminal para desenvolvimento, validação e empacotamento:

```bash
# 1. Criar novo projeto com boilerplate completo
npm run klaus:new meu-projeto "Meu Projeto Criativo"

# 2. Validar integridade dos manifestos
npm run klaus:validate

# 3. Empacotar para compartilhamento (.klaus-ext.json)
npm run klaus:pack meu-projeto

# 4. Desempacotar pacote existente
node scripts/klaus-cli.js unpack meu-projeto.klaus-ext.json
```

---

## 7. Pacotes de Extensão (`.klaus-ext.json`)

Para permitir que extensões sejam exportadas, importadas e compartilhadas entre computadores sem depender de branches ou commits manuais:

```json
{
  "format": "klaus-extension-v1",
  "manifest": {
    "id": "meu_projeto",
    "name": "Meu Projeto",
    "version": "1.0.0",
    "entry": "index.html"
  },
  "files": {
    "index.html": "<!DOCTYPE html>...",
    "style.css": "..."
  },
  "createdAt": "2026-09-29T11:45:00.000Z"
}
```

Na tela **Biblioteca de Projetos & Extensões** (`/biblioteca`), os botões **Importar** e **Exportar** operam diretamente sobre esse formato com validação em tempo real.

---

## 8. Klaus Core SDK (`klausSdk.ts`)

Centraliza e reexporta as operações canônicas do sistema:

```ts
import {
  loadKlausProjects,
  saveKlausProject,
  toggleKlausExtension,
  getKlausExtensionCatalog,
  loadKlausWorkspaces,
  getActiveKlausWorkspace,
  loadKlausTheme,
  applyKlausTheme,
  loadKlausPreferences,
  saveKlausPreferences,
  dispatchKlausEvent,
  listenKlausEvent,
  KLAUS_EVENTS,
  KLAUS_STORAGE,
} from "@/lib/klausSdk";
```

Qualquer novo módulo, tela ou agente de IA deve utilizar esta camada padronizada, garantindo código limpo, consistente e seguro.
