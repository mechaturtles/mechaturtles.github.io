#!/usr/bin/env node
// Encrypts the Proton booking link behind a numeric unlock code.
// Reads BOOKING_LINK and BOOKING_CODE from the environment and writes ONLY the
// encrypted blob to src/time/booking-link.json. Never prints either value.
import { webcrypto as crypto } from "node:crypto";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

export const PREFIX = "https://calendar.proton.me/";
export const ITERATIONS = 5_000_000;

const b64 = (u8) => Buffer.from(u8).toString("base64");
const unb64 = (s) => new Uint8Array(Buffer.from(s, "base64"));

async function deriveKey(code, salt, iterations, usage) {
  const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(code), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    [usage]
  );
}

export async function encrypt(link, code, iterations = ITERATIONS) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(code, salt, iterations, "encrypt");
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(link)));
  return { v: 1, kdf: "PBKDF2-SHA256", cipher: "AES-256-GCM", iterations, salt: b64(salt), iv: b64(iv), ciphertext: b64(ct) };
}

export async function decrypt(blob, code) {
  const key = await deriveKey(code, unb64(blob.salt), blob.iterations, "decrypt");
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(blob.iv) }, key, unb64(blob.ciphertext));
  return new TextDecoder().decode(pt);
}

async function main() {
  const link = process.env.BOOKING_LINK || "";
  const code = process.env.BOOKING_CODE || "";
  if (!link.startsWith(PREFIX)) throw new Error("BOOKING_LINK must be set and start with " + PREFIX);
  if (!/^\d{4}$/.test(code)) throw new Error("BOOKING_CODE must be set to a 4-digit number");
  const blob = await encrypt(link, code);
  if ((await decrypt(blob, code)) !== link) throw new Error("round-trip check failed");
  const out = join(dirname(fileURLToPath(import.meta.url)), "..", "src", "time", "booking-link.json");
  writeFileSync(out, JSON.stringify(blob, null, 2) + "\n");
  console.log("wrote src/time/booking-link.json (iterations " + ITERATIONS + ")");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((e) => { console.error(e.message); process.exit(1); });
}
