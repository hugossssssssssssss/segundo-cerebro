import { Modal, Botao } from "@/components/ui";

interface ModalComoJogarTermoProps {
  aberto: boolean;
  aoFechar: () => void;
}

export function ModalComoJogarTermo({
  aberto,
  aoFechar,
}: ModalComoJogarTermoProps) {
  return (
    <Modal aberto={aberto} aoFechar={aoFechar} titulo="Como Jogar o Termo">
      <div className="space-y-4 text-sm text-muted-foreground py-1 leading-relaxed">
        <p>
          Adivinhe a palavra secreta de <strong>5 letras</strong> em português. No <strong>Termo</strong> você tem 6 tentativas, no <strong>Dueto</strong> 7 tentativas para 2 palavras e no <strong>Quarteto</strong> 9 tentativas para 4 palavras.
        </p>
        <p>
          Após cada tentativa, as letras mudarão de cor para mostrar o quão perto você chegou da solução:
        </p>

        {/* Exemplos Visuais */}
        <div className="space-y-3 pt-2">
          {/* Exemplo 1: Verde */}
          <div className="space-y-1.5 p-3 rounded-xl bg-secondary/40 border border-border/60">
            <div className="flex gap-1.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#3aa394] text-white font-extrabold text-lg">
                T
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-card font-bold text-lg text-foreground">
                U
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-card font-bold text-lg text-foreground">
                R
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-card font-bold text-lg text-foreground">
                M
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-card font-bold text-lg text-foreground">
                A
              </div>
            </div>
            <p className="text-xs pt-1">
              A letra <strong className="text-[#3aa394] dark:text-[#3aa394]">T</strong> faz parte da palavra e está na <strong>posição correta</strong>.
            </p>
          </div>

          {/* Exemplo 2: Amarelo */}
          <div className="space-y-1.5 p-3 rounded-xl bg-secondary/40 border border-border/60">
            <div className="flex gap-1.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-card font-bold text-lg text-foreground">
                P
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-card font-bold text-lg text-foreground">
                I
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#d7a22a] text-white font-extrabold text-lg">
                A
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-card font-bold text-lg text-foreground">
                N
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-card font-bold text-lg text-foreground">
                O
              </div>
            </div>
            <p className="text-xs pt-1">
              A letra <strong className="text-[#d7a22a] dark:text-[#d7a22a]">A</strong> faz parte da palavra, mas em <strong>outra posição</strong>.
            </p>
          </div>

          {/* Exemplo 3: Cinza */}
          <div className="space-y-1.5 p-3 rounded-xl bg-secondary/40 border border-border/60">
            <div className="flex gap-1.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-card font-bold text-lg text-foreground">
                V
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-card font-bold text-lg text-foreground">
                O
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#6b7280]/85 text-white/90 font-bold text-lg">
                Z
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-card font-bold text-lg text-foreground">
                E
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-card font-bold text-lg text-foreground">
                S
              </div>
            </div>
            <p className="text-xs pt-1">
              A letra <strong className="text-muted-foreground">Z</strong> <strong>não faz parte</strong> da palavra em nenhuma posição.
            </p>
          </div>
        </div>

        <div className="space-y-1.5 pt-2 border-t border-border text-xs text-muted-foreground">
          <p>• As palavras podem conter letras repetidas.</p>
          <p>• Você pode tocar/clicar em qualquer casa para editar aquela letra específica.</p>
          <p>• Os acentos são preenchidos e revelados automaticamente ao acertar.</p>
          <p>• Uma nova rodada diária fica disponível todos os dias à meia-noite!</p>
        </div>

        <div className="pt-2 flex justify-end">
          <Botao onClick={aoFechar}>Entendi, vamos jogar!</Botao>
        </div>
      </div>
    </Modal>
  );
}
