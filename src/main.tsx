import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

import { aplicarTema, lerTemaSalvo } from "@/lib/tema";
import { registrarServiceWorker } from "@/lib/pwa";

// Aplica o tema antes da primeira pintura para não piscar branco no modo escuro.
aplicarTema(lerTemaSalvo());

// Registra o Service Worker do PWA para suporte offline completo
registrarServiceWorker();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
