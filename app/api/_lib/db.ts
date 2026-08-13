import { env } from "cloudflare:workers";

export function getD1() {
  if (!env.DB) throw new Error("D1 binding DB is not configured");
  return env.DB;
}

export const now = () => new Date().toISOString();
export const makeId = (prefix: string) => `${prefix}_${crypto.randomUUID()}`;
export const json = (value: unknown, init?: ResponseInit) => Response.json(value, init);
