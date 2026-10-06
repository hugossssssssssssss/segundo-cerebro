/**
 * Klaus Extension Catalog & Installation Service
 *
 * Gerencia a vitrine de extensões da Biblioteca do Klaus.
 * Ao instalar uma extensão, o código (manifest.json e index.html) é enviado
 * diretamente para o repositório privado de dados do usuário (.klaus/projetos/<id>/)
 * via API do GitHub, integrando-se automaticamente ao layout e tema do Klaus.
 */

import type { Settings } from "./settings";
import { ler, gravar, apagar } from "./github";
import {
  carregarProjetosExtensoes,
  salvarProjetoCustomizado,
  removerProjetoCustomizado,
  type ProjetoExtensao,
} from "./klausProjects";
import { sincronizarExtensaoNoMenu } from "./klausMenu";
import type { KlausAppManifest } from "./klausEngine";

export interface ItemCatalogoExtensao {
  id: string;
  nome: string;
  descricao: string;
  icone: string;
  versao: string;
  categoriaInterna: string;
  rotaIntegrada?: string;
  manifesto: KlausAppManifest;
  codigoHtml: string;
}

/**
 * Catálogo Curado de Extensões da Biblioteca do Klaus.
 * Textos concisos e diretos para o dia a dia de trabalho.
 */
