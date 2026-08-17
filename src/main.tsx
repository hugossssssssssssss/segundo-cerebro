import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

import { aplicarTema, lerTemaSalvo } from "@/lib/tema";

// Aplica o tema antes da primeira pintura para não piscar branco no modo escuro.
aplicarTema(lerTemaSalvo());

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
