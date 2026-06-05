const PBKDF2_ITERATIONS = 100_000;
const SALT_LENGTH = 16;
const IV_LENGTH = 12;
const KEY_LENGTH = 256;

function buf2hex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function hex2buf(hex: string): ArrayBuffer {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return bytes.buffer;
}

function str2buf(str: string): ArrayBuffer {
  return new TextEncoder().encode(str).buffer as ArrayBuffer;
}

function buf2str(buf: ArrayBuffer): string {
  return new TextDecoder().decode(buf);
}

async function deriveKey(
  pin: string,
  salt: Uint8Array,
): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    str2buf(pin) as BufferSource,
    "PBKDF2",
    false,
    ["deriveKey"],
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt as BufferSource,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: KEY_LENGTH } as AesDerivedKeyParams,
    false,
    ["encrypt", "decrypt"] as KeyUsage[],
  );
}

export async function encryptApiKey(
  pin: string,
  plaintext: string,
): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const key = await deriveKey(pin, salt);

  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv as BufferSource },
    key,
    str2buf(plaintext) as BufferSource,
  );

  const saltHex = buf2hex(salt.buffer);
  const ivHex = buf2hex(iv.buffer);
  const dataHex = buf2hex(encrypted);

  return `${saltHex}:${ivHex}:${dataHex}`;
}

export async function decryptApiKey(
  pin: string,
  encoded: string,
): Promise<string> {
  const parts = encoded.split(":");
  if (parts.length !== 3) throw new Error("Invalid encrypted format");

  const [saltHex, ivHex, dataHex] = parts;
  const salt = new Uint8Array(hex2buf(saltHex));
  const iv = new Uint8Array(hex2buf(ivHex));
  const data = hex2buf(dataHex);

  const key = await deriveKey(pin, salt);

  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: iv as BufferSource },
    key,
    data as BufferSource,
  );

  return buf2str(decrypted);
}

export function generateStorageSalt(): string {
  return buf2hex(crypto.getRandomValues(new Uint8Array(32)).buffer);
}
