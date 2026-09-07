import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import {
  Button,
  Botao,
  Badge,
  Selo,
  Card,
  Cartao,
  Input,
  Campo,
  Textarea,
  AreaTexto,
  Vazio,
  Carregando,
  Aviso,
  Rotulo,
} from "./index"

describe("Design System Unificado (@/components/ui)", () => {
  it("renderiza Button e Botao com compatibilidade de variantes", async () => {
    const fn = vi.fn()
    render(
      <div>
        <Button variant="destructive" onClick={fn}>Botão Radix</Button>
        <Botao variante="primario" onClick={fn}>Botão Alias</Botao>
        <Botao variante="perigo">Botão Perigo</Botao>
      </div>
    )

    const btnRadix = screen.getByText("Botão Radix")
    const btnAlias = screen.getByText("Botão Alias")
    expect(btnRadix).toBeDefined()
    expect(btnAlias).toBeDefined()

    await userEvent.click(btnRadix)
    await userEvent.click(btnAlias)
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it("renderiza Badge e Selo com suporte a tons semânticos", () => {
    render(
      <div>
        <Badge variant="secondary">Badge Teste</Badge>
        <Selo tom="sucesso">Selo Sucesso</Selo>
        <Selo tom="aviso">Selo Aviso</Selo>
      </div>
    )

    expect(screen.getByText("Badge Teste")).toBeDefined()
    expect(screen.getByText("Selo Sucesso")).toBeDefined()
    expect(screen.getByText("Selo Aviso")).toBeDefined()
  })

  it("renderiza Card e Cartao preservando estrutura", () => {
    render(
      <div>
        <Card data-testid="card-radix">Conteúdo Card</Card>
        <Cartao data-testid="cartao-alias">Conteúdo Cartão</Cartao>
      </div>
    )

    expect(screen.getByTestId("card-radix")).toBeDefined()
    expect(screen.getByTestId("cartao-alias")).toBeDefined()
  })

  it("renderiza Input, Campo, Textarea e AreaTexto", () => {
    render(
      <div>
        <Input placeholder="input-padrao" />
        <Campo placeholder="campo-alias" />
        <Textarea placeholder="textarea-padrao" />
        <AreaTexto placeholder="area-texto-alias" />
      </div>
    )

    expect(screen.getByPlaceholderText("input-padrao")).toBeDefined()
    expect(screen.getByPlaceholderText("campo-alias")).toBeDefined()
    expect(screen.getByPlaceholderText("textarea-padrao")).toBeDefined()
    expect(screen.getByPlaceholderText("area-texto-alias")).toBeDefined()
  })

  it("renderiza componentes de feedback e rótulo", () => {
    render(
      <div>
        <Rotulo obrigatorio dica="Dica importante">Nome do Campo</Rotulo>
        <Aviso tom="erro">Erro no processo</Aviso>
        <Vazio titulo="Nenhum item encontrado" descricao="Tente outra busca" />
        <Carregando texto="Processando dados..." />
      </div>
    )

    expect(screen.getByText("Nome do Campo")).toBeDefined()
    expect(screen.getByText("Dica importante")).toBeDefined()
    expect(screen.getByText("Erro no processo")).toBeDefined()
    expect(screen.getByText("Nenhum item encontrado")).toBeDefined()
    expect(screen.getByText("Processando dados...")).toBeDefined()
  })
})
