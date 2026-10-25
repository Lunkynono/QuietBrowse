import path from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';
import { deflateSync } from 'node:zlib';

function crc32(data: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of data) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const name = Buffer.from(type);
  const length = Buffer.alloc(4); length.writeUInt32BE(data.length);
  const checksum = Buffer.alloc(4); checksum.writeUInt32BE(crc32(Buffer.concat([name, data])));
  return Buffer.concat([length, name, data, checksum]);
}

function icon(size: number): Buffer {
  const rows = Buffer.alloc(size * (1 + size * 4));
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const offset = y * (1 + size * 4) + 1 + x * 4;
    const nx = (x + 0.5) / size, ny = (y + 0.5) / size;
    const rounded = Math.max(Math.abs(nx - 0.5), Math.abs(ny - 0.5)) < 0.47;
    const radius = Math.hypot(nx - 0.49, ny - 0.47);
    const ring = radius > 0.20 && radius < 0.29;
    const tail = nx > 0.55 && nx < 0.79 && ny > 0.61 && ny < 0.74 && Math.abs((ny - 0.61) - (nx - 0.55) * 0.52) < 0.055;
    const white = ring || tail;
    rows[offset] = white ? 255 : 8;
    rows[offset + 1] = white ? 255 : 126;
    rows[offset + 2] = white ? 255 : 112;
    rows[offset + 3] = rounded ? 255 : 0;
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0); header.writeUInt32BE(size, 4);
  header[8] = 8; header[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', header), chunk('IDAT', deflateSync(rows)), chunk('IEND', Buffer.alloc(0))]);
}

export async function makeIcons(destination: string): Promise<void> {
  await mkdir(destination, { recursive: true });
  await Promise.all([16, 48, 128].map((size) => writeFile(path.join(destination, `icon-${size}.png`), icon(size))));
}
