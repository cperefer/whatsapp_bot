import { config } from "./config.js";

// debug() is the per-message chatter (received/processing/replied...) that's
// useful while developing but turns production logs into noise — it's a
// no-op whenever NODE_ENV=production (set in ecosystem.config.cjs).
export const logger = {
  debug(message: string): void {
    if (config.isProduction) return;
    console.log(message);
  },
  info(message: string): void {
    console.log(message);
  },
  warn(message: string): void {
    console.warn(message);
  },
  error(message: string, error?: unknown): void {
    console.error(message, error);
  },
};

// Phone numbers identify a real person and must never end up in production
// logs. In development the full number is left visible since that's useful
// for debugging and never leaves the machine.
export function redactPhone(phone: string): string {
  if (!config.isProduction) return phone;
  return phone.length > 4 ? `***${phone.slice(-4)}` : "***";
}
