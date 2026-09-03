import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import "@/index.css";
import HeaderHUD from "@/pages/HeaderHUD";
import { TooltipProvider } from "@/components/ui/tooltip";

declare const chrome: any;

// Sincroniza dados do chrome.storage para o localStorage local do iframe
try {
  if (typeof chrome !== "undefined" && chrome?.storage?.local) {
    chrome.storage.local.get(["klaus_settings", "klaus_favoritos", "klaus_tema_v1"], (res: any) => {
      if (res?.klaus_settings) {
        localStorage.setItem("klaus_settings", res.klaus_settings);
      }
      if (res?.klaus_favoritos) {
        localStorage.setItem("klaus_favoritos", JSON.stringify(res.klaus_favoritos));
      }
      if (res?.klaus_tema_v1) {
        localStorage.setItem("klaus_tema_v1", res.klaus_tema_v1);
        if (res.klaus_tema_v1 === "light") {
          document.documentElement.classList.remove("dark");
        } else {
          document.documentElement.classList.add("dark");
        }
      }
      // Notifica componentes
      window.dispatchEvent(new Event("storage"));
      window.dispatchEvent(new CustomEvent("klaus-favoritos-atualizados", { detail: res?.klaus_favoritos || [] }));
    });
  }
} catch {}

const container = document.getElementById("root");
if (container) {
  const root = createRoot(container);
  root.render(
    <MemoryRouter>
      <TooltipProvider>
        <HeaderHUD />
      </TooltipProvider>
    </MemoryRouter>
  );
}
