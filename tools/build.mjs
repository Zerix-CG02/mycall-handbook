// Encrypts src/handbook.html into docs/index.html, so the public Pages site holds only ciphertext.
// AES-256-GCM, key from the password via PBKDF2-SHA256. Node's built-in Web Crypto, no packages.
// Usage (from the repo root; the password never lands in shell history):
//   read -rs HANDBOOK_PASSWORD && export HANDBOOK_PASSWORD && node tools/build.mjs
import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from "node:fs";
import { webcrypto } from "node:crypto";
import { fileURLToPath } from "node:url";

// Paths below are relative to the repo root, whatever folder the command runs from.
process.chdir(fileURLToPath(new URL("..", import.meta.url)));

const ITERATIONS = 600000;
const { subtle } = webcrypto;
const password = process.env.HANDBOOK_PASSWORD || "";
if (password.length < 12) {
  console.error("HANDBOOK_PASSWORD must be set and at least 12 characters (the ciphertext is public).");
  process.exit(1);
}

const source = readFileSync("src/handbook.html", "utf8");
const body = source.match(/<body>([\s\S]*)<\/body>/)[1].replace(/<script[\s\S]*?<\/script>/g, "");

const salt = webcrypto.getRandomValues(new Uint8Array(16));
const iv = webcrypto.getRandomValues(new Uint8Array(12));
const base = await subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveKey"]);
const key = await subtle.deriveKey(
  { name: "PBKDF2", hash: "SHA-256", salt, iterations: ITERATIONS },
  base, { name: "AES-GCM", length: 256 }, false, ["encrypt"]);
const ct = new Uint8Array(await subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(body)));

const b64 = (u) => Buffer.from(u).toString("base64");
const payload = JSON.stringify({ iter: ITERATIONS, salt: b64(salt), iv: b64(iv), ct: b64(ct) });
const gate = readFileSync("src/gate.html", "utf8").replace("__PAYLOAD__", payload);

mkdirSync("docs/assets", { recursive: true });
writeFileSync("docs/index.html", gate);
for (const f of ["style.css", "app.js"]) copyFileSync(`assets/${f}`, `docs/assets/${f}`);
console.log(`docs/index.html written (${ct.length} bytes encrypted).`);
