import { createHash, randomBytes, scryptSync, timingSafeEqual } from "crypto";

export function hashBoardPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyBoardPassword(password: string, storedHash: string): boolean {
  const [salt, hash] = storedHash.split(":");

  if (!salt || !hash) {
    return false;
  }

  const hashToVerify = scryptSync(password, salt, 64).toString("hex");

  try {
    return timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(hashToVerify, "hex"));
  } catch {
    return false;
  }
}

export function isHashedBoardPassword(value: string): boolean {
  return /^[a-f0-9]{32}:[a-f0-9]{128}$/i.test(value);
}

export function legacyBoardPasswordHash(password: string): string {
  return createHash("sha256").update(password).digest("hex");
}
