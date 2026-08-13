import { useState } from "react";
import { CheckCircle2, XCircle, ExternalLink } from "lucide-react";
import { lerConfig, salvarConfig, type Settings } from "@/lib/settings";
import { testarConexao } from "@/lib/github";
import { Botao, Campo, Cartao, Rotulo, Aviso } from "@/components/ui";

export default function Configuracoes() {
  const [cfg, setCfg] = useState<Settings>(lerConfig);
  const [testando, setTestando] = useState(false);
  const [resultado, setResultado] = useState<
    { ok: boolean; texto: string } | null
  >(null);

  const atualizar = (campo: keyof Settings, valor: string) => {
    setCfg((c) => ({ ...c, [campo]: valor }));
    setResultado(null);
  };

  async function salvarETestar() {
    salvarConfig(cfg);
    setTestando(true);
    setResultado(null);

    const r = await testarConexao(cfg);
    setResultado(
      r.ok
        ? { ok: true, texto: `Conectado em ${r.repo}. Tudo certo.` }
        : { ok: false, texto: r.erro },
    );
    setTestando(false);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Ajustes</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Estes dados ficam guardados só no navegador deste aparelho. Nunca vão
          para o código nem para a internet.
        </p>
      </div>

      <Cartao className="p-5 space-y-4">
        <h2 className="font-medium">Onde suas anotações ficam guardadas</h2>

        <div>
          <Rotulo dica="Seu usuário do GitHub, exatamente como aparece no perfil.">
            Sua conta
          </Rotulo>
          <Campo
            value={cfg.repoOwner}
            onChange={(e) => atualizar("repoOwner", e.target.value)}
            placeholder="hugosilva"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
          />
        </div>

        <div>
          <Rotulo dica="O repositório privado onde os arquivos .md ficam.">
            Repositório dos dados
          </Rotulo>
          <Campo
            value={cfg.repoName}
            onChange={(e) => atualizar("repoName", e.target.value)}
            placeholder="segundo-cerebro-dados"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
          />
        </div>

        <div>
          <Rotulo dica="Chave de acesso. Precisa de permissão de Contents: Read and write.">
            Token do GitHub
          </Rotulo>
          <Campo
            type="password"
            value={cfg.githubToken}
            onChange={(e) => atualizar("githubToken", e.target.value)}
            placeholder="github_pat_..."
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
          />
          <a
            href="https://github.com/settings/personal-access-tokens/new"
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
          >
            Criar um token novo <ExternalLink size={12} />
          </a>
        </div>
      </Cartao>

      <Cartao className="p-5 space-y-4">
        <div>
          <h2 className="font-medium">Inteligência artificial</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Opcional. Só é usada na aba de Chat — o resto do app funciona sem.
          </p>
        </div>

        <div>
          <Rotulo dica="Chave do Google AI Studio. Tem plano gratuito.">
            Chave do Gemini
          </Rotulo>
          <Campo
            type="password"
            value={cfg.geminiKey}
            onChange={(e) => atualizar("geminiKey", e.target.value)}
            placeholder="AIza..."
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
          />
          <a
            href="https://aistudio.google.com/apikey"
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
          >
            Pegar minha chave <ExternalLink size={12} />
          </a>
        </div>

        <div>
          <Rotulo dica="Flash é rápido e gratuito. Pro pensa melhor em textos longos.">
            Modelo
          </Rotulo>
          <select
            value={cfg.geminiModel}
            onChange={(e) => atualizar("geminiModel", e.target.value)}
            className="flex h-11 w-full rounded-lg border border-input bg-card px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
            <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
          </select>
        </div>
      </Cartao>

      <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
        <Botao onClick={salvarETestar} disabled={testando}>
          {testando ? "Testando…" : "Salvar e testar conexão"}
        </Botao>
        {resultado && (
          <span
            className={`inline-flex items-center gap-2 text-sm ${
              resultado.ok ? "text-[var(--success)]" : "text-destructive"
            }`}
          >
            {resultado.ok ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
            {resultado.texto}
          </span>
        )}
      </div>

      <Aviso>
        <strong>Por que um token?</strong> Ele é a chave que deixa este site
        gravar seus arquivos no seu repositório. Como não existe servidor, é o
        seu navegador que fala direto com o GitHub — por isso a chave fica aqui,
        e só aqui. Se você abrir o site em outro aparelho, precisa colar de novo.
      </Aviso>
    </div>
  );
}
