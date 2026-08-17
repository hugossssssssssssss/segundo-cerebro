/**
 * Gerenciamento centralizado do tema do Klaus (claro/escuro).
 *
 * Utiliza exclusivamente a chave "tema" no localStorage e os valores
 * "escuro" ou "claro", garantindo sincronia entre a busca global,
 * a barra lateral, a gaveta mobile e a inicialização do app.
 */

export type Tema = "claro" | "escuro";

const CHAVE_TEMA = "tema";

export function lerTemaSalvo(): Tema {
  try {
    const salvo = localStorage.getItem(CHAVE_TEMA);
    if (salvo === "escuro" || salvo === "claro") return salvo;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "escuro" : "claro";
  } catch {
    return "claro";
  }
}

export function aplicarTema(tema: Tema): void {
  try {
    localStorage.setItem(CHAVE_TEMA, tema);
  } catch {
    // ignora falhas de gravação em localStorage
  }
  if (tema === "escuro") {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }
}

export function alternarTema(): Tema {
  const atual = lerTemaSalvo();
  const novo: Tema = atual === "escuro" ? "claro" : "escuro";
  aplicarTema(novo);
  window.dispatchEvent(new CustomEvent("tema-alterado", { detail: novo }));
  return novo;
}
