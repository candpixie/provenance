// Generate the extension icons (no design tool, no AI slop — just math).
// A filled diamond in accent on near-black, with a square hole punched out.
import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";

const BG = [13, 13, 15, 255]; // #0d0d0f
const ACCENT = [124, 92, 255, 255]; // indigo-violet
const HOLE = BG;

function px(size, x, y) {
  const cx = (size - 1) / 2;
  const cy = (size - 1) / 2;
  const r = size * 0.42;
  const d = Math.abs(x - cx) + Math.abs(y - cy); // L1 distance => diamond
  const hole = size * 0.13;
  const dh = Math.abs(x - cx) + Math.abs(y - cy);
  if (d <= r && dh > hole) return ACCENT;
  return BG;
}

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return (~c) >>> 0;
}

function chunk(type, data) {
  const t = Buffer.from(type, "ascii");
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
  return Buffer.concat([len, t, data, crc]);
}

function png(size) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  let o = 0;
  for (let y = 0; y < size; y++) {
    raw[o++] = 0; // filter: none
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = px(size, x, y);
      raw[o++] = r; raw[o++] = g; raw[o++] = b; raw[o++] = a;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

mkdirSync(new URL("./icons/", import.meta.url), { recursive: true });
for (const s of [16, 48, 128]) {
  writeFileSync(new URL(`./icons/icon${s}.png`, import.meta.url), png(s));
  console.log(`icons/icon${s}.png`);
}
