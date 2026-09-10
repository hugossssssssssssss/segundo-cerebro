import { describe, it, expect } from "vitest";
import { buscarEmojisBilingue, CATALOGO_EMOJIS } from "./emojisBilingue";

describe("emojisBilingue", () => {
  it("carrega catálogo com emojis válidos", () => {
    expect(CATALOGO_EMOJIS.length).toBeGreaterThan(50);
  });

  it("encontra emojis buscando em português", () => {
    const fogo = buscarEmojisBilingue("fogo");
    expect(fogo.length).toBeGreaterThan(0);
    expect(fogo[0].emoji).toBe("🔥");

    const sorriso = buscarEmojisBilingue("sorriso");
    expect(sorriso.some((e) => e.emoji === "😀" || e.emoji === "😃" || e.emoji === "😊")).toBe(true);

    const ideia = buscarEmojisBilingue("ideia");
    expect(ideia[0].emoji).toBe("💡");

    const cafe = buscarEmojisBilingue("cafe");
    expect(cafe[0].emoji).toBe("☕");
  });

  it("encontra emojis buscando em inglês", () => {
    const fire = buscarEmojisBilingue("fire");
    expect(fire[0].emoji).toBe("🔥");

    const rocket = buscarEmojisBilingue("rocket");
    expect(rocket[0].emoji).toBe("🚀");

    const target = buscarEmojisBilingue("target");
    expect(target[0].emoji).toBe("🎯");

    const coffee = buscarEmojisBilingue("coffee");
    expect(coffee[0].emoji).toBe("☕");
  });

  it("suporta busca sem acentos e com caixa alta/baixa", () => {
    const lampada = buscarEmojisBilingue("LAMPADA");
    expect(lampada[0].emoji).toBe("💡");

    const coracao = buscarEmojisBilingue("coração");
    expect(coracao.some((e) => e.emoji === "❤️" || e.emoji === "💖")).toBe(true);
  });
});
