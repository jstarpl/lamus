import crypto from "crypto";
import { JWK } from "jose";
import encryptedKeys from "./keys.enc.json";

export type KeyPair = {
  private: JWK;
  public: JWK;
};

const MASTER_ALGORITHM = "aes-256-cbc";
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
const ENCRYPTION_IV = process.env.ENCRYPTION_IV;

export const KEY_ALGORITHM = "PS256";

function decrypt(data: string, keyStr: string, ivStr: string) {
  const iv = Buffer.from(ivStr, "base64");
  const key = Buffer.from(keyStr, "base64");

  const cipher = crypto.createDecipheriv(MASTER_ALGORITHM, key, iv);

  const dataToDecrypt = Buffer.from(data, "base64");

  return JSON.parse(
    Buffer.concat([
      cipher.update(dataToDecrypt as any, "base64"),
      cipher.final(),
    ]).toString("utf-8")
  );
}

let ENC_KEYS: KeyPair;
let SIG_KEYS: KeyPair = decrypt(
  encryptedKeys.sig,
  ENCRYPTION_KEY,
  ENCRYPTION_IV
);

export function getEncKeys() {
  if (ENC_KEYS) return ENC_KEYS;
  ENC_KEYS = decrypt(encryptedKeys.enc, ENCRYPTION_KEY, ENCRYPTION_IV);
  return ENC_KEYS;
}

export function getSigKeys() {
  if (SIG_KEYS) return SIG_KEYS;
  SIG_KEYS = decrypt(encryptedKeys.sig, ENCRYPTION_KEY, ENCRYPTION_IV);
  return SIG_KEYS;
}