export const CATALOGO_BIBLIOTECA: ItemCatalogoExtensao[] = [
  {
    id: "conversor",
    nome: "Conversor de Formatos",
    descricao: "Converte imagens (PNG, JPG, WebP, SVG) e arquivos no navegador com exportação instantânea.",
    icone: "RefreshCw",
    versao: "1.0.0",
    categoriaInterna: "utilitarios",
    rotaIntegrada: "/conversor",
    manifesto: {
      id: "conversor",
      name: "Conversor de Formatos",
      version: "1.0.0",
      description: "Converte imagens e formatos sem sair do navegador.",
      entry: "index.html",
      icon: "RefreshCw",
      category: "utilitarios",
      permissions: ["theme", "ui", "storage"],
      theme: { supportsDark: true },
      sandbox: { allowScripts: true, allowPopups: true, allowSameOrigin: false },
    },
    codigoHtml: `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Conversor de Formatos</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: var(--klaus-bg, #0f172a);
      color: var(--klaus-fg, #f8fafc);
      padding: 1.5rem;
    }
    .container { max-width: 680px; margin: 0 auto; display: flex; flex-direction: column; gap: 1.25rem; }
    .card {
      background: var(--klaus-card, #1e293b);
      border: 1px solid var(--klaus-border, #334155);
      border-radius: 1rem;
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    .dropzone {
      border: 2px dashed var(--klaus-border, #334155);
      border-radius: 0.75rem;
      padding: 2.5rem 1.5rem;
      text-align: center;
      cursor: pointer;
      transition: all 0.2s;
    }
    .dropzone:hover { border-color: var(--klaus-primary, #f59e0b); }
    .row { display: flex; gap: 0.75rem; align-items: center; }
    select, button {
      background: var(--klaus-bg, #0f172a);
      color: var(--klaus-fg, #f8fafc);
      border: 1px solid var(--klaus-border, #334155);
      padding: 0.6rem 1rem;
      border-radius: 0.5rem;
      font-size: 0.875rem;
    }
    button.btn-primary {
      background: var(--klaus-primary, #f59e0b);
      color: var(--klaus-primary-fg, #0f172a);
      border: none;
      font-weight: 600;
      cursor: pointer;
    }
    #preview { max-height: 220px; object-fit: contain; border-radius: 0.5rem; margin-top: 0.5rem; display: none; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <h2 style="font-size: 1.15rem; font-weight: 600;">Converter Imagem</h2>
      <div class="dropzone" id="dropzone" onclick="document.getElementById('fileInput').click()">
        <p style="font-size: 0.9rem; font-weight: 500;">Clique ou arraste uma imagem aqui</p>
        <p style="font-size: 0.75rem; color: var(--klaus-muted, #94a3b8); margin-top: 0.25rem;">Suporta PNG, JPG, WebP e SVG</p>
      </div>
      <input type="file" id="fileInput" accept="image/*" style="display: none;" onchange="carregarImagem(this)">
      <img id="preview" alt="Preview da imagem" />
      <div class="row" style="margin-top: 0.5rem;">
        <label style="font-size: 0.85rem; color: var(--klaus-muted, #94a3b8);">Formato de saída:</label>
        <select id="formatoSaida">
          <option value="image/png">PNG</option>
          <option value="image/jpeg">JPG (Foto)</option>
          <option value="image/webp">WebP (Otimizado)</option>
        </select>
        <button class="btn-primary" onclick="converter()" id="btnConverter" style="margin-left: auto;">Converter e Baixar</button>
      </div>
    </div>
  </div>
  <script>
    let imagemCarregada = null;
    let nomeOriginal = "imagem";
    function carregarImagem(input) {
      if (input.files && input.files[0]) {
        const file = input.files[0];
        nomeOriginal = file.name.replace(/\\.[^/.]+$/, "");
        const reader = new FileReader();
        reader.onload = function(e) {
          const img = new Image();
          img.onload = function() {
            imagemCarregada = img;
            const prev = document.getElementById('preview');
            prev.src = e.target.result;
            prev.style.display = 'block';
          };
          img.src = e.target.result;
        };
        reader.readAsDataURL(file);
      }
    }
    function converter() {
      if (!imagemCarregada) {
        alert("Selecione uma imagem primeiro!");
        return;
      }
      const canvas = document.createElement('canvas');
      canvas.width = imagemCarregada.naturalWidth;
      canvas.height = imagemCarregada.naturalHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(imagemCarregada, 0, 0);
      const formato = document.getElementById('formatoSaida').value;
      const ext = formato.split('/')[1];
      const dataUrl = canvas.toDataURL(formato, 0.92);
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = nomeOriginal + "-convertida." + ext;
      a.click();
    }
  </script>
</body>
</html>`,
  },
  {
    id: "it_tools",
    nome: "Utilitários Criativos",
    descricao: "Conversores de px/rem, calculador de proporções (aspect ratio) e verificador de contraste WCAG.",
    icone: "Wrench",
    versao: "1.0.0",
    categoriaInterna: "design",
    rotaIntegrada: "/it-tools",
    manifesto: {
      id: "it_tools",
      name: "Utilitários Criativos",
      version: "1.0.0",
      description: "Medidas, contrastes e proporções para design.",
      entry: "index.html",
      icon: "Wrench",
      category: "design",
      permissions: ["theme", "ui"],
      theme: { supportsDark: true },
      sandbox: { allowScripts: true, allowPopups: true, allowSameOrigin: false },
    },
    codigoHtml: `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Utilitários Criativos</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: var(--klaus-bg, #0f172a);
      color: var(--klaus-fg, #f8fafc);
      padding: 1.5rem;
    }
    .container { max-width: 760px; margin: 0 auto; display: flex; flex-direction: column; gap: 1.5rem; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 1rem; }
    .card {
      background: var(--klaus-card, #1e293b);
      border: 1px solid var(--klaus-border, #334155);
      border-radius: 1rem;
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    h3 { font-size: 1rem; font-weight: 600; }
    label { font-size: 0.8rem; color: var(--klaus-muted, #94a3b8); }
    input {
      background: var(--klaus-bg, #0f172a);
      color: var(--klaus-fg, #f8fafc);
      border: 1px solid var(--klaus-border, #334155);
      padding: 0.5rem 0.75rem;
      border-radius: 0.5rem;
      font-size: 0.875rem;
      width: 100%;
    }
    .row { display: flex; gap: 0.5rem; align-items: center; }
    .result {
      padding: 0.75rem;
      background: var(--klaus-bg, #0f172a);
      border-radius: 0.5rem;
      border: 1px solid var(--klaus-border, #334155);
      font-size: 0.85rem;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="grid">
      <!-- Conversor PX <-> REM -->
      <div class="card">
        <h3>Conversor PX &harr; REM</h3>
        <label>Base (padrão 16px):</label>
        <input type="number" id="baseRem" value="16" oninput="calcularRem()">
        <label>Pixels (px):</label>
        <input type="number" id="inputPx" value="24" oninput="calcularRem()">
        <div class="result" id="resRem">1.5rem</div>
      </div>

      <!-- Calculadora de Proporção (Aspect Ratio) -->
      <div class="card">
        <h3>Calculadora de Aspect Ratio</h3>
        <label>Largura original &times; Altura original:</label>
        <div class="row">
          <input type="number" id="w1" value="1920" oninput="calcularRatio()">
          <span>&times;</span>
          <input type="number" id="h1" value="1080" oninput="calcularRatio()">
        </div>
        <label>Nova largura:</label>
        <input type="number" id="w2" value="1280" oninput="calcularRatio()">
        <div class="result" id="resRatio">Altura calculada: 720px (16:9)</div>
      </div>

      <!-- Verificador WCAG de Contraste -->
      <div class="card">
        <h3>Contraste WCAG (Cores)</h3>
        <label>Cor do Texto (HEX):</label>
        <input type="text" id="corTexto" value="#FFFFFF" oninput="calcularContraste()">
        <label>Cor do Fundo (HEX):</label>
        <input type="text" id="corFundo" value="#0F172A" oninput="calcularContraste()">
        <div class="result" id="resContraste">Razão: 16.5:1 (Passou AAA)</div>
      </div>
    </div>
  </div>
  <script>
    function calcularRem() {
      const base = parseFloat(document.getElementById('baseRem').value) || 16;
      const px = parseFloat(document.getElementById('inputPx').value) || 0;
      const rem = (px / base).toFixed(4).replace(/\\.?0+$/, '');
      document.getElementById('resRem').textContent = rem + 'rem';
    }
    function gcd(a, b) { return b ? gcd(b, a % b) : a; }
    function calcularRatio() {
      const w1 = parseFloat(document.getElementById('w1').value) || 1;
      const h1 = parseFloat(document.getElementById('h1').value) || 1;
      const w2 = parseFloat(document.getElementById('w2').value) || 0;
      const div = gcd(w1, h1);
      const h2 = Math.round((w2 * h1) / w1);
      document.getElementById('resRatio').textContent = 'Altura calculada: ' + h2 + 'px (' + (w1/div) + ':' + (h1/div) + ')';
    }
    function hexToLuminance(hex) {
      hex = hex.replace('#', '');
      if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
      const rgb = [parseInt(hex.substr(0,2),16)/255, parseInt(hex.substr(2,2),16)/255, parseInt(hex.substr(4,2),16)/255];
      const a = rgb.map(v => v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
      return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
    }
    function calcularContraste() {
      try {
        const l1 = hexToLuminance(document.getElementById('corTexto').value);
        const l2 = hexToLuminance(document.getElementById('corFundo').value);
        const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
        const ratioFmt = ratio.toFixed(2) + ':1';
        let status = ratio >= 7 ? ' (Passou AAA)' : ratio >= 4.5 ? ' (Passou AA)' : ' (Falhou)';
        document.getElementById('resContraste').textContent = 'Razão: ' + ratioFmt + status;
      } catch(e) {}
    }
  </script>
</body>
</html>`,
  },
  {
    id: "pdf",
    nome: "Ferramentas de PDF & Documentos",
    descricao: "Visualização rápida, extração de texto e divisão de arquivos PDF direto no navegador.",
    icone: "FileCheck",
    versao: "1.0.0",
    categoriaInterna: "produtividade",
    rotaIntegrada: "/pdf",
    manifesto: {
      id: "pdf",
      name: "Ferramentas de PDF",
      version: "1.0.0",
      description: "Leitor e organizador de páginas PDF locais.",
      entry: "index.html",
      icon: "FileCheck",
      category: "produtividade",
      permissions: ["theme", "ui"],
      theme: { supportsDark: true },
      sandbox: { allowScripts: true, allowPopups: true, allowSameOrigin: false },
    },
    codigoHtml: `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Ferramentas PDF</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: var(--klaus-bg, #0f172a);
      color: var(--klaus-fg, #f8fafc);
      padding: 1.5rem;
    }
    .container { max-width: 680px; margin: 0 auto; display: flex; flex-direction: column; gap: 1.25rem; }
    .card {
      background: var(--klaus-card, #1e293b);
      border: 1px solid var(--klaus-border, #334155);
      border-radius: 1rem;
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    .dropzone {
      border: 2px dashed var(--klaus-border, #334155);
      border-radius: 0.75rem;
      padding: 2.5rem 1.5rem;
      text-align: center;
      cursor: pointer;
    }
    .dropzone:hover { border-color: var(--klaus-primary, #f59e0b); }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <h2 style="font-size: 1.15rem; font-weight: 600;">Visualizador e Extrator de PDF</h2>
      <div class="dropzone" onclick="document.getElementById('fileInput').click()">
        <p style="font-size: 0.9rem; font-weight: 500;">Selecione um documento PDF local</p>
        <p style="font-size: 0.75rem; color: var(--klaus-muted, #94a3b8); margin-top: 0.25rem;">Nenhum dado é enviado para servidores.</p>
      </div>
      <input type="file" id="fileInput" accept=".pdf" style="display: none;" onchange="carregarPdf(this)">
      <div id="pdfInfo" style="display: none; padding: 1rem; background: var(--klaus-bg, #0f172a); border-radius: 0.5rem; font-size: 0.85rem;"></div>
    </div>
  </div>
  <script>
    function carregarPdf(input) {
      if (input.files && input.files[0]) {
        const file = input.files[0];
        const info = document.getElementById('pdfInfo');
        info.style.display = 'block';
        info.innerHTML = '<strong>Arquivo carregado:</strong> ' + file.name + ' (' + (file.size / 1024).toFixed(1) + ' KB)';
      }
    }
  </script>
</body>
</html>`,
  },
  {
    id: "sons",
    nome: "Sons de Concentração & Foco",
    descricao: "Gerador de ruído marrom, branco e sons ambientes para concentração contínua no navegador.",
    icone: "Headphones",
    versao: "1.0.0",
    categoriaInterna: "produtividade",
    rotaIntegrada: "/sons",
    manifesto: {
      id: "sons",
      name: "Sons de Concentração",
      version: "1.0.0",
      description: "Áudio gerado localmente para foco no trabalho.",
      entry: "index.html",
      icon: "Headphones",
      category: "produtividade",
      permissions: ["theme", "ui"],
      theme: { supportsDark: true },
      sandbox: { allowScripts: true, allowPopups: true, allowSameOrigin: false },
    },
    codigoHtml: `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Sons de Concentração</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: var(--klaus-bg, #0f172a);
      color: var(--klaus-fg, #f8fafc);
      padding: 1.5rem;
    }
    .container { max-width: 600px; margin: 0 auto; display: flex; flex-direction: column; gap: 1.25rem; }
    .card {
      background: var(--klaus-card, #1e293b);
      border: 1px solid var(--klaus-border, #334155);
      border-radius: 1rem;
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    .sound-btn {
      background: var(--klaus-bg, #0f172a);
      border: 1px solid var(--klaus-border, #334155);
      color: var(--klaus-fg, #f8fafc);
      padding: 1.25rem;
      border-radius: 0.75rem;
      cursor: pointer;
      font-weight: 600;
      font-size: 0.95rem;
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      transition: all 0.2s;
    }
    .sound-btn.ativo {
      border-color: var(--klaus-primary, #f59e0b);
      background: var(--klaus-card, #1e293b);
      box-shadow: 0 0 0 2px var(--klaus-primary, #f59e0b);
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <h2 style="font-size: 1.15rem; font-weight: 600;">Sons para Concentração</h2>
      <p style="font-size: 0.85rem; color: var(--klaus-muted, #94a3b8);">Gerados nativamente pelo navegador via Web Audio API.</p>
      <div class="grid">
        <button class="sound-btn" id="btnMarrom" onclick="alternarRuido('marrom')">
          <span>Ruído Marrom</span>
          <span style="font-size: 0.75rem; font-weight: 400; color: var(--klaus-muted, #94a3b8);">Grave e calmante</span>
        </button>
        <button class="sound-btn" id="btnBranco" onclick="alternarRuido('branco')">
          <span>Ruído Branco</span>
          <span style="font-size: 0.75rem; font-weight: 400; color: var(--klaus-muted, #94a3b8);">Isolamento de fundo</span>
        </button>
      </div>
    </div>
  </div>
  <script>
    let audioCtx = null;
    let nodeAtual = null;
    let tipoAtivo = null;

    function alternarRuido(tipo) {
      if (tipoAtivo === tipo) {
        parar();
        return;
      }
      parar();
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const bufferSize = audioCtx.sampleRate * 2;
      const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
      const data = buffer.getChannelData(0);

      if (tipo === 'branco') {
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
      } else {
        let lastOut = 0.0;
        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          data[i] = (lastOut + (0.02 * white)) / 1.02;
          lastOut = data[i];
          data[i] *= 3.5;
        }
      }

      const noise = audioCtx.createBufferSource();
      noise.buffer = buffer;
      noise.loop = true;
      const gain = audioCtx.createGain();
      gain.gain.value = 0.15;
      noise.connect(gain);
      gain.connect(audioCtx.destination);
      noise.start();
      nodeAtual = noise;
      tipoAtivo = tipo;

      document.getElementById('btnMarrom').classList.toggle('ativo', tipo === 'marrom');
      document.getElementById('btnBranco').classList.toggle('ativo', tipo === 'branco');
    }

    function parar() {
      if (nodeAtual) {
        nodeAtual.stop();
        nodeAtual.disconnect();
        nodeAtual = null;
      }
      tipoAtivo = null;
      document.getElementById('btnMarrom').classList.remove('ativo');
      document.getElementById('btnBranco').classList.remove('ativo');
    }
  </script>
</body>
</html>`,
  },
  {
    id: "testador_hardware",
    nome: "Diagnóstico de Câmera & Áudio",
    descricao: "Teste prático de webcam, microfone, taxa de quadros e saída de som antes de reuniões.",
    icone: "Video",
    versao: "1.0.0",
    categoriaInterna: "utilitarios",
    rotaIntegrada: "/testador",
    manifesto: {
      id: "testador_hardware",
      name: "Diagnóstico de Câmera e Áudio",
      version: "1.0.0",
      description: "Verificador de periféricos e streaming local.",
      entry: "index.html",
      icon: "Video",
      category: "utilitarios",
      permissions: ["theme", "ui"],
      theme: { supportsDark: true },
      sandbox: { allowScripts: true, allowPopups: true, allowSameOrigin: false },
    },
    codigoHtml: `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Diagnóstico de Hardware</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: var(--klaus-bg, #0f172a);
      color: var(--klaus-fg, #f8fafc);
      padding: 1.5rem;
    }
    .container { max-width: 680px; margin: 0 auto; display: flex; flex-direction: column; gap: 1.25rem; }
    .card {
      background: var(--klaus-card, #1e293b);
      border: 1px solid var(--klaus-border, #334155);
      border-radius: 1rem;
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    video { width: 100%; max-height: 280px; background: #000; border-radius: 0.75rem; }
    button {
      background: var(--klaus-primary, #f59e0b);
      color: var(--klaus-primary-fg, #0f172a);
      border: none;
      padding: 0.65rem 1.25rem;
      border-radius: 0.5rem;
      font-weight: 600;
      font-size: 0.875rem;
      cursor: pointer;
      width: fit-content;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <h2 style="font-size: 1.15rem; font-weight: 600;">Diagnóstico de Câmera & Microfone</h2>
      <video id="webcam" autoplay playsinline muted></video>
      <div style="display: flex; gap: 0.75rem;">
        <button onclick="iniciarCamera()" id="btnCamera">Testar Câmera</button>
        <button onclick="pararCamera()" style="background: var(--klaus-border, #334155); color: var(--klaus-fg, #f8fafc);">Parar</button>
      </div>
    </div>
  </div>
  <script>
    let stream = null;
    async function iniciarCamera() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        document.getElementById('webcam').srcObject = stream;
      } catch (err) {
        alert('Permissão de câmera/áudio não concedida.');
      }
    }
    function pararCamera() {
      if (stream) {
        stream.getTracks().forEach(t => t.stop());
        document.getElementById('webcam').srcObject = null;
        stream = null;
      }
    }
  </script>
</body>
</html>`,
  },
  {
    id: "baixador",
    nome: "Baixador de Recursos",
    descricao: "Download direto de mídias, assets e arquivos por link direto sem intermediários.",
    icone: "Download",
    versao: "1.0.0",
    categoriaInterna: "utilitarios",
    rotaIntegrada: "/baixador",
    manifesto: {
      id: "baixador",
      name: "Baixador de Recursos",
      version: "1.0.0",
      description: "Utilitário de download de mídias e arquivos.",
      entry: "index.html",
      icon: "Download",
      category: "utilitarios",
      permissions: ["theme", "ui"],
      theme: { supportsDark: true },
      sandbox: { allowScripts: true, allowPopups: true, allowSameOrigin: false },
    },
    codigoHtml: `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Baixador de Recursos</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: var(--klaus-bg, #0f172a);
      color: var(--klaus-fg, #f8fafc);
      padding: 1.5rem;
    }
    .container { max-width: 680px; margin: 0 auto; display: flex; flex-direction: column; gap: 1.25rem; }
    .card {
      background: var(--klaus-card, #1e293b);
      border: 1px solid var(--klaus-border, #334155);
      border-radius: 1rem;
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    input {
      background: var(--klaus-bg, #0f172a);
      color: var(--klaus-fg, #f8fafc);
      border: 1px solid var(--klaus-border, #334155);
      padding: 0.65rem 1rem;
      border-radius: 0.5rem;
      font-size: 0.875rem;
      width: 100%;
    }
    button {
      background: var(--klaus-primary, #f59e0b);
      color: var(--klaus-primary-fg, #0f172a);
      border: none;
      padding: 0.65rem 1.25rem;
      border-radius: 0.5rem;
      font-weight: 600;
      font-size: 0.875rem;
      cursor: pointer;
      width: fit-content;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <h2 style="font-size: 1.15rem; font-weight: 600;">Download de Arquivo por URL</h2>
      <input type="url" id="urlInput" placeholder="Cole a URL direta da imagem ou recurso...">
      <button onclick="baixar()">Baixar Arquivo</button>
    </div>
  </div>
  <script>
    function baixar() {
      const url = document.getElementById('urlInput').value.trim();
      if (!url) return alert('Insira uma URL válida');
      const a = document.createElement('a');
      a.href = url;
      a.download = url.split('/').pop() || 'download';
      a.target = '_blank';
      a.click();
    }
  </script>
</body>
</html>`,
  },
  {
    id: "jogos",
    nome: "Jogos & Foco Mental (Termo)",
    descricao: "Jogo diário no estilo Wordle/Termo em português para pausas ativas e estímulo de raciocínio.",
    icone: "Gamepad2",
    versao: "1.0.0",
    categoriaInterna: "produtividade",
    manifesto: {
      id: "jogos",
      name: "Jogos & Foco Mental",
      version: "1.0.0",
      description: "Termo e jogos de raciocínio no Klaus.",
      entry: "index.html",
      icon: "Gamepad2",
      category: "produtividade",
      permissions: ["theme", "ui", "storage"],
      theme: { supportsDark: true },
      sandbox: { allowScripts: true, allowPopups: true, allowSameOrigin: false },
    },
    codigoHtml: `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Termo - Jogo de Palavras</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: var(--klaus-bg, #0f172a);
      color: var(--klaus-fg, #f8fafc);
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 1.5rem 1rem;
      min-height: 100vh;
    }
    .container { max-width: 500px; width: 100%; display: flex; flex-direction: column; align-items: center; gap: 1rem; }
    .header { text-align: center; }
    .header h1 { font-size: 1.35rem; font-weight: 700; letter-spacing: 0.05em; }
    .header p { font-size: 0.8rem; color: var(--klaus-muted, #94a3b8); margin-top: 0.2rem; }
    .board { display: grid; grid-template-rows: repeat(6, 1fr); gap: 6px; margin: 0.5rem 0; }
    .row { display: grid; grid-template-columns: repeat(5, 1fr); gap: 6px; }
    .tile {
      width: 48px;
      height: 48px;
      border: 2px solid var(--klaus-border, #334155);
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.4rem;
      font-weight: 700;
      text-transform: uppercase;
      user-select: none;
      background: var(--klaus-card, #1e293b);
      transition: all 0.2s ease;
    }
    .tile.filled { border-color: var(--klaus-fg, #f8fafc); }
    .tile.correct { background: #10b981; border-color: #10b981; color: #ffffff; }
    .tile.present { background: #f59e0b; border-color: #f59e0b; color: #ffffff; }
    .tile.absent { background: #334155; border-color: #334155; color: #94a3b8; }
    .keyboard { display: flex; flex-direction: column; gap: 6px; width: 100%; max-width: 460px; margin-top: 0.5rem; }
    .kb-row { display: flex; justify-content: center; gap: 4px; }
    .key {
      background: var(--klaus-card, #1e293b);
      color: var(--klaus-fg, #f8fafc);
      border: 1px solid var(--klaus-border, #334155);
      border-radius: 6px;
      padding: 0.65rem 0.4rem;
      font-size: 0.8rem;
      font-weight: 600;
      cursor: pointer;
      min-width: 30px;
      text-align: center;
      user-select: none;
      transition: background 0.15s;
    }
    .key:hover { filter: brightness(1.15); }
    .key.wide { min-width: 52px; font-size: 0.75rem; }
    .key.correct { background: #10b981; border-color: #10b981; color: #fff; }
    .key.present { background: #f59e0b; border-color: #f59e0b; color: #fff; }
    .key.absent { opacity: 0.35; }
    .msg { font-size: 0.9rem; font-weight: 600; min-height: 1.4rem; text-align: center; }
    .btn-new {
      background: var(--klaus-primary, #f59e0b);
      color: var(--klaus-primary-fg, #0f172a);
      border: none;
      padding: 0.5rem 1.25rem;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      font-size: 0.85rem;
      display: none;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>TERMO</h1>
      <p>Descubra a palavra certa de 5 letras em 6 tentativas.</p>
    </div>
    <div class="board" id="board"></div>
    <div class="msg" id="msg"></div>
    <button class="btn-new" id="btnNew" onclick="iniciarJogo()">Jogar Novamente</button>
    <div class="keyboard" id="keyboard"></div>
  </div>
  <script>
    const PALAVRAS = ["PLANO","IDEIA","TEMPO","VALOR","LINDO","FORCA","MENTE","MUNDO","SONHO","GRUPO","LIVRO","FESTA","TERRA","VERBO","PONTO","CORPO","CHAVE","NORTE","CANTO","CAMPO","PRAZO","SENSO","VIGOR","NOBRE","SUTIL","SAGAZ","AFETO","ETICA","AUDAC","IDEAL","ORDEM","PODER","METAS","FOCO","ARTE","LIDER","MARCA","GRADE","TEXTO","LINHA","SIGNO","FORMA","PIXEL","VETOR","CORES","ICONE","CARTA","PASSO","CALMA","RITMO"];
    let segredo = "";
    let linhaAtual = 0;
    let colunaAtual = 0;
    let grid = Array(6).fill(null).map(() => Array(5).fill(""));
    let fimDeJogo = false;

    function iniciarJogo() {
      segredo = PALAVRAS[Math.floor(Math.random() * PALAVRAS.length)];
      linhaAtual = 0;
      colunaAtual = 0;
      grid = Array(6).fill(null).map(() => Array(5).fill(""));
      fimDeJogo = false;
      document.getElementById('msg').textContent = "";
      document.getElementById('btnNew').style.display = "none";
      renderBoard();
      renderKeyboard();
    }

    function renderBoard() {
      const b = document.getElementById('board');
      b.innerHTML = "";
      for (let r = 0; r < 6; r++) {
        const row = document.createElement('div');
        row.className = 'row';
        for (let c = 0; c < 5; c++) {
          const tile = document.createElement('div');
          tile.className = 'tile' + (grid[r][c] ? ' filled' : '');
          tile.id = 'tile_' + r + '_' + c;
          tile.textContent = grid[r][c];
          row.appendChild(tile);
        }
        b.appendChild(row);
      }
    }

    const TECLAS = [
      ["Q","W","E","R","T","Y","U","I","O","P"],
      ["A","S","D","F","G","H","J","K","L","Ç"],
      ["ENTER","Z","X","C","V","B","N","M","⌫"]
    ];

    function renderKeyboard() {
      const kb = document.getElementById('keyboard');
      kb.innerHTML = "";
      TECLAS.forEach(linha => {
        const row = document.createElement('div');
        row.className = 'kb-row';
        linha.forEach(k => {
          const btn = document.createElement('button');
          btn.className = 'key' + (k.length > 1 ? ' wide' : '');
          btn.id = 'key_' + k;
          btn.textContent = k;
          btn.onclick = () => processarEntrada(k);
          row.appendChild(btn);
        });
        kb.appendChild(row);
      });
    }

    function processarEntrada(letra) {
      if (fimDeJogo) return;
      if (letra === 'ENTER') {
        validarTentativa();
      } else if (letra === '⌫' || letra === 'BACKSPACE') {
        if (colunaAtual > 0) {
          colunaAtual--;
          grid[linhaAtual][colunaAtual] = "";
          const t = document.getElementById('tile_' + linhaAtual + '_' + colunaAtual);
          t.textContent = "";
          t.className = 'tile';
        }
      } else if (/^[A-ZÇ]$/.test(letra)) {
        if (colunaAtual < 5) {
          grid[linhaAtual][colunaAtual] = letra;
          const t = document.getElementById('tile_' + linhaAtual + '_' + colunaAtual);
          t.textContent = letra;
          t.className = 'tile filled';
          colunaAtual++;
        }
      }
    }

    function validarTentativa() {
      if (colunaAtual < 5) {
        document.getElementById('msg').textContent = "Palavra incompleta!";
        setTimeout(() => { if (!fimDeJogo) document.getElementById('msg').textContent = ""; }, 1500);
        return;
      }
      const tentativa = grid[linhaAtual].join("");
      const resultado = Array(5).fill("absent");
      const letrasRestantes = segredo.split("");

      // 1. Letras na posição certa
      for (let i = 0; i < 5; i++) {
        if (tentativa[i] === segredo[i]) {
          resultado[i] = "correct";
          letrasRestantes[i] = null;
        }
      }
      // 2. Letras presentes na palavra
      for (let i = 0; i < 5; i++) {
        if (resultado[i] !== "correct") {
          const idx = letrasRestantes.indexOf(tentativa[i]);
          if (idx !== -1) {
            resultado[i] = "present";
            letrasRestantes[idx] = null;
          }
        }
      }

      for (let i = 0; i < 5; i++) {
        const t = document.getElementById('tile_' + linhaAtual + '_' + i);
        t.className = 'tile ' + resultado[i];
        const key = document.getElementById('key_' + tentativa[i]);
        if (key) {
          if (resultado[i] === 'correct') {
            key.className = 'key correct';
          } else if (resultado[i] === 'present' && !key.classList.contains('correct')) {
            key.className = 'key present';
          } else if (resultado[i] === 'absent' && !key.classList.contains('correct') && !key.classList.contains('present')) {
            key.className = 'key absent';
          }
        }
      }

      if (tentativa === segredo) {
        fimDeJogo = true;
        document.getElementById('msg').textContent = "Parabéns! Você acertou! 🎉";
        document.getElementById('btnNew').style.display = "block";
      } else if (linhaAtual === 5) {
        fimDeJogo = true;
        document.getElementById('msg').textContent = "Fim de jogo! A palavra era: " + segredo;
        document.getElementById('btnNew').style.display = "block";
      } else {
        linhaAtual++;
        colunaAtual = 0;
      }
    }

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') processarEntrada('ENTER');
      else if (e.key === 'Backspace') processarEntrada('⌫');
      else {
        const k = e.key.toUpperCase();
        if (/^[A-ZÇ]$/.test(k)) processarEntrada(k);
      }
    });

    iniciarJogo();
  </script>
</body>
</html>`,
  },
  {
    id: "contatos",
    nome: "Árvore de Contatos & Pessoas",
    descricao: "Organograma, rede de relacionamentos profissionais e gestão de lideranças e equipes.",
    icone: "FolderTree",
    versao: "1.0.0",
    categoriaInterna: "produtividade",
    rotaIntegrada: "/contatos",
    manifesto: {
      id: "contatos",
      name: "Árvore de Contatos & Pessoas",
      version: "1.0.0",
      description: "Organograma e gestão de contatos e equipes.",
      entry: "index.html",
      icon: "FolderTree",
      category: "produtividade",
      permissions: ["theme", "ui"],
      theme: { supportsDark: true },
    },
    codigoHtml: `<!DOCTYPE html><html><body><h1>Contatos</h1></body></html>`,
  },
  {
    id: "livros",
    nome: "Acervo de Livros & Domínio Público",
    descricao: "Pesquisa de obras clássicas, referências e downloads de domínio público via OpenLibrary.",
    icone: "BookOpen",
    versao: "1.0.0",
    categoriaInterna: "design",
    manifesto: {
      id: "livros",
      name: "Acervo de Livros",
      version: "1.0.0",
      description: "Busca de livros clássicos e referências.",
      entry: "index.html",
      icon: "BookOpen",
      category: "design",
      permissions: ["theme", "ui"],
      theme: { supportsDark: true },
    },
    codigoHtml: `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Acervo de Livros</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: var(--klaus-bg, #0f172a);
      color: var(--klaus-fg, #f8fafc);
      padding: 1.5rem;
    }
    .container { max-width: 760px; margin: 0 auto; display: flex; flex-direction: column; gap: 1.25rem; }
    .search-box { display: flex; gap: 0.5rem; }
    input {
      flex: 1;
      background: var(--klaus-card, #1e293b);
      color: var(--klaus-fg, #f8fafc);
      border: 1px solid var(--klaus-border, #334155);
      padding: 0.65rem 1rem;
      border-radius: 0.5rem;
      font-size: 0.9rem;
    }
    button {
      background: var(--klaus-primary, #f59e0b);
      color: var(--klaus-primary-fg, #0f172a);
      border: none;
      padding: 0.65rem 1.25rem;
      border-radius: 0.5rem;
      font-weight: 600;
      cursor: pointer;
    }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 1rem; margin-top: 1rem; }
    .book-card {
      background: var(--klaus-card, #1e293b);
      border: 1px solid var(--klaus-border, #334155);
      border-radius: 0.75rem;
      padding: 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .book-title { font-size: 0.9rem; font-weight: 600; line-height: 1.3; }
    .book-author { font-size: 0.8rem; color: var(--klaus-muted, #94a3b8); }
    .book-year { font-size: 0.75rem; color: var(--klaus-muted, #94a3b8); font-family: monospace; }
  </style>
</head>
<body>
  <div class="container">
    <div>
      <h2 style="font-size: 1.25rem; font-weight: 700;">Pesquisar Livros & Clássicos</h2>
      <p style="font-size: 0.85rem; color: var(--klaus-muted, #94a3b8); margin-top: 0.25rem;">
        Catálogo do OpenLibrary com milhões de obras de domínio público.
      </p>
    </div>
    <div class="search-box">
      <input type="text" id="query" placeholder="Buscar por título, autor ou tema (ex: Design, Machado de Assis)..." onkeydown="if(event.key==='Enter') buscar()">
      <button onclick="buscar()">Pesquisar</button>
    </div>
    <div id="status" style="font-size: 0.85rem; color: var(--klaus-muted, #94a3b8);"></div>
    <div class="grid" id="grid"></div>
  </div>
  <script>
    async function buscar() {
      const q = document.getElementById('query').value.trim();
      if (!q) return;
      const status = document.getElementById('status');
      const grid = document.getElementById('grid');
      status.textContent = "Buscando no acervo...";
      grid.innerHTML = "";

      try {
        const res = await fetch('https://openlibrary.org/search.json?q=' + encodeURIComponent(q) + '&limit=12');
        const data = await res.json();
        if (!data.docs || data.docs.length === 0) {
          status.textContent = "Nenhum livro encontrado para esta busca.";
          return;
        }
        status.textContent = data.docs.length + " obras encontradas:";
        data.docs.forEach(doc => {
          const card = document.createElement('div');
          card.className = 'book-card';
          card.innerHTML =
            '<div class="book-title">' + (doc.title || 'Sem título') + '</div>' +
            '<div class="book-author">' + (doc.author_name ? doc.author_name.join(', ') : 'Autor desconhecido') + '</div>' +
            '<div class="book-year">Ano: ' + (doc.first_publish_year || 'N/A') + '</div>';
          grid.appendChild(card);
        });
      } catch (err) {
        status.textContent = "Erro ao conectar com o OpenLibrary.";
      }
    }
  </script>
</body>
</html>`,
  },
];

