const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const BG_R = 0x63,
  BG_G = 0x66,
  BG_B = 0xf1;
const FG_R = 0xff,
  FG_G = 0xff,
  FG_B = 0xff;

function crc32(buf) {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++)
    crc = (crc >>> 8) ^ t[(crc ^ buf[i]) & 0xff];
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const tb = Buffer.from(type, "ascii");
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const cv = Buffer.alloc(4);
  cv.writeUInt32BE(crc32(Buffer.concat([tb, data])), 0);
  return Buffer.concat([len, tb, data, cv]);
}

function generatePng(size) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ih = Buffer.alloc(13);
  ih.writeUInt32BE(size, 0);
  ih.writeUInt32BE(size, 4);
  ih[8] = 8;
  ih[9] = 2;
  const ihdr = chunk("IHDR", ih);

  const center = size / 2,
    radius = size * 0.4;
  const rows = [];
  for (let y = 0; y < size; y++) {
    const row = Buffer.alloc(1 + size * 3);
    row[0] = 0;
    for (let x = 0; x < size; x++) {
      const dx = x - center,
        dy = y - center;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const nx = dx / radius,
        ny = dy / radius;
      let r = BG_R,
        g = BG_G,
        b = BG_B;

      if (dist <= radius * 0.72) {
        r = FG_R;
        g = FG_G;
        b = FG_B;
      }

      // P stem
      if (nx >= -0.28 && nx <= -0.08 && ny >= -0.52 && ny <= 0.52) {
        r = BG_R;
        g = BG_G;
        b = BG_B;
      }
      // P top bar
      if (nx >= -0.28 && nx <= 0.22 && ny >= -0.52 && ny <= -0.32) {
        r = BG_R;
        g = BG_G;
        b = BG_B;
      }
      // P bump
      const bumpDist = Math.sqrt((nx - 0.12) ** 2 + (ny + 0.27) ** 2);
      if (bumpDist <= 0.26 && nx >= -0.08) {
        r = BG_R;
        g = BG_G;
        b = BG_B;
      }
      if (bumpDist <= 0.15 && nx >= -0.08) {
        r = FG_R;
        g = FG_G;
        b = FG_B;
      }

      if (dist > radius) {
        r = BG_R;
        g = BG_G;
        b = BG_B;
      }

      const o = 1 + x * 3;
      row[o] = r;
      row[o + 1] = g;
      row[o + 2] = b;
    }
    rows.push(row);
  }

  const compressed = zlib.deflateSync(Buffer.concat(rows), { level: 9 });
  return Buffer.concat([
    sig,
    ihdr,
    chunk("IDAT", compressed),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const publicDir = path.join(__dirname, "..", "public");
for (const [name, size] of [
  ["pwa-192x192.png", 192],
  ["pwa-512x512.png", 512],
  ["apple-touch-icon.png", 180],
]) {
  fs.writeFileSync(path.join(publicDir, name), generatePng(size));
  console.log(`✓ ${name} (${size}x${size})`);
}
console.log("\nReplace with real brand icons before production.");
