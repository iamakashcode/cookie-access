import bcrypt from "bcryptjs";

// bcryptjs is pure-JS: no native build step, which keeps deploys on a modest
// VPS painless. 10 rounds is a sensible default for an admin login.
const ROUNDS = 10;

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, ROUNDS);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
