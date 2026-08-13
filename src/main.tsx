import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Aplica o tema antes da primeira pintura para não piscar branco no modo escuro.
// Sem preferência salva, segue o sistema.
const temaSalvo = localStorage.getItem("tema");
const escuro =
  temaSalvo === "escuro" ||
  (!temaSalvo && matchMedia("(prefers-color-scheme: dark)").matches);
if (escuro) document.documentElement.classList.add("dark");

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
