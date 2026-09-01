import { describe, it, expect } from "vitest";
import { spawn } from "node:child_process";
import { join } from "node:path";

describe("mcp-server - protocolo JSON-RPC sobre stdio", () => {
  it("responde ao handshake initialize e tools/list", async () => {
    const scriptPath = join(process.cwd(), "scripts", "mcp-server.ts");
    const proc = spawn("node", ["--disable-warning=ExperimentalWarning", "--experimental-strip-types", scriptPath], {
      env: { ...process.env, KLAUS_DIR: process.cwd() },
      stdio: ["pipe", "pipe", "inherit"],
    });

    const enviarMsg = (msg: object) => {
      proc.stdin.write(JSON.stringify(msg) + "\n");
    };

    const respostas: any[] = [];

    proc.stdout.on("data", (chunk) => {
      const linhas = chunk.toString().split("\n").filter((l: string) => l.trim().length > 0);
      for (const l of linhas) {
        try {
          respostas.push(JSON.parse(l));
        } catch {}
      }
    });

    // 1. Envia initialize
    enviarMsg({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: { protocolVersion: "2024-11-05" },
    });

    // 2. Envia tools/list
    enviarMsg({
      jsonrpc: "2.0",
      id: 2,
      method: "tools/list",
      params: {},
    });

    await new Promise<void>((resolve) => {
      const timer = setTimeout(resolve, 2000);
      const verificar = () => {
        if (respostas.some((r) => r.id === 1) && respostas.some((r) => r.id === 2)) {
          clearTimeout(timer);
          resolve();
        }
      };
      proc.stdout.on("data", verificar);
      verificar();
    });
    proc.kill();

    const respInit = respostas.find((r) => r.id === 1);
    expect(respInit).toBeDefined();
    expect(respInit.result.serverInfo.name).toBe("klaus-mcp-server");

    const respTools = respostas.find((r) => r.id === 2);
    expect(respTools).toBeDefined();
    expect(respTools.result.tools.length).toBeGreaterThanOrEqual(4);
    const nomes = respTools.result.tools.map((t: any) => t.name);
    expect(nomes).toContain("klaus_listar");
    expect(nomes).toContain("klaus_ler");
    expect(nomes).toContain("klaus_criar");
  });
});