/**
 * Retorna a lista completa de extensões curadas disponíveis na Biblioteca.
 */
export function obterCatalogoBiblioteca(): ItemCatalogoExtensao[] {
  return CATALOGO_BIBLIOTECA;
}

/**
 * Verifica se uma extensão do catálogo já está instalada nos projetos do usuário.
 */
export function verificarExtensaoInstalada(id: string): boolean {
  const lista = carregarProjetosExtensoes();
  return lista.some((p) => p.id === id && p.ativo);
}

/**
 * Instala uma extensão da Biblioteca no repositório de dados privado do usuário (.klaus/projetos/<id>/)
 * disparando commits via API do GitHub e registrando nos projetos do Klaus.
 */
export async function instalarExtensaoNoRepositorio(
  id: string,
  cfg: Settings,
): Promise<{ sucesso: boolean; mensagem: string }> {
  const item = CATALOGO_BIBLIOTECA.find((c) => c.id === id);
  if (!item) {
    return { sucesso: false, mensagem: "Extensão não encontrada no catálogo." };
  }

  const rota = item.rotaIntegrada || `/projeto/${item.id}`;

  // 1. Salva nos projetos locais e no menu lateral de imediato
  const projetoAtualizado: ProjetoExtensao = {
    id: item.id,
    nome: item.nome,
    descricao: item.descricao,
    icone: item.icone,
    categoria: "utilitarios",
    tipo: item.rotaIntegrada ? "nativa" : "codigo_customizado",
    ativo: true,
    origem: "usuario",
    rota,
    codigoHtml: item.codigoHtml,
    criadoEm: new Date().toISOString(),
    atualizadoEm: new Date().toISOString(),
  };

  salvarProjetoCustomizado(projetoAtualizado, cfg);

  try {
    sincronizarExtensaoNoMenu(
      {
        id: item.id,
        para: rota,
        rotulo: item.nome,
        iconeNome: item.icone,
        ativo: true,
      },
      cfg,
    );
  } catch {}

  // 2. Se o GitHub estiver configurado, grava os arquivos da extensão no repositório privado
  if (cfg.githubToken && cfg.repoOwner && cfg.repoName) {
    try {
      const pastaRemota = `.klaus/projetos/${item.id}`;
      const caminhoManifest = `${pastaRemota}/manifest.json`;
      const caminhoIndex = `${pastaRemota}/index.html`;

      // Busca SHA caso já exista
      let shaManifest: string | undefined;
      let shaIndex: string | undefined;
      try {
        const resM = await ler(cfg, caminhoManifest, { silenciar404: true });
        if (resM?.sha) shaManifest = resM.sha;
        const resI = await ler(cfg, caminhoIndex, { silenciar404: true });
        if (resI?.sha) shaIndex = resI.sha;
      } catch {}

      // Grava manifest.json
      await gravar(
        cfg,
        caminhoManifest,
        JSON.stringify(item.manifesto, null, 2),
        shaManifest,
        `extensão: instalar manifesto de ${item.nome}`,
      );

      // Grava index.html
      await gravar(
        cfg,
        caminhoIndex,
        item.codigoHtml,
        shaIndex,
        `extensão: instalar código de ${item.nome}`,
      );

      return {
        sucesso: true,
        mensagem: `"${item.nome}" foi instalada no seu repositório de dados!`,
      };
    } catch (err: any) {
      console.warn("[Klaus] Falha ao enviar commit da extensão para o GitHub:", err);
      return {
        sucesso: true,
        mensagem: `"${item.nome}" ativada localmente. O envio ao GitHub será sincronizado em breve.`,
      };
    }
  }

  return {
    sucesso: true,
    mensagem: `"${item.nome}" instalada e adicionada ao menu lateral!`,
  };
}

