import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { registrarServiceWorker, useStatusRede } from "./pwa";

describe("pwa", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("não deve estourar erro ao registrar Service Worker se não suportado", () => {
    Object.defineProperty(navigator, "serviceWorker", {
      value: undefined,
      configurable: true,
      writable: true,
    });

    expect(() => registrarServiceWorker()).not.toThrow();
  });

  it("deve tentar registrar o sw.js quando serviceWorker existir", () => {
    const registerMock = vi.fn().mockReturnValue(new Promise(() => {}));
    Object.defineProperty(navigator, "serviceWorker", {
      value: { register: registerMock },
      configurable: true,
      writable: true,
    });

    registrarServiceWorker();
    // Dispara o evento load
    window.dispatchEvent(new Event("load"));

    expect(registerMock).toHaveBeenCalledWith("./sw.js");
  });

  it("deve reagir a eventos online e offline no hook useStatusRede", () => {
    const { result } = renderHook(() => useStatusRede());

    expect(result.current.online).toBe(true);

    act(() => {
      window.dispatchEvent(new Event("offline"));
    });
    expect(result.current.online).toBe(false);

    act(() => {
      window.dispatchEvent(new Event("online"));
    });
    expect(result.current.online).toBe(true);
  });
});
