import { useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";

/**
 * Esteira sequencial de telas principais no Klaus:
 * [0: Início /home] <---> [1: Tarefas /tarefas] <---> [2: Notas /notas] <---> [3: Metas /pdi]
 */
const ESTEIRA = ["/home", "/tarefas", "/notas", "/pdi"];

export function useSwipeNavegacao(habilitado = true) {
  const navegar = useNavigate();
  const location = useLocation();
  const toqueInicioX = useRef<number | null>(null);
  const toqueInicioY = useRef<number | null>(null);
  const ultimoX = useRef<number | null>(null);
  const ultimoY = useRef<number | null>(null);
  const tempoInicio = useRef<number>(0);

  useEffect(() => {
    if (!habilitado) return;

    // Normaliza rota atual
    let rotaBase = location.pathname;
    if (rotaBase === "/") rotaBase = "/home";

    // Encontra índice na esteira
    const indiceAtual = ESTEIRA.findIndex((r) => rotaBase.startsWith(r));
    if (indiceAtual === -1) return;

    const lidarTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;

      const alvo = e.target as HTMLElement | null;
      if (!alvo) return;

      // Não intercepta se o toque começou em campos de texto, sliders, canvas ou elementos com scroll horizontal
      if (
        alvo.closest("input") ||
        alvo.closest("textarea") ||
        alvo.closest("select") ||
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
      ultimoX.current = e.touches[0].clientX;
      ultimoY.current = e.touches[0].clientY;
      tempoInicio.current = Date.now();
    };

    const lidarTouchMove = (e: TouchEvent) => {
      if (toqueInicioX.current === null) return;
      ultimoX.current = e.touches[0].clientX;
      ultimoY.current = e.touches[0].clientY;
    };

    const processarGesto = () => {
      if (toqueInicioX.current === null || ultimoX.current === null) return;

      const deltaX = ultimoX.current - toqueInicioX.current;
      const deltaY = (ultimoY.current ?? 0) - (toqueInicioY.current ?? 0);
      const duracao = Date.now() - tempoInicio.current;

      toqueInicioX.current = null;
      toqueInicioY.current = null;
      ultimoX.current = null;
      ultimoY.current = null;

      // Limites generosos e confortáveis para o polegar no mobile
      if (duracao > 850 || Math.abs(deltaX) < 35) return;

      // O gesto deve ser mais horizontal que vertical
      if (Math.abs(deltaX) < Math.abs(deltaY) * 0.8) return;

      // Lógica de avanço e retorno na esteira de telas:
      if (indiceAtual === 0) {
        // Na Tela Inicial: qualquer swipe horizontal nítido avança para Tarefas
        navegar(ESTEIRA[1]);
      } else if (indiceAtual === ESTEIRA.length - 1) {
        // Em Metas (PDI): qualquer swipe horizontal nítido volta para Notas
        navegar(ESTEIRA[ESTEIRA.length - 2]);
      } else {
        // Nas telas intermediárias (Tarefas e Notas):
        // Arrastar para a esquerda (deltaX < 0) = Avança para a próxima tela
        // Arrastar para a direita (deltaX > 0) = Volta para a tela anterior
        if (deltaX < -35 && indiceAtual < ESTEIRA.length - 1) {
          navegar(ESTEIRA[indiceAtual + 1]);
        } else if (deltaX > 35 && indiceAtual > 0) {
          navegar(ESTEIRA[indiceAtual - 1]);
        }
      }
    };

    const lidarTouchEnd = () => {
      processarGesto();
    };

    const lidarTouchCancel = () => {
      processarGesto();
    };

    window.addEventListener("touchstart", lidarTouchStart, { passive: true });
    window.addEventListener("touchmove", lidarTouchMove, { passive: true });
    window.addEventListener("touchend", lidarTouchEnd, { passive: true });
    window.addEventListener("touchcancel", lidarTouchCancel, { passive: true });

    return () => {
      window.removeEventListener("touchstart", lidarTouchStart);
      window.removeEventListener("touchmove", lidarTouchMove);
      window.removeEventListener("touchend", lidarTouchEnd);
      window.removeEventListener("touchcancel", lidarTouchCancel);
    };
  }, [habilitado, location.pathname, navegar]);
}
