import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from "node:crypto";

function scryptDerive(password: string, salt: Buffer, keylen: number, options: ScryptOptions): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, keylen, options, (err, derivedKey) => {
      if (err) reject(err);
      else resolve(derivedKey);
    });
  });
}

const SCRYPT_KEYLEN = 64;
const SCRYPT_PARAMS: ScryptOptions = { N: 16384, r: 8, p: 1 };

/** Format: scrypt$N$r$p$saltHex$hashHex — self-describing so cost params
 * can change later without breaking verification of older hashes. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const derived = await scryptDerive(password, salt, SCRYPT_KEYLEN, SCRYPT_PARAMS);
  const { N, r, p } = SCRYPT_PARAMS;
  return `scrypt$${N}$${r}$${p}$${salt.toString("hex")}$${derived.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;

  const [, nStr, rStr, pStr, saltHex, hashHex] = parts;
  const N = Number(nStr);
  const r = Number(rStr);
  const p = Number(pStr);
  if (!Number.isFinite(N) || !Number.isFinite(r) || !Number.isFinite(p)) return false;

  const salt = Buffer.from(saltHex, "hex");
  const expected = Buffer.from(hashHex, "hex");

  const derived = await scryptDerive(password, salt, expected.length, { N, r, p });
  if (derived.length !== expected.length) return false;
  return timingSafeEqual(derived, expected);
}

const TEMP_PASSWORD_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";

/** A random, human-typeable temporary password for Admin/import to hand to
 * a new user — the user must change it on first login. */
export function generateTempPassword(length = 14): string {
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) {
    out += TEMP_PASSWORD_ALPHABET[bytes[i] % TEMP_PASSWORD_ALPHABET.length];
  }
  return out;
}
