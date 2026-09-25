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

  // Coordenadas para Touch (celular / tablet)
  const toqueInicioX = useRef<number | null>(null);
  const toqueInicioY = useRef<number | null>(null);
  const ultimoX = useRef<number | null>(null);
  const ultimoY = useRef<number | null>(null);
  const tempoInicio = useRef<number>(0);

  // Coordenadas para Mouse Drag no desktop
  const mouseArrastando = useRef(false);
  const mouseInicioX = useRef<number | null>(null);
  const mouseInicioY = useRef<number | null>(null);

  // Debounce para Trackpad (Wheel no Mac)
  const ultimoWheelEm = useRef<number>(0);

  useEffect(() => {
    if (!habilitado) return;

    // Normaliza rota atual
    let rotaBase = location.pathname;
    if (rotaBase === "/") rotaBase = "/home";

    // Encontra índice na esteira
    const indiceAtual = ESTEIRA.findIndex((r) => rotaBase.startsWith(r));
    if (indiceAtual === -1) return;

    const navegarNaEsteira = (direcao: "proximo" | "anterior") => {
      if (indiceAtual === 0) {
        // Na Tela Inicial: qualquer swipe horizontal leva para Tarefas
        navegar("/tarefas");
      } else if (indiceAtual === 1) {
        // Em Tarefas: anterior vai para Home, próximo vai para Notas
        if (direcao === "anterior") navegar("/home");
        else navegar("/notas");
      } else if (indiceAtual === 2) {
        // Em Notas: anterior vai para Tarefas, próximo vai para PDI (Metas)
        if (direcao === "anterior") navegar("/tarefas");
        else navegar("/pdi");
      } else if (indiceAtual === 3) {
        // Em Metas (PDI): qualquer swipe volta para Notas
        navegar("/notas");
      }
    };

    // ==========================================
    // 1. TOUCH (Celular Android / iOS)
    // ==========================================
    const lidarTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;

      const alvo = e.target as HTMLElement | null;
      if (!alvo) return;

      // Não intercepta se o toque começou em inputs, sliders ou elementos com scroll horizontal interno
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

    const lidarTouchEnd = () => {
      if (toqueInicioX.current === null || ultimoX.current === null) return;

      const deltaX = ultimoX.current - toqueInicioX.current;
      const deltaY = (ultimoY.current ?? 0) - (toqueInicioY.current ?? 0);
      const duracao = Date.now() - tempoInicio.current;

      toqueInicioX.current = null;
      toqueInicioY.current = null;
      ultimoX.current = null;
      ultimoY.current = null;

      // Se foi muito lento (> 900ms) ou muito curto (< 30px), descarta
      if (duracao > 900 || Math.abs(deltaX) < 30) return;

      // O gesto deve ser mais horizontal que vertical
      if (Math.abs(deltaX) < Math.abs(deltaY) * 0.7) return;

      // Transição orientada ao gesto do usuário:
      // deltaX > 0: arrastou da esquerda para a direita
      // deltaX < 0: arrastou da direita para a esquerda
      if (indiceAtual === 0) {
        navegar("/tarefas");
      } else if (indiceAtual === 1) {
        // Em Tarefas:
        // Arrastar para a esquerda (deltaX < 0) volta para Home
        // Arrastar para a direita (deltaX > 0) avança para Notas
        if (deltaX < 0) navegar("/home");
        else navegar("/notas");
      } else if (indiceAtual === 2) {
        // Em Notas:
        // Arrastar para a esquerda (deltaX < 0) avança para Metas (PDI)
        // Arrastar para a direita (deltaX > 0) volta para Tarefas
        if (deltaX < 0) navegar("/pdi");
        else navegar("/tarefas");
      } else if (indiceAtual === 3) {
        navegar("/notas");
      }
    };

    // ==========================================
    // 2. TRACKPAD DO MAC (Gesto de 2 dedos / Wheel horizontal)
    // ==========================================
    const lidarWheel = (e: WheelEvent) => {
      // Ignora se estiver num container rolável horizontal
      const alvo = e.target as HTMLElement | null;
      if (alvo?.closest(".overflow-x-auto") || alvo?.closest("canvas")) return;

      // Apenas gestos horizontais expressivos (dois dedos no trackpad)
      if (Math.abs(e.deltaX) > 40 && Math.abs(e.deltaX) > Math.abs(e.deltaY) * 1.5) {
        const agora = Date.now();
        if (agora - ultimoWheelEm.current < 650) return; // Debounce de 650ms
        ultimoWheelEm.current = agora;

        if (e.deltaX > 0) {
          // Trackpad arrastou para a direita
          navegarNaEsteira("proximo");
        } else {
          // Trackpad arrastou para a esquerda
          navegarNaEsteira("anterior");
        }
      }
    };

    // ==========================================
    // 3. MOUSE DRAG (Para testes rápidos no Desktop)
    // ==========================================
    const lidarMouseDown = (e: MouseEvent) => {
      // Apenas botão principal
      if (e.button !== 0) return;
      const alvo = e.target as HTMLElement | null;
      if (!alvo) return;
      if (
        alvo.closest("input") ||
        alvo.closest("textarea") ||
        alvo.closest("button") ||
        alvo.closest("a") ||
        alvo.closest("canvas") ||
        alvo.closest(".overflow-x-auto")
      ) {
        return;
      }
      mouseArrastando.current = true;
      mouseInicioX.current = e.clientX;
      mouseInicioY.current = e.clientY;
    };

    const lidarMouseUp = (e: MouseEvent) => {
      if (!mouseArrastando.current || mouseInicioX.current === null) return;
      const deltaX = e.clientX - mouseInicioX.current;
      const deltaY = e.clientY - (mouseInicioY.current ?? 0);
      mouseArrastando.current = false;
      mouseInicioX.current = null;
      mouseInicioY.current = null;

      if (Math.abs(deltaX) > 55 && Math.abs(deltaX) > Math.abs(deltaY) * 1.2) {
        if (deltaX > 0) {
          navegarNaEsteira("proximo");
        } else {
          navegarNaEsteira("anterior");
        }
      }
    };

    // Registra listeners globais
    window.addEventListener("touchstart", lidarTouchStart, { passive: true });
    window.addEventListener("touchmove", lidarTouchMove, { passive: true });
    window.addEventListener("touchend", lidarTouchEnd, { passive: true });
    window.addEventListener("touchcancel", lidarTouchEnd, { passive: true });
    window.addEventListener("wheel", lidarWheel, { passive: true });
    window.addEventListener("mousedown", lidarMouseDown, { passive: true });
    window.addEventListener("mouseup", lidarMouseUp, { passive: true });

    return () => {
      window.removeEventListener("touchstart", lidarTouchStart);
      window.removeEventListener("touchmove", lidarTouchMove);
      window.removeEventListener("touchend", lidarTouchEnd);
      window.removeEventListener("touchcancel", lidarTouchEnd);
      window.removeEventListener("wheel", lidarWheel);
      window.removeEventListener("mousedown", lidarMouseDown);
      window.removeEventListener("mouseup", lidarMouseUp);
    };
  }, [habilitado, location.pathname, navegar]);
}
