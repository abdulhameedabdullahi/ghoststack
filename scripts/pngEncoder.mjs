/**
 * Minimal PNG encoder — no dependencies, pure Node built-ins.
 * Shared by generate-icons.mjs and generate-brand.mjs.
 */
import { deflateSync } from "node:zlib";

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[i] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const t = Buffer.from(type, "ascii");
  const l = Buffer.alloc(4); l.writeUInt32BE(data.length);
  const cr = Buffer.alloc(4); cr.writeUInt32BE(crc32(Buffer.concat([t, data])));
  return Buffer.concat([l, t, data, cr]);
}

const SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function makeIhdr(w, h, colorType) {
  const b = Buffer.alloc(13);
  b.writeUInt32BE(w, 0); b.writeUInt32BE(h, 4);
  b[8] = 8; b[9] = colorType; b[10] = 0; b[11] = 0; b[12] = 0;
  return b;
}

const IEND = chunk("IEND", Buffer.alloc(0));

/**
 * Encode a greyscale PNG.
 * @param {number} w - image width
 * @param {number} h - image height
 * @param {Uint8Array} pixels - w*h grey values (0=black, 255=white)
 */
export function encodeGrey(w, h, pixels) {
  const raw = Buffer.alloc((w + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w + 1)] = 0;
    for (let x = 0; x < w; x++) raw[y * (w + 1) + 1 + x] = pixels[y * w + x];
  }
  return Buffer.concat([SIG, chunk("IHDR", makeIhdr(w, h, 0)), chunk("IDAT", deflateSync(raw, { level: 9 })), IEND]);
}

/**
 * Encode an RGBA PNG.
 * @param {number} w - image width
 * @param {number} h - image height
 * @param {Uint8Array} pixels - w*h*4 bytes (R,G,B,A per pixel)
 */
export function encodeRgba(w, h, pixels) {
  const stride = w * 4;
  const raw = Buffer.alloc((stride + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (stride + 1)] = 0;
    for (let x = 0; x < stride; x++) raw[y * (stride + 1) + 1 + x] = pixels[y * stride + x];
  }
  return Buffer.concat([SIG, chunk("IHDR", makeIhdr(w, h, 6)), chunk("IDAT", deflateSync(raw, { level: 9 })), IEND]);
}
