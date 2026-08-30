# Como Conectar o Klaus ao Claude Desktop via MCP

O Klaus possui um servidor nativo baseado no protocolo **Model Context Protocol (MCP)**, permitindo que o Claude Desktop (ou outros clientes compatíveis) leia, crie e pesquise suas notas e tarefas diretamente pelo chat.

---

## 1. Localização do Servidor MCP
O servidor executável está localizado em:
```bash
scripts/mcp-server.ts
```

Ele roda sobre Node.js nativo utilizando entrada e saída padrão (`stdio`) com mensagens JSON-RPC 2.0.

---

## 2. Configurando no Claude Desktop

1. Abra o arquivo de configuração do Claude Desktop no seu Mac:
   ```bash
   code ~/Library/Application\ Support/Claude/claude_desktop_config.json
   ```
2. Adicione o bloco `klaus` dentro da chave `mcpServers`:
   ```json
   {
     "mcpServers": {
       "klaus": {
         "command": "node",
         "args": [
           "--disable-warning=ExperimentalWarning",
           "--experimental-strip-types",
           "/Users/hugosilva/Desktop/Projetos/Pessoal/Segundo Cerébro/scripts/mcp-server.ts"
         ],
         "env": {
           "KLAUS_DIR": "/Users/hugosilva/Desktop/Projetos/Pessoal/Segundo Cerébro"
         }
       }
     }
   }
   ```
3. Reinicie o Claude Desktop.

---

## 3. Ferramentas Disponíveis

| Ferramenta | Descrição |
|---|---|
| `klaus_listar` | Lista todos os arquivos `.md` por pasta (`tarefas`, `notas`, `pdi/metas`, etc.). |
| `klaus_ler` | Lê o conteúdo completo com o frontmatter YAML de um item. |
| `klaus_criar` | Cria uma nota ou tarefa com frontmatter padronizado e a marca `ia_sugeriu: true`. |
| `klaus_editar` | Modifica o texto ou metadados de uma nota existente. |
| `klaus_buscar` | Pesquisa por termos em todo o seu acervo pessoal. |

Toda criação via MCP respeita os princípios soberanos do Klaus: o arquivo `.md` é a única fonte da verdade e pode ser editado pelo aplicativo ou pelo Claude sem intermediários.
