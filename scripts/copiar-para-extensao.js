import fs from "fs";
import path from "path";

function copiarPasta(origem, destino) {
  if (!fs.existsSync(origem)) return;
  if (!fs.existsSync(destino)) {
    fs.mkdirSync(destino, { recursive: true });
  }

  const itens = fs.readdirSync(origem, { withFileTypes: true });

  for (const item of itens) {
    const origemItem = path.join(origem, item.name);
    const destinoItem = path.join(destino, item.name);

    if (item.isDirectory()) {
      copiarPasta(origemItem, destinoItem);
    } else {
      fs.copyFileSync(origemItem, destinoItem);
    }
  }
}

const distOrigem = path.resolve("dist");
const distDestino = path.resolve("extensao/dist");

console.log("Copiando build do Klaus para extensao/dist...");
copiarPasta(distOrigem, distDestino);
console.log("Cópia concluída com sucesso!");
