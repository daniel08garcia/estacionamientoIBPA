/**
 * Generates minimal valid PNG icons for PWA without external dependencies.
 * Produces: pwa-192x192.png, pwa-512x512.png, apple-touch-icon.png (180x180)
 * into the public/ folder.
 */

const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

// Brand color matching theme_color in manifest: #6366f1 (indigo)
const BG_R = 0x63;
const BG_G = 0x66;
const BG_B = 0xf1;
const FG_R = 0xff;
const FG_G = 0xff;
const FG_B = 0xff;

function crc32(buf) {
  let crc = 0xffffffff;
  const table = buildCrcTable();
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff];
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function buildCrcTable() {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    t[n] = c;
  }
  return t;
}

function chunk(type, data) {
  const typeBytes = Buffer.from(type, "ascii");
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crcInput = Buffer.concat([typeBytes, data]);
  const crcValue = Buffer.alloc(4);
  crcValue.writeUInt32BE(crc32(crcInput), 0);
  return Buffer.concat([len, typeBytes, data, crcValue]);
}

function generatePng(size) {
  // PNG signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(size, 0); // width
  ihdrData.writeUInt32BE(size, 4); // height
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 2; // color type: RGB
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace
  const ihdr = chunk("IHDR", ihdrData);

  // Build raw image data: for each row, filter byte (0) + RGB pixels
  // Draw a rounded "P" letter on indigo background
  const rawRows = [];
  const center = size / 2;
  const radius = size * 0.4;

  for (let y = 0; y < size; y++) {
    const row = Buffer.alloc(1 + size * 3);
    row[0] = 0; // filter type: None
    for (let x = 0; x < size; x++) {
      const dx = x - center;
      const dy = y - center;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // White circle outline/disc
      let r = BG_R;
      let g = BG_G;
      let b = BG_B;

      if (dist <= radius * 0.72) {
        // Inner white disc
        r = FG_R;
        g = FG_G;
        b = FG_B;
      }

      // Draw a simple "P" shape in brand color on the white disc
      const nx = (x - center) / radius;
      const ny = (y - center) / radius;

      // Vertical stem of P
      if (nx >= -0.28 && nx <= -0.08 && ny >= -0.52 && ny <= 0.52) {
        r = BG_R;
        g = BG_G;
        b = BG_B;
      }
      // Horizontal top bar
      if (nx >= -0.28 && nx <= 0.22 && ny >= -0.52 && ny <= -0.32) {
        r = BG_R;
        g = BG_G;
        b = BG_B;
      }
      // Bump of P (semi-circle top right)
      const bumpCx = 0.12;
      const bumpCy = -0.27;
      const bumpR = 0.26;
      const bumpDist = Math.sqrt((nx - bumpCx) ** 2 + (ny - bumpCy) ** 2);
      if (bumpDist <= bumpR && nx >= -0.08) {
        r = BG_R;
        g = BG_G;
        b = BG_B;
      }
      // Hole inside bump
      const holeDist = Math.sqrt((nx - bumpCx) ** 2 + (ny - bumpCy) ** 2);
      if (holeDist <= bumpR * 0.58 && nx >= -0.08) {
        r = FG_R;
        g = FG_G;
        b = FG_B;
      }

      // Clip to circle
      if (dist > radius) {
        r = BG_R;
        g = BG_G;
        b = BG_B;
      }

      const offset = 1 + x * 3;
      row[offset] = r;
      row[offset + 1] = g;
      row[offset + 2] = b;
    }
    rawRows.push(row);
  }

  const rawData = Buffer.concat(rawRows);
  const compressed = zlib.deflateSync(rawData, { level: 9 });
  const idat = chunk("IDAT", compressed);
  const iend = chunk("IEND", Buffer.alloc(0));

  return Buffer.concat([signature, ihdr, idat, iend]);
}

const publicDir = path.join(__dirname, "..", "public");

const icons = [
  { name: "pwa-192x192.png", size: 192 },
  { name: "pwa-512x512.png", size: 512 },
  { name: "apple-touch-icon.png", size: 180 },
];

for (const { name, size } of icons) {
  const filePath = path.join(publicDir, name);
  const png = generatePng(size);
  fs.writeFileSync(filePath, png);
  console.log(`✓ Generated ${name} (${size}x${size})`);
}

console.log(
  "\nDone. Replace these with your real brand icons before production.",
);
