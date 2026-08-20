import { vi } from "vitest";

if (typeof window !== "undefined") {
  const store = new Map<string, string>();

  // Sobrescreve os métodos do prototype de Storage para usar o mapa em memória
  Storage.prototype.getItem = function (key: string) {
    return store.has(key) ? store.get(key)! : null;
  };

  Storage.prototype.setItem = function (key: string, value: string) {
    store.set(key, value);
  };

  Storage.prototype.removeItem = function (key: string) {
    store.delete(key);
  };

  Storage.prototype.clear = function () {
    store.clear();
  };

  Storage.prototype.key = function (index: number) {
    const keys = Array.from(store.keys());
    return keys[index] || null;
  };

  Object.defineProperty(Storage.prototype, "length", {
    get() {
      return store.size;
    },
    configurable: true,
  });

  try {
    // @ts-ignore
    delete globalThis.localStorage;
  } catch (e) {}

  // Cria ou reusa a instância baseada no prototype do Storage
  const storageInstance = window.localStorage || Object.create(Storage.prototype);
  
  vi.stubGlobal("localStorage", storageInstance);
  try {
    // @ts-ignore
    window.localStorage = storageInstance;
  } catch (e) {}
}
