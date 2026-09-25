import { useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";

/**
 * Sequência de fluxo das telas principais do Klaus para navegação tátil por gestos (swipe).
 * Início <---> Tarefas <---> Notas <---> Metas (PDI)
 */
const ORDEM_TELAS = ["/home", "/tarefas", "/notas", "/pdi"];

export function useSwipeNavegacao(habilitado = true) {
  const navegar = useNavigate();
  const location = useLocation();
  const toqueInicioX = useRef<number | null>(null);
  const toqueInicioY = useRef<number | null>(null);
  const tempoInicio = useRef<number>(0);

  useEffect(() => {
    if (!habilitado) return;

    // Detecta em qual tela da esteira estamos
    const rotaAtual = location.pathname === "/" ? "/home" : location.pathname;
    const indiceAtual = ORDEM_TELAS.indexOf(rotaAtual);

    // Se estiver em uma tela que não faz parte do fluxo principal, não aplica swipe
    if (indiceAtual === -1) return;

    const elemento = document.querySelector("main");
    if (!elemento) return;

    const lidarTouchStart = (e: TouchEvent) => {
      // Ignora gestos com múltiplos dedos
      if (e.touches.length !== 1) return;

      const alvo = e.target as HTMLElement;
      // Não intercepta se o toque começou em inputs, sliders, canvas ou elementos com rolagem horizontal própria
      if (
        alvo.closest("input") ||
        alvo.closest("textarea") ||
        alvo.closest("canvas") ||
        alvo.closest("[data-no-swipe]") ||
        alvo.closest(".overflow-x-auto")
      ) {
        toqueInicioX.current = null;
        toqueInicioY.current = null;
        return;
      }

      toqueInicioX.current = e.touches[0].clientX;
      toqueInicioY.current = e.touches[0].clientY;
      tempoInicio.current = Date.now();
    };

    const lidarTouchEnd = (e: TouchEvent) => {
      if (toqueInicioX.current === null || toqueInicioY.current === null) return;

      const toqueFimX = e.changedTouches[0].clientX;
      const toqueFimY = e.changedTouches[0].clientY;
      const deltaX = toqueFimX - toqueInicioX.current;
      const deltaY = toqueFimY - toqueInicioY.current;
      const duracao = Date.now() - tempoInicio.current;

      toqueInicioX.current = null;
      toqueInicioY.current = null;

      // Ignora se o gesto durou muito tempo (mais de 600ms) ou se a distância foi pequena (< 55px)
      if (duracao > 600 || Math.abs(deltaX) < 55) return;

      // O gesto deve ser predominantemente horizontal
      if (Math.abs(deltaX) < Math.abs(deltaY) * 1.5) return;

      // Se deltaX < 0: o dedo foi para a esquerda (swipe left) -> avança para a próxima tela
      // Ex: Início -> Tarefas -> Notas -> Metas
      if (deltaX < 0) {
        if (indiceAtual < ORDEM_TELAS.length - 1) {
          const proxima = ORDEM_TELAS[indiceAtual + 1];
          navegar(proxima);
        }
      } else {
        // Se deltaX > 0: o dedo foi para a direita (swipe right) -> volta para a tela anterior
        // Ex: Metas -> Notas -> Tarefas -> Início
        if (indiceAtual > 0) {
          const anterior = ORDEM_TELAS[indiceAtual - 1];
          navegar(anterior);
        }
      }
    };

    elemento.addEventListener("touchstart", lidarTouchStart, { passive: true });
    elemento.addEventListener("touchend", lidarTouchEnd, { passive: true });

    return () => {
      elemento.removeEventListener("touchstart", lidarTouchStart);
      elemento.removeEventListener("touchend", lidarTouchEnd);
    };
  }, [habilitado, location.pathname, navegar]);
}
