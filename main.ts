import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const JPEG_SIGNATURE = [0xff, 0xd8, 0xff];
const REQUIRED_SIZE = 1024;
const MAX_BYTES = 1048576;

interface PngFacts {
  width: number;
  height: number;
  bytes: number;
  signatureOk: boolean;
}

function fail(reason: string): never {
  console.error(`Invalid entry: ${reason}`);
  process.exit(1);
}

function startsWith(buf: Buffer, signature: number[]): boolean {
  if (buf.length < signature.length) return false;
  for (let i = 0; i < signature.length; i++) {
    if (buf[i] !== signature[i]) return false;
  }
  return true;
}

function pngFacts(buf: Buffer): PngFacts {
  const signatureOk = startsWith(buf, PNG_SIGNATURE);
  const hasHeader = buf.length >= 24;
  return {
    width: hasHeader ? buf.readUInt32BE(16) : 0,
    height: hasHeader ? buf.readUInt32BE(20) : 0,
    bytes: buf.length,
    signatureOk,
  };
}

const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
mkdirSync(outputDir, { recursive: true });

const sourcePath = join(import.meta.dirname, "entry.png");
let buf: Buffer;
try {
  buf = readFileSync(sourcePath);
} catch (err) {
  fail(`cannot read ${sourcePath}: ${(err as Error).message}`);
}

const facts = pngFacts(buf);

if (facts.bytes < 1 || facts.bytes > MAX_BYTES) {
  fail(`expected byte length between 1 and ${MAX_BYTES}, got ${facts.bytes}`);
}

if (buf.length < 24) {
  fail(`file too small to hold a PNG header, got ${facts.bytes} bytes`);
}

if (!facts.signatureOk) {
  if (startsWith(buf, JPEG_SIGNATURE)) {
    fail(`image is a JPEG, not a PNG`);
  }
  fail(`first eight bytes are not the PNG signature`);
}

if (facts.width !== REQUIRED_SIZE || facts.height !== REQUIRED_SIZE) {
  fail(
    `expected ${REQUIRED_SIZE}x${REQUIRED_SIZE}, got ${facts.width}x${facts.height}`,
  );
}

const targetPath = join(outputDir, "entry.png");
writeFileSync(targetPath, buf);

const written = readFileSync(targetPath);
if (!written.equals(buf)) {
  fail(`bytes read back from ${targetPath} differ from the source`);
}

console.log(`path: ${targetPath}`);
console.log(`bytes: ${facts.bytes}`);
console.log(`width: ${facts.width}`);
console.log(`height: ${facts.height}`);
