/**
 * Klaus Package & Manifest Validator
 *
 * Utilitários para validação de manifestos e empacotamento de extensões (.klaus-ext.json).
 * Funciona de forma isomórfica no navegador e em scripts Node.js.
 */

import type { KlausAppManifest } from "./klaus.types";

export const KLAUS_PACKAGE_FORMAT = "klaus-extension-v1" as const;

export interface KlausExtensionBundle {
  format: typeof KLAUS_PACKAGE_FORMAT;
  manifest: KlausAppManifest;
  files: Record<string, string>;
  createdAt: string;
  checksum?: string;
}

const CATEGORIAS_VALIDAS: Set<string> = new Set([
  "design",
  "productivity",
  "ai",
  "utilities",
  "personal",
  "produtividade",
  "ia",
  "utilitarios",
  "pessoal",
]);

const PERMISSOES_VALIDAS: Set<string> = new Set([
  "theme",
  "events",
  "storage",
  "github",
  "ui",
]);

/**
 * Valida os campos obrigatórios e conformidade de um manifesto de projeto/extensão Klaus.
 */
export function validateKlausManifest(manifest: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!manifest || typeof manifest !== "object") {
    return { valid: false, errors: ["O manifesto deve ser um objeto JSON válido."] };
  }

  // 1. Identificador
  if (!manifest.id || typeof manifest.id !== "string") {
    errors.push("Campo obrigatório 'id' ausente ou inválido.");
  } else if (!/^[a-z0-9_-]+$/i.test(manifest.id)) {
    errors.push("Campo 'id' deve conter apenas letras, números, sublinhados ou hífens.");
  }

  // 2. Nome
  if (!manifest.name || typeof manifest.name !== "string" || manifest.name.trim().length === 0) {
    errors.push("Campo obrigatório 'name' ausente ou vazio.");
  }

  // 3. Versão
  if (!manifest.version || typeof manifest.version !== "string") {
    errors.push("Campo obrigatório 'version' ausente ou inválido (ex: '1.0.0').");
  }

  // 4. Arquivo de entrada
  if (!manifest.entry || typeof manifest.entry !== "string") {
    errors.push("Campo obrigatório 'entry' ausente (ex: 'index.html' ou 'view.md').");
  }

  // 5. Categoria (se informada)
  if (manifest.category && !CATEGORIAS_VALIDAS.has(manifest.category)) {
    errors.push(`Categoria desconhecida: "${manifest.category}". Categorias permitidas: ${Array.from(CATEGORIAS_VALIDAS).join(", ")}`);
  }

  // 6. Permissões
  if (manifest.permissions) {
    if (!Array.isArray(manifest.permissions)) {
      errors.push("Campo 'permissions' deve ser um array de strings.");
    } else {
      for (const perm of manifest.permissions) {
        if (!PERMISSOES_VALIDAS.has(perm)) {
          errors.push(`Permissão desconhecida: "${perm}". Permissões permitidas: ${Array.from(PERMISSOES_VALIDAS).join(", ")}`);
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Empacota uma extensão e seus arquivos num pacote .klaus-ext.json autocontido.
 */
export function packKlausExtension(
  manifest: KlausAppManifest,
  files: Record<string, string>,
): KlausExtensionBundle {
  const validacao = validateKlausManifest(manifest);
  if (!validacao.valid) {
    throw new Error(`Manifesto inválido:\n- ${validacao.errors.join("\n- ")}`);
  }

  const entry = manifest.entry || "index.html";
  if (!files[entry]) {
    throw new Error(`Arquivo de entrada '${entry}' declarado no manifesto não foi fornecido no pacote.`);
  }

  return {
    format: KLAUS_PACKAGE_FORMAT,
    manifest,
    files,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Desempacota e valida um pacote Klaus Extension a partir de string ou objeto.
 */
export function unpackKlausExtension(
  bundleInput: string | KlausExtensionBundle,
): { manifest: KlausAppManifest; files: Record<string, string> } {
  let bundle: KlausExtensionBundle;

  if (typeof bundleInput === "string") {
    try {
      bundle = JSON.parse(bundleInput);
    } catch {
      throw new Error("Conteúdo fornecido não é um JSON válido.");
    }
  } else {
    bundle = bundleInput;
  }

  if (!bundle || typeof bundle !== "object") {
    throw new Error("Pacote inválido: formato corrompido.");
  }

  if (bundle.format !== KLAUS_PACKAGE_FORMAT) {
    throw new Error(`Formato de pacote incompatível. Esperado: '${KLAUS_PACKAGE_FORMAT}', recebido: '${(bundle as any).format}'.`);
  }

  const validacao = validateKlausManifest(bundle.manifest);
  if (!validacao.valid) {
    throw new Error(`Manifesto do pacote é inválido:\n- ${validacao.errors.join("\n- ")}`);
  }

  if (!bundle.files || typeof bundle.files !== "object") {
    throw new Error("Pacote não contém arquivos.");
  }

  const entry = bundle.manifest.entry || "index.html";
  if (!bundle.files[entry]) {
    throw new Error(`Arquivo de entrada '${entry}' declarado no manifesto não existe no pacote.`);
  }

  return {
    manifest: bundle.manifest,
    files: bundle.files,
  };
}