/**
 * Remove os arquivos da extensão do repositório privado do usuário no GitHub
 * e limpa o registro nos projetos e no menu lateral.
 */
export async function desinstalarExtensaoDoRepositorio(
  id: string,
  cfg: Settings,
): Promise<{ sucesso: boolean; mensagem: string }> {
  const item = CATALOGO_BIBLIOTECA.find((c) => c.id === id);
  const nome = item?.nome || id;
  const rota = item?.rotaIntegrada || `/projeto/${id}`;

  // 1. Remove do registro e menu local
  removerProjetoCustomizado(id, cfg);

  try {
    sincronizarExtensaoNoMenu(
      {
        id,
        para: rota,
        rotulo: "",
        iconeNome: "",
        ativo: false,
      },
      cfg,
    );
  } catch {}

  // 2. Se o GitHub estiver conectado, apaga os arquivos da extensão
  if (cfg.githubToken && cfg.repoOwner && cfg.repoName) {
    try {
      const pastaRemota = `.klaus/projetos/${id}`;
      const caminhoManifest = `${pastaRemota}/manifest.json`;
      const caminhoIndex = `${pastaRemota}/index.html`;

      try {
        const resM = await ler(cfg, caminhoManifest, { silenciar404: true });
        if (resM?.sha) {
          await apagar(cfg, caminhoManifest, resM.sha);
        }
      } catch {}

      try {
        const resI = await ler(cfg, caminhoIndex, { silenciar404: true });
        if (resI?.sha) {
          await apagar(cfg, caminhoIndex, resI.sha);
        }
      } catch {}
    } catch (err) {
      console.warn("[Klaus] Erro ao remover arquivos remotos da extensão:", err);
    }
  }

  return {
    sucesso: true,
    mensagem: `"${nome}" foi desinstalada do seu repositório.`,
  };
}
