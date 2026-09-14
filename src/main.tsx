import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

import { aplicarTema, lerTemaSalvo, inicializarPersonalizacaoGlobal } from "@/lib/tema";
import { registrarServiceWorker } from "@/lib/pwa";

// Aplica o tema, variação de escuro, paleta e escala de fonte antes da primeira pintura
aplicarTema(lerTemaSalvo());
inicializarPersonalizacaoGlobal();

// Registra o Service Worker do PWA para suporte offline completo
registrarServiceWorker();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
