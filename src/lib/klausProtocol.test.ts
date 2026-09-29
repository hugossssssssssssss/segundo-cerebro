import { describe, it, expect, beforeEach } from "vitest";
import {
  KLAUS_EVENTS,
  dispatchKlausEvent,
  listenKlausEvent,
} from "./klausEvents";
import {
  KLAUS_STORAGE,
  getKlausItem,
  setKlausItem,
  removeKlausItem,
  getKlausJson,
  setKlausJson,
} from "./klausStorage";

describe("Klaus Event Protocol", () => {
  it("contém eventos no padrão canônico klaus:domain:action", () => {
    expect(KLAUS_EVENTS.THEME_CHANGE).toBe("klaus:theme:change");
    expect(KLAUS_EVENTS.MENU_UPDATE).toBe("klaus:menu:update");
    expect(KLAUS_EVENTS.PROJECTS_UPDATE).toBe("klaus:projects:update");
    expect(KLAUS_EVENTS.WORKSPACE_CHANGE).toBe("klaus:workspace:change");
  });

  it("dispara evento canônico e ponte legada", () => {
    let eventoRecebido = false;
    let legadoRecebido = false;

    const removerCanonico = listenKlausEvent(KLAUS_EVENTS.THEME_CHANGE, (detalhe) => {
      eventoRecebido = true;
      expect(detalhe).toBe("escuro");
    });

    const handlerLegado = () => {
      legadoRecebido = true;
    };
    window.addEventListener("tema-alterado", handlerLegado);

    dispatchKlausEvent(KLAUS_EVENTS.THEME_CHANGE, "escuro");

    expect(eventoRecebido).toBe(true);
    expect(legadoRecebido).toBe(true);

    removerCanonico();
    window.removeEventListener("tema-alterado", handlerLegado);
  });
});

describe("Klaus Storage Namespace", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("migra automaticamente chave legada para chave canônica na leitura", () => {
    // Simula usuário que já tinha token em segundo-cerebro:config:enc
    localStorage.setItem("segundo-cerebro:config:enc", "dados_encriptados_antigos");

    const lido = getKlausItem(KLAUS_STORAGE.AUTH_CREDENTIALS);
    expect(lido).toBe("dados_encriptados_antigos");

    // Deve ter gravado na nova chave
    expect(localStorage.getItem(KLAUS_STORAGE.AUTH_CREDENTIALS)).toBe("dados_encriptados_antigos");
  });

  it("grava na chave canônica e mantém retrocompatibilidade na legada", () => {
    setKlausItem(KLAUS_STORAGE.UI_THEME, "escuro");

    expect(localStorage.getItem(KLAUS_STORAGE.UI_THEME)).toBe("escuro");
    expect(localStorage.getItem("klaus_tema_v1")).toBe("escuro");
  });

  it("remove itens em todas as chaves", () => {
    setKlausItem(KLAUS_STORAGE.NAV_MENU, JSON.stringify([{ id: "1" }]));
    expect(getKlausItem(KLAUS_STORAGE.NAV_MENU)).not.toBeNull();

    removeKlausItem(KLAUS_STORAGE.NAV_MENU);
    expect(localStorage.getItem(KLAUS_STORAGE.NAV_MENU)).toBeNull();
    expect(localStorage.getItem("klaus_menu_customizado")).toBeNull();
  });

  it("suporta serialização JSON", () => {
    const objeto = { nome: "Klaus Studio", ativo: true };
    setKlausJson(KLAUS_STORAGE.PROJECTS_REGISTRY, objeto);

    const lido = getKlausJson(KLAUS_STORAGE.PROJECTS_REGISTRY, null);
    expect(lido).toEqual(objeto);
  });
});
