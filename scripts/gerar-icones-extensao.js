import fs from "fs";
import path from "path";
import zlib from "zlib";

function criarPNG(largura, altura, corPrimaria, corSecundaria) {
  // Cria cabeçalho PNG
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // Chunk IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(largura, 0);
  ihdr.writeUInt32BE(altura, 4);
  ihdr.writeUInt8(8, 8); // 8-bit depth
  ihdr.writeUInt8(6, 9); // RGBA color type
  ihdr.writeUInt8(0, 10); // Compression
  ihdr.writeUInt8(0, 11); // Filter
  ihdr.writeUInt8(0, 12); // Interlace

  const ihdrChunk = criarChunk("IHDR", ihdr);

  // Scanlines com dados RGBA
  const rawData = Buffer.alloc((largura * 4 + 1) * altura);
  let offset = 0;

  const centroX = largura / 2;
  const centroY = altura / 2;
  const raio = Math.min(largura, altura) * 0.45;

  for (let y = 0; y < altura; y++) {
    rawData[offset++] = 0; // Filter type 0 (None)
    for (let x = 0; x < largura; x++) {
      const dist = Math.hypot(x - centroX, y - centroY);
      if (dist <= raio) {
        // Gradiente Indigo -> Roxo -> Rosa
        const t = (x + y) / (largura + altura);
        const r = Math.round(99 + t * (236 - 99));
        const g = Math.round(102 + t * (72 - 102));
        const b = Math.round(241 + t * (153 - 241));
        
        // Borda sutil e ponto central
        const distCentro = Math.hypot(x - centroX, y - centroY);
        if (distCentro < raio * 0.25) {
          rawData[offset++] = 255;
          rawData[offset++] = 255;
          rawData[offset++] = 255;
          rawData[offset++] = 255;
        } else {
          rawData[offset++] = r;
          rawData[offset++] = g;
          rawData[offset++] = b;
          rawData[offset++] = 255;
        }
      } else {
        // Fundo escuro slate com cantos arredondados
        const dx = Math.max(0, Math.abs(x - centroX) - (largura * 0.5 - 4));
        const dy = Math.max(0, Math.abs(y - centroY) - (altura * 0.5 - 4));
        const dCorner = Math.hypot(dx, dy);
        if (dCorner <= 4) {
          rawData[offset++] = 15;
          rawData[offset++] = 23;
          rawData[offset++] = 42;
          rawData[offset++] = 255;
        } else {
          rawData[offset++] = 0;
          rawData[offset++] = 0;
          rawData[offset++] = 0;
          rawData[offset++] = 0;
        }
      }
    }
  }

  const compressed = zlib.deflateSync(rawData);
  const idatChunk = criarChunk("IDAT", compressed);
  const iendChunk = criarChunk("IEND", Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function criarChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);

  const typeBuf = Buffer.from(type, "ascii");
  const crcData = Buffer.concat([typeBuf, data]);
  const crc = crc32(crcData);

  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc, 0);

  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    const byte = buf[i];
    crc ^= byte;
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

const dir = path.resolve("extensao/icons");
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

[16, 32, 48, 128].forEach((size) => {
  const png = criarPNG(size, size);
  fs.writeFileSync(path.join(dir, `icon${size}.png`), png);
  console.log(`Ícone gerado: icon${size}.png`);
});
